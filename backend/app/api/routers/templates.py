import os
import pathlib
import yaml
from uuid import UUID
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from ...db import get_session
from ...models import FormatTemplate
from ...core.auth import require_role

router = APIRouter(
    prefix="/api/templates",
    tags=["templates"]
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
    # Go 5 levels up: templates.py -> routers -> api -> app -> backend -> Takta (Project Root)
    project_root = pathlib.Path(__file__).resolve().parent.parent.parent.parent.parent
    formats_dir = project_root / "templates" / "ie_formats"
    
    if not formats_dir.exists() or not formats_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Templates directory not found at {formats_dir}")

    created = 0
    updated = 0
    errors = []

    for filepath in formats_dir.rglob("*.md"):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            category = filepath.parent.name
            code = filepath.stem # Using filename without extension as unique code
            
            # Extract name from the first h1 header, otherwise use the filename
            name = code
            lines = content.split('\n')
            for line in lines:
                if line.startswith("# "):
                    name = line[2:].strip()
                    break

            # Check if template already exists
            existing_template = session.exec(select(FormatTemplate).where(FormatTemplate.code == code)).first()

            if existing_template:
                existing_template.name = name
                existing_template.category = category
                existing_template.markdown_structure = content
                session.add(existing_template)
                updated += 1
            else:
                new_template = FormatTemplate(
                    code=code,
                    name=name,
                    category=category,
                    markdown_structure=content
                )
                session.add(new_template)
                created += 1

        except Exception as e:
            errors.append(f"Error processing {filepath.name}: {str(e)}")

    session.commit()
    return IngestResponse(created=created, updated=updated, errors=errors)


@router.get("/", response_model=List[TemplateResponse])
def get_templates(session: Session = Depends(get_session)):
    """
    Retrieves all available format templates, typically to show in a UI selector.
    """
    templates = session.exec(select(FormatTemplate)).all()
    return templates
