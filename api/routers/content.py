from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from api.database import supabase_admin
from api.auth import get_admin_user

router = APIRouter(prefix="/content", tags=["Content"])

class ContentBase(BaseModel):
    category_slug: str
    title: str
    description: Optional[str] = None
    media_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    status: str = "active"
    is_featured: bool = False
    order_index: int = 0

class ContentCreate(ContentBase):
    pass

class ContentUpdate(BaseModel):
    category_slug: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    media_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    order_index: Optional[int] = None

VALID_CATEGORY_SLUGS = {
    'short-form', 'long-form', 'thumbnail', 'graphic-design',
    'hero-video', 'testimonial', 'contact_submission', 'all', 'portfolio', 'draft', ''
}

@router.get("")
async def get_contents(category: Optional[str] = None, status: Optional[str] = None, limit: int = Query(20), offset: int = Query(0), is_admin: bool = False):
    if category and category not in VALID_CATEGORY_SLUGS:
        raise HTTPException(status_code=400, detail="Invalid category_slug value")
    query = supabase_admin.table("content").select("*")
    if category: query = query.eq("category_slug", category)
    if status: query = query.eq("status", status)
    elif not is_admin: query = query.eq("status", "active")
    if is_admin:
        res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    else:
        res = query.order("order_index", desc=False).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return res.data

@router.get("/{content_id}")
def get_content_item(content_id: str):
    res = supabase_admin.table("content").select("*").eq("id", content_id).execute()
    if not res.data: raise HTTPException(404, "Not found")
    return res.data[0]

@router.post("")
def create_content(item: ContentCreate, admin_user = Depends(get_admin_user)):
    res = supabase_admin.table("content").insert(item.model_dump()).execute()
    if not res.data: raise HTTPException(400, "Failed to create")
    return res.data[0]

@router.post("/public/submit-feedback")
def public_submit_feedback(item: ContentCreate):
    if item.category_slug != "testimonial": raise HTTPException(400, "Only testimonials")
    data = item.model_dump()
    
    if data.get("media_url") and data["media_url"].startswith("data:image"):
        try:
            import cloudinary.uploader
            upload_result = cloudinary.uploader.upload(
                data["media_url"],
                folder="klyperix/testimonials",
                resource_type="image"
            )
            data["media_url"] = upload_result.get("secure_url")
        except Exception as e:
            print("Failed to upload base64 logo:", str(e))
            data["media_url"] = None

    data["status"] = "pending_review"
    data["is_featured"] = False
    res = supabase_admin.table("content").insert(data).execute()
    return {"success": True, "message": "Testimonial submitted successfully", "data": res.data[0]}

@router.post("/public/contact")
def public_submit_contact(item: ContentCreate):
    if item.category_slug != "contact_submission": raise HTTPException(400, "Invalid category")
    data = item.model_dump()
    data["status"] = "pending"
    data["is_featured"] = False
    res = supabase_admin.table("content").insert(data).execute()
    return {"success": True, "message": "Contact form submitted successfully", "data": res.data[0]}

@router.patch("/{content_id}/status")
def toggle_content_status(content_id: str, admin_user = Depends(get_admin_user)):
    """Toggle between active (published, visible on site) and draft (hidden)."""
    res = supabase_admin.table("content").select("status").eq("id", content_id).execute()
    if not res.data:
        raise HTTPException(404, "Not found")
    current = res.data[0]["status"]
    new_status = "draft" if current == "active" else "active"
    upd = supabase_admin.table("content").update({"status": new_status}).eq("id", content_id).execute()
    return {"id": content_id, "status": new_status}

@router.put("/{content_id}")
def update_content(content_id: str, item: ContentUpdate, admin_user = Depends(get_admin_user)):
    update_data = {k: v for k, v in item.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = supabase_admin.table("content").update(update_data).eq("id", content_id).execute()
    if not res.data: raise HTTPException(404, "Not found")
    return res.data[0]

@router.delete("/{content_id}")
def delete_content(content_id: str, admin_user = Depends(get_admin_user)):
    res = supabase_admin.table("content").select("*").eq("id", content_id).execute()
    if not res.data: return {"success": True, "message": "Already deleted"}
    item = res.data[0]
    media_url = item.get("media_url")
    if media_url and media_url.startswith("http"):
        try:
            from api.routers.media import extract_public_id
            import cloudinary.uploader
            public_id = extract_public_id(media_url)
            if public_id:
                res_type = "video" if ".mp4" in media_url.lower() or ".webm" in media_url.lower() else "image"
                cloudinary.uploader.destroy(public_id, resource_type=res_type)
        except Exception as e:
            pass
    # Delete from both content and media tables to stay in sync perfectly
    if media_url:
        supabase_admin.table("media").delete().eq("file_path", media_url).execute()
    res = supabase_admin.table("content").delete().eq("id", content_id).execute()
    return {"success": True}
