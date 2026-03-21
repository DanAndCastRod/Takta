from __future__ import annotations

import base64
import html
import json
import re
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlmodel import Session

from ..core.auth import CurrentUser, get_current_user, require_role
from ..db import get_session
from ..models import Asset, FormatInstance, FormatTemplate


router = APIRouter(
    prefix="/api/documents",
    tags=["documents-advanced"],
    dependencies=[Depends(get_current_user)],
)


class DocumentPatch(BaseModel):
    content_json: str
    source_context_json: Optional[str] = None


class DocumentAutosaveRequest(BaseModel):
    document_id: Optional[uuid.UUID] = None
    template_id: uuid.UUID
    asset_id: Optional[uuid.UUID] = None
    content_json: str
    source_context_json: Optional[str] = None


class RenderResponse(BaseModel):
    document_id: uuid.UUID
    output_format: str
    content: str
    updated_at: datetime


def _as_editor_blocks(content_json: str) -> List[Dict[str, Any]]:
    try:
        payload = json.loads(content_json or "{}")
    except json.JSONDecodeError:
        return []
    blocks = payload.get("blocks")
    return blocks if isinstance(blocks, list) else []


def _strip_tags(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value or "")


def _flatten_list_items(items: Any) -> List[str]:
    flattened: List[str] = []
    if not isinstance(items, list):
        return flattened
    for item in items:
        if isinstance(item, str):
            flattened.append(item)
            continue
        if isinstance(item, dict):
            content = item.get("content")
            if isinstance(content, str):
                flattened.append(content)
            child_items = item.get("items")
            flattened.extend(_flatten_list_items(child_items))
    return flattened


def _render_markdown(blocks: List[Dict[str, Any]]) -> str:
    rows: List[str] = []
    for block in blocks:
        b_type = (block or {}).get("type")
        data = (block or {}).get("data") or {}
        if b_type == "header":
            level = int(data.get("level") or 2)
            level = max(1, min(6, level))
            text = _strip_tags(str(data.get("text") or ""))
            rows.append(f"{'#' * level} {text}".rstrip())
        elif b_type == "paragraph":
            rows.append(_strip_tags(str(data.get("text") or "")))
        elif b_type == "list":
            style = (data.get("style") or "unordered").lower()
            items = _flatten_list_items(data.get("items") or [])
            if style == "ordered":
                for idx, item in enumerate(items, start=1):
                    rows.append(f"{idx}. {_strip_tags(item)}")
            else:
                for item in items:
                    rows.append(f"- {_strip_tags(item)}")
        elif b_type == "table":
            content = data.get("content") or []
            if isinstance(content, list) and content:
                first = content[0] if isinstance(content[0], list) else []
                if first:
                    rows.append("| " + " | ".join(_strip_tags(str(cell)) for cell in first) + " |")
                    rows.append("| " + " | ".join("---" for _ in first) + " |")
                    for row in content[1:]:
                        if isinstance(row, list):
                            rows.append("| " + " | ".join(_strip_tags(str(cell)) for cell in row) + " |")
        elif b_type == "quote":
            quote_text = _strip_tags(str(data.get("text") or ""))
            caption = _strip_tags(str(data.get("caption") or ""))
            rows.append(f"> {quote_text}".rstrip())
            if caption:
                rows.append(f"> - {caption}")
        elif b_type == "warning":
            title = _strip_tags(str(data.get("title") or "Aviso"))
            msg = _strip_tags(str(data.get("message") or ""))
            rows.append(f"**{title}:** {msg}".rstrip())
        elif b_type in {"delimiter", "line"}:
            rows.append("---")
        elif b_type in {"image", "simpleImage"}:
            image_url = str(data.get("url") or data.get("file", {}).get("url") or "").strip()
            caption = _strip_tags(str(data.get("caption") or ""))
            if image_url:
                rows.append(f"![{caption}]({image_url})")
        else:
            text = _strip_tags(str(data.get("text") or ""))
            if text:
                rows.append(text)
        rows.append("")
    return "\n".join(rows).strip()


