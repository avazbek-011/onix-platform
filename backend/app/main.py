import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import ensure_initial_admin
from app.config import settings
from app.database import SessionLocal, init_db
from app.routers import accounts, admin, auth, groups, lookup
from app.telethon_manager import telethon_manager

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with SessionLocal() as db:
        ensure_initial_admin(db)
    yield
    await telethon_manager.shutdown()


app = FastAPI(title=settings.app_name, version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(lookup.router)
app.include_router(groups.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    return {"app": settings.app_name, "status": "ok"}
