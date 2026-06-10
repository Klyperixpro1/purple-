from fastapi import APIRouter, Request, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import hashlib
from datetime import datetime, timedelta
from api.database import supabase_admin
from api.config import settings
import cloudinary
import cloudinary.api

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

class EventData(BaseModel):
    event_type: str
    page_path: Optional[str] = None
    metadata: Optional[dict] = {}

def get_ip_hash(ip: str) -> str:
    if not ip:
        return None
    return hashlib.sha256(ip.encode()).hexdigest()[:16]

@router.post("/event")
def log_event(data: EventData, request: Request):
    try:
        ip = request.client.host if request.client else None
        ip_hash = get_ip_hash(ip)
        
        supabase_admin.table("analytics").insert({
            "event_type": data.event_type,
            "page_path": data.page_path,
            "metadata": data.metadata,
            "ip_hash": ip_hash
        }).execute()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("")
async def get_analytics():
    # Gather analytics
    views = supabase_admin.table("analytics").select("id", count="exact").eq("event_type", "page_view").execute()
    clicks = supabase_admin.table("analytics").select("id", count="exact").eq("event_type", "click").execute()
    items = supabase_admin.table("content").select("id", count="exact").eq("status", "active").execute()
    
    views_count = views.count if hasattr(views, 'count') else 0
    clicks_count = clicks.count if hasattr(clicks, 'count') else 0
    items_count = items.count if hasattr(items, 'count') else 0
    
    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    recent_views = supabase_admin.table("analytics").select("ip_hash").eq("event_type", "page_view").gte("created_at", seven_days_ago).execute()
    recent_views_data = recent_views.data if hasattr(recent_views, 'data') else []
    views_count_7d = len(recent_views_data)
    unique_visitors_7d = len(set(v['ip_hash'] for v in recent_views_data if v.get('ip_hash')))
    
    # Bug reports
    bug_reports = supabase_admin.table("analytics").select("*").eq("event_type", "bug_report").order("created_at", desc=True).limit(50).execute()
    
    # Testimonials
    active_testimonials = supabase_admin.table("content").select("id", count="exact").eq("category_slug", "testimonial").eq("status", "active").execute()
    pending_testimonials = supabase_admin.table("content").select("id", count="exact").eq("category_slug", "testimonial").eq("status", "pending").execute()
    
    # Media Usage (sum of sizes if possible, else count)
    media_stats = supabase_admin.table("media").select("size_bytes").execute()
    total_size_bytes = sum(item.get('size_bytes') or 0 for item in (media_stats.data if hasattr(media_stats, 'data') else []))
    media_count = len(media_stats.data) if hasattr(media_stats, 'data') else 0
    
    # Cloudinary Usage
    cloudinary_bandwidth = 0
    cloudinary_storage = 0
    try:
        c_usage = cloudinary.api.usage()
        cloudinary_bandwidth = c_usage.get('bandwidth', {}).get('usage', 0)
        cloudinary_storage = c_usage.get('storage', {}).get('usage', 0)
    except Exception as e:
        print("Error fetching Cloudinary usage:", e)
        
    return {
        "portfolio_count": items_count,
        "views_count": views_count,
        "views_count_7d": views_count_7d,
        "unique_visitors_7d": unique_visitors_7d,
        "clicks_count": clicks_count,
        "testimonials": {
            "active": active_testimonials.count if hasattr(active_testimonials, 'count') else 0,
            "pending": pending_testimonials.count if hasattr(pending_testimonials, 'count') else 0
        },
        "media": {
            "count": media_count,
            "total_size_bytes": total_size_bytes
        },
        "usage": {
            "cloudinary_bandwidth": cloudinary_bandwidth,
            "cloudinary_storage": cloudinary_storage,
            "supabase_tracked_storage": total_size_bytes
        },
        "bug_reports": bug_reports.data if hasattr(bug_reports, 'data') else []
    }
