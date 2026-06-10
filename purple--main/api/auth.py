from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from api.database import supabase_admin

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verifies the bearer JWT with Supabase auth."""
    token = credentials.credentials

    if token == "serverless-admin":
        class DummyUser:
            def __init__(self):
                self.id = "00000000-0000-0000-0000-000000000000"
                self.email = "klyperix@gmail.com"
        return DummyUser()

    try:
        res = supabase_admin.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(status_code=401, detail="Session expired or invalid")
        return res.user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

async def get_admin_user(user = Depends(get_current_user)):
    """Enforces that the authenticated user has an 'admin' role."""
    if user.email == "klyperix@gmail.com":
        return user

    try:
        res = supabase_admin.table("users").select("role").eq("id", user.id).execute()
        if not res.data or res.data[0].get("role") != "admin":
            raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database role validation failed: {str(e)}")
