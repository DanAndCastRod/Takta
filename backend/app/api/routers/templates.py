from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from ...db import get_session
from ...models import FormatTemplate
from ...core.auth import get_current_user, require_role
from ...services.template_ingest import ingest_templates_from_disk, get_templates_dir

router = APIRouter(
    prefix="/api/templates",
    tags=["templates"],
    dependencies=[Depends(get_current_user)],
)

# Schema for Output
class TemplateResponse(BaseModel):
    id: UUID
    code: str
    name: str
    category: str
    json_schema_structure: str | None
    markdown_structure: str

class IngestResponse(BaseModel):
    created: int
    updated: int
    errors: List[str]

@router.post("/ingest", response_model=IngestResponse)
def ingest_templates(session: Session = Depends(get_session), user=Depends(require_role(["admin", "engineer"]))):
    """
    Scans the `templates/ie_formats` directory for Markdown files and upserts them
    into the FormatTemplate table based on their filename and folder.
    """
    formats_dir = get_templates_dir()
    if not formats_dir.exists() or not formats_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Templates directory not found at {formats_dir}")

    result = ingest_templates_from_disk(session, only_if_empty=False)
    return IngestResponse(
        created=int(result["created"]),
        updated=int(result["updated"]),
        errors=list(result["errors"]),
    )


@router.get("", response_model=List[TemplateResponse])
def get_templates(session: Session = Depends(get_session)):
    """
    Retrieves all available format templates, typically to show in a UI selector.
    """
    templates = session.exec(select(FormatTemplate)).all()
    return templates
