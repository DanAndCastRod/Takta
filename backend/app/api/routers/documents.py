from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import datetime

from ...db import get_session
from ...models import FormatInstance, FormatTemplate, Asset
from ...core.auth import get_current_user, require_role, CurrentUser

router = APIRouter(
    prefix="/api/documents",
    tags=["documents"]
)

# Schema for Input
class DocumentCreate(BaseModel):
    template_id: UUID
    asset_id: Optional[UUID] = None
    content_json: str

# Schema for Output
class DocumentResponse(BaseModel):
    id: UUID
    template_id: UUID
    asset_id: Optional[UUID] = None
    user_id: str
    created_at: datetime
    content_json: str

class DocumentSummary(BaseModel):
    id: UUID
    template_name: str
    user_id: str
    created_at: datetime

@router.post("/", response_model=DocumentResponse)
def create_document(
    document_in: DocumentCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"]))
):
    """
    Creates a new filled format instance (Document) from Editor.js output.
    """
    # Verify template exists
    template = session.get(FormatTemplate, document_in.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Verify asset exists if provided
    if document_in.asset_id:
        asset = session.get(Asset, document_in.asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

    new_document = FormatInstance(
        template_id=document_in.template_id,
        asset_id=document_in.asset_id,
        user_id=user.username,
        content_json=document_in.content_json
    )
    
    session.add(new_document)
    session.commit()
    session.refresh(new_document)
    
    return new_document


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user)
):
    """
    Retrieves a specific document instance.
    """
    document = session.get(FormatInstance, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    return document


@router.get("/asset/{asset_id}", response_model=List[DocumentSummary])
def get_documents_by_asset(
    asset_id: UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user)
):
    """
    Retrieves a summary list of all documents linked to a specific asset.
    """
    # Join with FormatTemplate to get the template name
    statement = (
        select(FormatInstance, FormatTemplate.name)
        .join(FormatTemplate, FormatInstance.template_id == FormatTemplate.id)
        .where(FormatInstance.asset_id == asset_id)
        .order_by(FormatInstance.created_at.desc())
    )
    
    results = session.exec(statement).all()
    
    summaries = []
    for doc, template_name in results:
        summaries.append(DocumentSummary(
            id=doc.id,
            template_name=template_name,
            user_id=doc.user_id,
            created_at=doc.created_at
        ))
        
    return summaries