def _render_html(blocks: List[Dict[str, Any]]) -> str:
    html_rows: List[str] = ['<div class="takta-document">']
    for block in blocks:
        b_type = (block or {}).get("type")
        data = (block or {}).get("data") or {}
        if b_type == "header":
            level = int(data.get("level") or 2)
            level = max(1, min(6, level))
            text = html.escape(_strip_tags(str(data.get("text") or "")))
            html_rows.append(f"<h{level}>{text}</h{level}>")
        elif b_type == "paragraph":
            text = html.escape(_strip_tags(str(data.get("text") or "")))
            html_rows.append(f"<p>{text}</p>")
        elif b_type == "list":
            style = (data.get("style") or "unordered").lower()
            items = _flatten_list_items(data.get("items") or [])
            tag = "ol" if style == "ordered" else "ul"
            html_rows.append(f"<{tag}>")
            for item in items:
                html_rows.append(f"<li>{html.escape(_strip_tags(item))}</li>")
            html_rows.append(f"</{tag}>")
        elif b_type == "table":
            content = data.get("content") or []
            if isinstance(content, list) and content:
                html_rows.append("<table><tbody>")
                for row in content:
                    if not isinstance(row, list):
                        continue
                    html_rows.append("<tr>")
                    for cell in row:
                        html_rows.append(f"<td>{html.escape(_strip_tags(str(cell)))}</td>")
                    html_rows.append("</tr>")
                html_rows.append("</tbody></table>")
        elif b_type == "quote":
            quote_text = html.escape(_strip_tags(str(data.get("text") or "")))
            caption = html.escape(_strip_tags(str(data.get("caption") or "")))
            if caption:
                html_rows.append(f"<blockquote><p>{quote_text}</p><footer>{caption}</footer></blockquote>")
            else:
                html_rows.append(f"<blockquote><p>{quote_text}</p></blockquote>")
        elif b_type == "warning":
            title = html.escape(_strip_tags(str(data.get("title") or "Aviso")))
            msg = html.escape(_strip_tags(str(data.get("message") or "")))
            html_rows.append(f'<div class="warning"><strong>{title}</strong><p>{msg}</p></div>')
        elif b_type in {"delimiter", "line"}:
            html_rows.append("<hr />")
        elif b_type in {"image", "simpleImage"}:
            image_url = str(data.get("url") or data.get("file", {}).get("url") or "").strip()
            caption = html.escape(_strip_tags(str(data.get("caption") or "")))
            if image_url:
                html_rows.append(f'<figure><img src="{html.escape(image_url)}" alt="{caption}" />')
                if caption:
                    html_rows.append(f"<figcaption>{caption}</figcaption>")
                html_rows.append("</figure>")
        else:
            text = html.escape(_strip_tags(str(data.get("text") or "")))
            if text:
                html_rows.append(f"<p>{text}</p>")
    html_rows.append("</div>")
    return "\n".join(html_rows)


@router.patch("/{document_id}")
def patch_document(
    document_id: uuid.UUID,
    payload: DocumentPatch,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    document = session.get(FormatInstance, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.content_json = payload.content_json
    document.source_context_json = payload.source_context_json
    document.updated_at = datetime.utcnow()
    session.add(document)
    session.commit()
    session.refresh(document)
    return {
        "id": str(document.id),
        "updated_at": document.updated_at.isoformat(),
        "autosaved": False,
        "updated_by": user.username,
    }


@router.post("/autosave")
def autosave_document(
    payload: DocumentAutosaveRequest,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    if not session.get(FormatTemplate, payload.template_id):
        raise HTTPException(status_code=404, detail="Template not found")
    if payload.asset_id and not session.get(Asset, payload.asset_id):
        raise HTTPException(status_code=404, detail="Asset not found")

    if payload.document_id:
        document = session.get(FormatInstance, payload.document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        document.content_json = payload.content_json
        document.source_context_json = payload.source_context_json
        document.updated_at = datetime.utcnow()
        session.add(document)
        session.commit()
        session.refresh(document)
        return {
            "id": str(document.id),
            "template_id": str(document.template_id),
            "asset_id": str(document.asset_id) if document.asset_id else None,
            "updated_at": document.updated_at.isoformat(),
            "autosaved": True,
            "created": False,
        }

    document = FormatInstance(
        template_id=payload.template_id,
        asset_id=payload.asset_id,
        user_id=user.username,
        content_json=payload.content_json,
        source_context_json=payload.source_context_json,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(document)
    session.commit()
    session.refresh(document)
    return {
        "id": str(document.id),
        "template_id": str(document.template_id),
        "asset_id": str(document.asset_id) if document.asset_id else None,
        "updated_at": document.updated_at.isoformat(),
        "autosaved": True,
        "created": True,
    }


@router.get("/{document_id}/render", response_model=RenderResponse)
def render_document(
    document_id: uuid.UUID,
    output_format: str = Query(default="html", pattern="^(html|markdown)$"),
    session: Session = Depends(get_session),
):
    document = session.get(FormatInstance, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    blocks = _as_editor_blocks(document.content_json)
    rendered = _render_html(blocks) if output_format == "html" else _render_markdown(blocks)
    return RenderResponse(
        document_id=document.id,
        output_format=output_format,
        content=rendered,
        updated_at=document.updated_at,
    )


@router.post("/images")
async def upload_document_image(
    file: UploadFile = File(...),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image file")
    if len(raw) > 6 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 6MB)")

    mime = file.content_type or "application/octet-stream"
    encoded = base64.b64encode(raw).decode("ascii")
    data_url = f"data:{mime};base64,{encoded}"

    return {
        "success": 1,
        "file": {
            "url": data_url,
            "name": file.filename or "upload",
            "size": len(raw),
            "type": mime,
            "uploaded_by": user.username,
        },
    }

