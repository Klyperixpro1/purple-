from fastapi import APIRouter
from api.database import supabase_admin

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("")
def get_settings():
    res = supabase_admin.table("settings").select("*").execute()
    return res.data

@router.put("")
def update_setting(item: dict):
    res = supabase_admin.table("settings").upsert({"key_name": item["key_name"], "value": item["value"]}).execute()
    return res.data
