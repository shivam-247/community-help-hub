import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import init_db
from .routers import (
    auth_router, posts_router, responses_router, messages_router,
    ratings_router, reports_router, verification_router, users_router,
    admin_router,
)

app = FastAPI(title="Community Help Hub API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
