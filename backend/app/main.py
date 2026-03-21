"""
Takta Backend — FastAPI application entry point.

Serves the OAC-SEO API for Industrial Engineering standardization.
Database engine is lazy-loaded from db.py using .env configuration.
"""

from contextlib import asynccontextmanager
import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlmodel import Session

from .db import get_engine, init_db
from .api.routers import assets, capacity, auth, templates, documents
from .api import (
    audits,
    ci,
    documents_advanced,
    engineering,
    engineering_advanced,
    execution,
    execution_advanced,
    excellence_advanced,
    integration,
    logistics,
    logistics_vsm,
    meetings,
    plant_layouts,
    platform,
    quality,
)
from .services.template_ingest import ingest_templates_from_disk


logger = logging.getLogger(__name__)


# ── Lifespan (replaces deprecated @app.on_event) ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialize database tables. Shutdown: no-op for now."""
    init_db()
    try:
        with Session(get_engine()) as session:
            result = ingest_templates_from_disk(session, only_if_empty=True)
            if not result.get("skipped"):
                logger.info(
                    "[Templates] Base ingest completed on startup: created=%s updated=%s errors=%s",
                    result.get("created"),
                    result.get("updated"),
                    len(result.get("errors", [])),
                )
    except Exception as exc:
        logger.warning("[Templates] Startup ingest skipped: %s", exc)
    yield


# ── App ──
app = FastAPI(
    title="Takta API",
    description="Backend for OAC-SEO System -- Industrial Engineering Standardization",
    version="1.1.0",
    lifespan=lifespan,
)

# ── Middleware ──
cors_origins_raw = os.getenv("CORS_ORIGINS", "*").strip()
cors_origins = ["*"] if cors_origins_raw == "*" else [
    origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["*"],
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
app.include_router(documents_advanced.router)
app.include_router(engineering.router)
app.include_router(engineering_advanced.router)
app.include_router(integration.router)
app.include_router(execution.router)
app.include_router(execution_advanced.router)
app.include_router(ci.router)
app.include_router(audits.router)
app.include_router(excellence_advanced.router)
app.include_router(quality.router)
app.include_router(logistics.router)
app.include_router(logistics_vsm.router)
app.include_router(plant_layouts.router)
app.include_router(capacity.router)
app.include_router(meetings.router)
app.include_router(platform.router)
