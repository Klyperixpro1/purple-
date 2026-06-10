from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from api.database import supabase_admin
from api.auth import get_admin_user
from api.config import settings
import asyncio
import cloudinary
import cloudinary.uploader
import re

router = APIRouter(prefix="/media", tags=["Media"])

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET
)

# ── Helpers ───────────────────────────────────────────────────────────────────

def extract_public_id(url: str) -> str:
    try:
        if "/upload/" in url:
            parts = url.split("/upload/")[1].split("/")
            if re.match(r"^v\d+$", parts[0]):
                parts = parts[1:]
            return "/".join(parts).rsplit(".", 1)[0]
    except Exception:
        pass
    return ""


def _cloudinary_upload_video(file_obj, folder: str) -> dict:
    """Blocking Cloudinary video upload — run in thread pool only."""
    return cloudinary.uploader.upload_large(
        file_obj,
        resource_type="video",
        folder=folder,
        eager=[{"width": 640, "height": 360, "crop": "fill", "format": "jpg"}],
        eager_async=False,
    )


def _cloudinary_upload_image(file_obj, folder: str) -> dict:
    """Blocking Cloudinary image upload — run in thread pool only."""
    return cloudinary.uploader.upload(file_obj, resource_type="image", folder=folder)


def _cloudinary_upload_raw(file_obj, folder: str) -> dict:
    return cloudinary.uploader.upload(file_obj, resource_type="raw", folder=folder)


async def _do_cloudinary_upload(file: UploadFile, folder: str = "klyperix/portfolio"):
    """
    Async-safe: runs the blocking Cloudinary call in a thread pool.
    Passes the underlying synchronous file object to avoid loading 
    large files entirely into memory or causing OSError.
    Returns (upload_result, is_video, is_image, content_type).
    """
    content_type = file.content_type or ""
    is_video = content_type.startswith("video/")
    is_image = content_type.startswith("image/")

    if is_video:
        result = await asyncio.to_thread(_cloudinary_upload_video, file.file, folder)
    elif is_image:
        result = await asyncio.to_thread(_cloudinary_upload_image, file.file, folder)
    else:
        result = await asyncio.to_thread(_cloudinary_upload_raw, file.file, folder)

    return result, is_video, is_image, content_type


def _derive_thumbnail(upload_result: dict, is_video: bool) -> Optional[str]:
    """Extract or construct the best thumbnail URL from a Cloudinary result."""
    if not is_video:
        return None
    eager = upload_result.get("eager", [])
    if eager and eager[0].get("secure_url"):
        return eager[0]["secure_url"]
    public_id = upload_result.get("public_id", "")
    if public_id:
        return (
            f"https://res.cloudinary.com/{settings.CLOUDINARY_CLOUD_NAME}"
            f"/video/upload/w_640,h_360,c_fill,so_1.5,f_jpg/{public_id}.jpg"
        )
    return None


async def _get_uploader_id(admin_user) -> Optional[str]:
    """Return admin_user.id only if it exists in the users table."""
    try:
        uid = getattr(admin_user, "id", None)
        if uid and uid != "00000000-0000-0000-0000-000000000000":
            row = await asyncio.to_thread(
                lambda: supabase_admin.table("users").select("id").eq("id", uid).execute()
            )
            if row.data:
                return uid
    except Exception:
        pass
    return None


