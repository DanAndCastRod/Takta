from fastapi import FastAPI
import uvicorn
from .db import init_db
from .api import assets, engineering, ci, audits, logistics

app = FastAPI(
    title="Takta API",
    description="Backend for OAC-SEO System",
    version="1.0.0"
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def read_root():
    return {"message": "Takta API is running", "status": "OK"}

# Include Routers
app.include_router(assets.router)
app.include_router(engineering.router)
app.include_router(ci.router)
app.include_router(audits.router)
app.include_router(logistics.router)

if __name__ == "__main__":
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=9003, reload=True)
