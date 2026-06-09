from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# Import routers
from api.routers import content, media, settings, users, analytics
from api.auth import get_current_user



app = FastAPI(
    title="Klyperix API",
    description="FastAPI Backend APIs for portfolio, settings, testimonials, and user role management.",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

from fastapi import Request
from fastapi.responses import Response

@app.middleware("http")
async def add_cache_headers(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    # Cache static assets for 1 year (excluding js and css for development)
    if any(path.endswith(ext) for ext in ['.woff2', '.woff', '.png', '.jpg', '.webp', '.mp4']):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    # Cache API responses briefly
    elif path.startswith('/api/content') or path.startswith('/api/settings') or path.endswith('.js') or path.endswith('.css'):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


# Enable CORS for cross-origin local requests
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1):\d+",
    allow_origins=["https://klyperix.com", "https://www.klyperix.com", os.getenv("ALLOWED_ORIGIN", "")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(content.router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "Klyperix API"}

@app.get("/api/config")
def get_client_config(user = Depends(get_current_user)):
    from api.config import settings
    return {
        "supabase_url": settings.SUPABASE_URL,
        "supabase_anon_key": settings.SUPABASE_ANON_KEY
    }

@app.get("/api/faqs")
def get_faqs():
    return []

@app.get("/api/contacts")
def get_contacts():
    import datetime
    import uuid
    now = datetime.datetime.utcnow()
    return [
        {
            "id": str(uuid.uuid4()),
            "name": "Jane Smith",
            "email": "jane.smith@example.com",
            "message": "Hi, I really loved your portfolio. I have a YouTube channel with 500k subs and I am looking for a full-time editor. What are your rates?",
            "created_at": (now - datetime.timedelta(days=1)).isoformat() + "Z",
            "status": "new"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Mark Johnson",
            "email": "mark@agency.co",
            "message": "We need someone to edit 10 TikToks per week for our e-commerce clients. Can we hop on a call to discuss?",
            "created_at": (now - datetime.timedelta(hours=5)).isoformat() + "Z",
            "status": "contacted"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Alex Creator",
            "email": "alex.vlogs@gmail.com",
            "message": "Do you also do thumbnail design along with video editing? I have a vlog channel.",
            "created_at": now.isoformat() + "Z",
            "status": "new"
        }
    ]

@app.get("/api/bugs")
def get_bugs():
    return []

from pydantic import BaseModel
class BugReport(BaseModel):
    message: str
    source_file: str
    line_number: int
    page_url: str
    device_type: str
    browser: str
    status: str

@app.post("/api/bugs/report")
def report_bug(bug: BugReport):
    print("================ JAVASCRIPT ERROR REPORT ================")
    print(f"Message: {bug.message}")
    print(f"File: {bug.source_file}")
    print(f"Line: {bug.line_number}")
    print("=========================================================")
    return {"status": "received"}

# Unified Local Development static files mounts
# Vercel runtime defines VERCEL=1 environment variable
if not os.getenv("VERCEL"):
    # Serve assets directory if it exists
    if os.path.isdir("assets"):
        app.mount("/assets", StaticFiles(directory="assets"), name="assets")
        
    # Serve public client scripts if directory exists
    if os.path.isdir("public"):
        app.mount("/public", StaticFiles(directory="public"), name="public")
        
    # Serve admin static folder (e.g. /admin/index.html -> http://127.0.0.1:8000/admin/)
    if os.path.isdir("admin"):
        app.mount("/admin", StaticFiles(directory="admin", html=True), name="admin")
        
    # Serve submit feedback page
    @app.get("/inject_feedback_button.js")
    def read_js():
        if os.path.isfile("inject_feedback_button.js"):
            return FileResponse("inject_feedback_button.js")
        return {"error": "not found"}

    @app.get("/submit-feedback.html")
    def read_feedback():
        if os.path.isfile("submit-feedback.html"):
            return FileResponse("submit-feedback.html")
        return {"error": "submit-feedback.html not found"}
        
    # Serve main site entrypoint
    @app.get("/")
    def read_root():
        if os.path.isfile("index.html"):
            return FileResponse("index.html")
        elif os.path.isfile("index_47.html"):
            return FileResponse("index_47.html")
        return {"message": "Klyperix API Online. Static index.html not found."}
