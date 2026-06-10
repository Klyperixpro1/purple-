import re

# Monkeypatch re.match to support new Supabase key format (opaque sb_* keys instead of JWTs)
# in older versions of supabase-py SDK.
_original_match = re.match
def _patched_match(pattern, string, flags=0):
    if pattern == r"^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$":
        if isinstance(string, str) and (
            string.startswith("sb_publishable_") or 
            string.startswith("sb_secret_") or
            string.startswith("eyJ")  # JWT access tokens
        ):
            return _original_match("a", "a")
    return _original_match(pattern, string, flags)
re.match = _patched_match

from supabase import create_client, Client
from api.config import settings

# ----------------------------------------------------

class SupabaseClientProxy:
    def __init__(self, is_admin: bool):
        self.is_admin = is_admin
        self._client = None

    def _init_client(self) -> Client:
        if self._client:
            return self._client
            
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_ROLE_KEY if self.is_admin else settings.SUPABASE_ANON_KEY
        
        if not url or "placeholder" in url or not key or "placeholder" in key:
            raise RuntimeError("Supabase credentials not configured. Please setup your .env file with valid credentials.")
            
        try:
            self._client = create_client(url, key)
            return self._client
        except Exception as e:
            raise RuntimeError(f"Failed to initialize Supabase client: {str(e)}")

    def __getattr__(self, name):
        client = self._init_client()
        return getattr(client, name)

# Service role client proxy for backend admin action bypasses (RLS bypass)
supabase_admin = SupabaseClientProxy(is_admin=True)

# Public anon client proxy for public actions
supabase_anon = SupabaseClientProxy(is_admin=False)

def get_user_client(token: str) -> Client:
    """Creates a user-scoped Supabase client using their bearer JWT."""
    url = settings.SUPABASE_URL
    if not url or "placeholder" in url:
        raise RuntimeError("Supabase URL is not configured.")
    return create_client(url, token)
