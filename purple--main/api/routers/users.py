from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from api.database import supabase_admin
from api.auth import get_admin_user, get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

class RoleUpdate(BaseModel):
    role: str

@router.get("/me")
def get_my_profile(current_user = Depends(get_current_user)):
    """Returns the authenticated user's profile and database role."""
    try:
        if current_user.email == "klyperix@gmail.com":
            role = "admin"
        else:
            res = supabase_admin.table("users").select("*").eq("id", current_user.id).execute()
            role = "user"
            if res.data:
                role = res.data[0].get("role", "user")
        return {
            "id": current_user.id,
            "email": current_user.email,
            "role": role,
            "created_at": current_user.created_at
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
def list_users(admin_user = Depends(get_admin_user)):
    """Lists all registered users (Admin only)."""
    try:
        res = supabase_admin.table("users").select("*").order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{user_id}/role")
def update_user_role(user_id: str, data: RoleUpdate, admin_user = Depends(get_admin_user)):
    """Updates a user's access role (Admin only)."""
    if data.role not in ["admin", "editor", "user"]:
        raise HTTPException(status_code=400, detail="Invalid role value. Must be admin, editor, or user.")
        
    try:
        # Prevent self-demotion
        if str(user_id) == str(admin_user.id):
            raise HTTPException(status_code=400, detail="Self-demotion is not allowed to prevent locking out.")
            
        res = supabase_admin.table("users").update({"role": data.role}).eq("id", user_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="User profile not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