async def _insert_media_record(
    filename: str, secure_url: str, content_type: str, size_bytes: int, uploader_id: Optional[str]
) -> dict:
    data = {
        "filename": filename,
        "file_path": secure_url,
        "file_type": content_type,
        "size_bytes": size_bytes,
        "uploaded_by": uploader_id,
    }
    res = await asyncio.to_thread(
        lambda: supabase_admin.table("media").insert(data).execute()
    )
    if not res.data:
        raise Exception("Failed to insert media record into database")
    return res.data[0]


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("")
async def get_media_files(admin_user=Depends(get_admin_user)):
    try:
        res = await asyncio.to_thread(
            lambda: supabase_admin.table("media")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    admin_user=Depends(get_admin_user),
):
    """Upload a single file to Cloudinary and save a media library record."""
    try:
        upload_result, is_video, is_image, content_type = await _do_cloudinary_upload(file)

        secure_url = upload_result.get("secure_url")
        if not secure_url:
            raise Exception("Cloudinary returned no URL")

        thumbnail_url = _derive_thumbnail(upload_result, is_video)
        uploader_id = await _get_uploader_id(admin_user)

        record = await _insert_media_record(
            file.filename or "unnamed",
            secure_url,
            content_type,
            upload_result.get("bytes", 0),
            uploader_id,
        )
        record["public_url"] = secure_url
        record["thumbnail_url"] = thumbnail_url
        return record

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/upload-and-publish")
async def upload_and_publish(
    file: UploadFile = File(...),
    category_slug: str = Form(...),
    aspect_ratio: str = Form("16:9"),
    title: str = Form(""),
    description: str = Form(""),
    admin_user=Depends(get_admin_user),
):
    """
    Single-step endpoint: uploads file to Cloudinary, saves to media table,
    and creates an ACTIVE content item — ready to show on the main site.
    """
    VALID_SLUGS = {"short-form", "long-form", "thumbnail", "graphic-design", "hero-video"}
    if category_slug not in VALID_SLUGS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category_slug. Valid values: {sorted(VALID_SLUGS)}",
        )

    try:
        upload_result, is_video, is_image, content_type = await _do_cloudinary_upload(file)

        secure_url = upload_result.get("secure_url")
        if not secure_url:
            raise Exception("Cloudinary returned no URL")

        thumbnail_url = _derive_thumbnail(upload_result, is_video)
        uploader_id = await _get_uploader_id(admin_user)

        # Save to media library
        await _insert_media_record(
            file.filename or "unnamed",
            secure_url,
            content_type,
            upload_result.get("bytes", 0),
            uploader_id,
        )

        # Auto-compute order_index (append to end of this category)
        try:
            existing = await asyncio.to_thread(
                lambda: supabase_admin.table("content")
                .select("order_index")
                .eq("category_slug", category_slug)
                .order("order_index", desc=True)
                .limit(1)
                .execute()
            )
            auto_order = (existing.data[0]["order_index"] + 1) if existing.data else 0
        except Exception:
            auto_order = 0

        display_title = (
            title.strip()
            or (file.filename.rsplit(".", 1)[0] if file.filename else "Untitled")
        )

        content_data = {
            "category_slug": category_slug,
            "title": display_title,
            "description": description.strip(),
            "media_url": secure_url,
            "thumbnail_url": thumbnail_url,
            "metadata": {"aspect_ratio": aspect_ratio},
            "status": "active",  # Active by default — immediately visible on main site
            "is_featured": False,
            "order_index": auto_order,
        }

        content_res = await asyncio.to_thread(
            lambda: supabase_admin.table("content").insert(content_data).execute()
        )
        if not content_res.data:
            raise Exception("Content item insert failed")

        result = content_res.data[0]
        result["thumbnail_url"] = thumbnail_url
        result["public_url"] = secure_url
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload and publish failed: {str(e)}")


@router.delete("/{media_id}")
async def delete_media(media_id: str, admin_user=Depends(get_admin_user)):
    try:
        res = await asyncio.to_thread(
            lambda: supabase_admin.table("media").select("*").eq("id", media_id).execute()
        )
        if not res.data:
            return {"success": True, "message": "Already deleted"}

        media_file = res.data[0]
        file_path = media_file["file_path"]

        if file_path.startswith("http"):
            public_id = extract_public_id(file_path)
            if public_id:
                res_type = (
                    "video"
                    if media_file.get("file_type", "").startswith("video/")
                    else "image"
                )
                await asyncio.to_thread(
                    lambda: cloudinary.uploader.destroy(public_id, resource_type=res_type)
                )
        else:
            await asyncio.to_thread(
                lambda: supabase_admin.storage.from_("media").remove([file_path])
            )

        await asyncio.to_thread(
            lambda: supabase_admin.table("media").delete().eq("id", media_id).execute()
        )
        if file_path:
            await asyncio.to_thread(
                lambda: supabase_admin.table("content").delete().eq("media_url", file_path).execute()
            )
        return {"success": True, "message": "Media deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
