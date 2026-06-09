from pydantic_settings import BaseSettings
from pydantic import Field
from dotenv import load_dotenv

# Load local .env file if it exists (for local testing)
load_dotenv()

class Settings(BaseSettings):
    SUPABASE_URL: str = Field(..., description="Supabase API URL")
    SUPABASE_ANON_KEY: str = Field(..., description="Supabase Anon/Public Key")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(..., description="Supabase Service Role Key (Admin actions)")
    ADMIN_EMAIL: str = Field("admin@klyperix.com", description="Default admin email")
    PORT: int = Field(8000, description="Local dev server port")
    
    CLOUDINARY_CLOUD_NAME: str = Field("", description="Cloudinary Cloud Name")
    CLOUDINARY_API_KEY: str = Field("", description="Cloudinary API Key")
    CLOUDINARY_API_SECRET: str = Field("", description="Cloudinary API Secret")

    class Config:
        env_file = ".env"
        extra = "ignore"

try:
    settings = Settings()
except Exception as e:
    # Fail gracefully if keys aren't set during initialization/build
    # (since Vercel builds environment checks before deployment environment is injected)
    import os
    settings = Settings(
        SUPABASE_URL=os.getenv("SUPABASE_URL", "https://placeholder-url.supabase.co"),
        SUPABASE_ANON_KEY=os.getenv("SUPABASE_ANON_KEY", "placeholder-key"),
        SUPABASE_SERVICE_ROLE_KEY=os.getenv("SUPABASE_SERVICE_ROLE_KEY", "placeholder-key"),
        ADMIN_EMAIL=os.getenv("ADMIN_EMAIL", "admin@klyperix.com"),
        CLOUDINARY_CLOUD_NAME=os.getenv("CLOUDINARY_CLOUD_NAME", ""),
        CLOUDINARY_API_KEY=os.getenv("CLOUDINARY_API_KEY", ""),
        CLOUDINARY_API_SECRET=os.getenv("CLOUDINARY_API_SECRET", "")
    )
