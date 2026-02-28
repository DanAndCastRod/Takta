"""
Takta Backend — FastAPI application entry point.

Serves the OAC-SEO API for Industrial Engineering standardization.
Database engine is lazy-loaded from db.py using .env configuration.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from .db import init_db
from .api.routers import assets, capacity, auth, templates, documents
from .api import engineering, ci, audits, logistics, plant_layouts


# ── Lifespan (replaces deprecated @app.on_event) ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialize database tables. Shutdown: no-op for now."""
    init_db()
    yield


# ── App ──
app = FastAPI(
    title="Takta API",
    description="Backend for OAC-SEO System -- Industrial Engineering Standardization",
    version="1.1.0",
    lifespan=lifespan,
)

# ── Middleware ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=500)


# ── Health Check ──
@app.get("/")
def read_root():
    return {"message": "Takta API is running", "version": "1.1.0", "status": "OK"}


# ── Routers ──
app.include_router(auth.router)
app.include_router(assets.router)
app.include_router(templates.router)
app.include_router(documents.router)
app.include_router(engineering.router)
app.include_router(ci.router)
app.include_router(audits.router)
app.include_router(logistics.router)
app.include_router(plant_layouts.router)
app.include_router(capacity.router)
