import os
from fastapi import FastAPI, Depends
from .auth import require_super_admin
from .models import User
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import init_db
from .routers import (
    auth_router, posts_router, responses_router, messages_router,
    ratings_router, reports_router, verification_router, users_router,
    admin_router,
)

app = FastAPI(title="Community Help Hub API", version="0.1.0")

cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
default_origins = ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=default_origins + cors_origins,
    allow_origin_regex=r"^https://.*\.vercel\.app$|^https://.*\.onrender\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.on_event("startup")
def on_startup():
    init_db()
    try:
        import sys
        root_backend = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if root_backend not in sys.path:
            sys.path.insert(0, root_backend)
        from seed import run_seed
        run_seed()
        print("Startup seed completed successfully!")
    except Exception as e:
        print(f"Startup seed error (non-fatal): {e}")
        import traceback
        traceback.print_exc()


app.include_router(auth_router.router)
app.include_router(posts_router.router)
app.include_router(responses_router.router)
app.include_router(messages_router.router)
app.include_router(ratings_router.router)
app.include_router(reports_router.router)
app.include_router(verification_router.router)
app.include_router(users_router.router)
app.include_router(admin_router.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "Community Help Hub API"}


@app.get("/admin/seed")
def manual_seed(super_admin: User = Depends(require_super_admin)):
    """Emergency endpoint to manually trigger seeding. Remove after use."""
    try:
        import sys
        root_backend = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if root_backend not in sys.path:
            sys.path.insert(0, root_backend)
        from seed import run_seed
        run_seed()
        return {"status": "ok", "message": "Seed completed successfully"}
    except Exception as e:
        import traceback
        return {"status": "error", "message": str(e), "trace": traceback.format_exc()}
