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
    tags=["documents"],
    dependencies=[Depends(get_current_user)],
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


class DocumentListItem(BaseModel):
    id: UUID
    template_id: UUID
    template_code: str
    template_name: str
    asset_id: Optional[UUID] = None
    asset_name: Optional[str] = None
    user_id: str
    created_at: datetime


@router.get("", response_model=List[DocumentListItem])
def list_documents(
    asset_id: Optional[UUID] = None,
    limit: int = 200,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user)
):
    """
    Retrieves a global summary list of created documents.
    Optional filter by asset_id.
    """
    safe_limit = max(1, min(limit, 500))

    statement = (
        select(FormatInstance, FormatTemplate.code, FormatTemplate.name, Asset.name)
        .join(FormatTemplate, FormatInstance.template_id == FormatTemplate.id)
        .join(Asset, Asset.id == FormatInstance.asset_id, isouter=True)
        .order_by(FormatInstance.created_at.desc())
        .limit(safe_limit)
    )

    if asset_id:
        statement = statement.where(FormatInstance.asset_id == asset_id)

    rows = session.exec(statement).all()

    result: List[DocumentListItem] = []
    for doc, template_code, template_name, asset_name in rows:
        result.append(
            DocumentListItem(
                id=doc.id,
                template_id=doc.template_id,
                template_code=template_code,
                template_name=template_name,
                asset_id=doc.asset_id,
                asset_name=asset_name,
                user_id=doc.user_id,
                created_at=doc.created_at,
            )
        )
    return result

@router.post("", response_model=DocumentResponse)
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


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"]))
):
    """
    Deletes a specific document instance.
    """
    document = session.get(FormatInstance, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    session.delete(document)
    session.commit()
