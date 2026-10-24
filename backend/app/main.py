import os
import asyncio
from contextlib import suppress
from . import safety
from .routers.safety_router import router as safety_router
from .product import email_worker
from .routers.product_router import router as product_router
from .demo import seed_demo
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .routers.uploads_router import router as uploads_router
from . import database
from .database import init_db
from .bootstrap import provision_admin
from .security import SecurityMiddleware
from .observability import ObservabilityMiddleware
from .mfa import router as mfa_router
from .password_recovery import router as recovery_router
from .routers import (auth_router, posts_router, responses_router, messages_router,
    ratings_router, verification_router, users_router, admin_router, reports_router)


@asynccontextmanager
async def lifespan(app):
    init_db()
    provision_admin(database.engine)
    seed_demo(database.engine)
    worker = asyncio.create_task(email_worker(database.engine))
    try:
        yield
    finally:
        worker.cancel()
        with suppress(asyncio.CancelledError):
            await worker


app = FastAPI(title="Community Help Hub API", version="0.2.0", lifespan=lifespan)
origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
if os.environ.get("APP_ENV") != "production":
    origins += ["http://localhost:3000", "http://127.0.0.1:3000"]
if "*" in origins:
    raise RuntimeError("CORS_ORIGINS must list exact origins, never '*'.")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type"])
app.add_middleware(SecurityMiddleware)
app.add_middleware(ObservabilityMiddleware)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.include_router(uploads_router)
for router in (auth_router.router, posts_router.router, responses_router.router, messages_router.router,
               ratings_router.router, verification_router.router, users_router.router, admin_router.router, mfa_router):
    app.include_router(router)
# Only the unique reporting endpoint is registered; duplicate admin handlers removed.
app.include_router(reports_router.router)
app.include_router(product_router)


@app.get("/health", include_in_schema=False)
@app.get("/")
def root():
    return {"status": "ok", "service": "Community Help Hub API"}


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Pydantic's default response echoes raw input, including passwords/proofs.
    return JSONResponse(status_code=422, content={"detail": [
        {"loc": list(error["loc"]), "msg": error["msg"], "type": error["type"]}
        for error in exc.errors()
    ]})

app.include_router(safety_router)
app.include_router(recovery_router)
