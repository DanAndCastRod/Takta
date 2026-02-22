from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import uvicorn
from .db import init_db
from .api.routers import assets, capacity, auth
from .api import engineering, ci, audits, logistics, plant_layouts

app = FastAPI(
    title="Takta API",
    description="Backend for OAC-SEO System — Industrial Engineering Standardization",
    version="1.1.0"
)

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict in production to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=500)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def read_root():
    return {"message": "Takta API is running", "version": "1.1.0", "status": "OK"}

# --- Routers ---
app.include_router(auth.router)
app.include_router(assets.router)
app.include_router(engineering.router)
app.include_router(ci.router)
app.include_router(audits.router)
app.include_router(logistics.router)
app.include_router(plant_layouts.router)
app.include_router(capacity.router)

if __name__ == "__main__":
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=9003, reload=True)

