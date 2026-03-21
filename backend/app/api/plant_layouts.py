from datetime import datetime
from typing import List, Optional
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.auth import CurrentUser, get_current_user, get_tenant_code, require_role
from ..core.security import decode_access_token
from ..db import get_session
from ..models import Asset, PlantLayout


router = APIRouter(
    prefix='/api/plant-layouts',
    tags=['Plant Layouts'],
)

_ws_clients: set[WebSocket] = set()


def _extract_ws_token(websocket: WebSocket) -> Optional[str]:
    auth_header = websocket.headers.get('authorization') or websocket.headers.get('Authorization')
    if auth_header and auth_header.lower().startswith('bearer '):
        return auth_header.split(' ', 1)[1].strip()
    query_token = websocket.query_params.get('token')
    if query_token:
        return query_token.strip()
    return None


def _is_ws_authorized(websocket: WebSocket) -> bool:
    token = _extract_ws_token(websocket)
    if not token:
        return False
    payload = decode_access_token(token)
    return bool(payload and payload.get('sub'))


async def _broadcast_ws(payload: dict) -> None:
    stale_clients: List[WebSocket] = []
    for client in list(_ws_clients):
        try:
            await client.send_json(payload)
        except Exception:
            stale_clients.append(client)
    for stale in stale_clients:
        _ws_clients.discard(stale)


class LayoutBase(BaseModel):
    name: str
    description: Optional[str] = None
    json_content: str
    thumbnail_data: Optional[str] = None
    plant_id: Optional[uuid.UUID] = None
    is_active: bool = True


class LayoutCreate(LayoutBase):
    pass


class LayoutUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    json_content: Optional[str] = None
    thumbnail_data: Optional[str] = None
    plant_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None


class LayoutResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    thumbnail_data: Optional[str] = None
    plant_id: Optional[uuid.UUID] = None


class LayoutDetailResponse(LayoutResponse):
    json_content: str


def _ensure_plant_exists(session: Session, plant_id: Optional[uuid.UUID]) -> None:
    if plant_id and not session.get(Asset, plant_id):
        raise HTTPException(status_code=404, detail='Plant/asset not found')


@router.get('', response_model=List[LayoutResponse])
def get_layouts(
    plant_id: Optional[uuid.UUID] = None,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant_code = get_tenant_code(user)
    stmt = select(PlantLayout).where(
        PlantLayout.is_active == True,  # noqa: E712
        PlantLayout.tenant_code == tenant_code,
    )
    if plant_id:
        stmt = stmt.where(PlantLayout.plant_id == plant_id)
    return session.exec(stmt.order_by(PlantLayout.updated_at.desc())).all()


@router.get('/{layout_id}', response_model=LayoutDetailResponse)
def get_layout(
    layout_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    layout = session.get(PlantLayout, layout_id)
    if not layout or layout.tenant_code != get_tenant_code(user):
        raise HTTPException(status_code=404, detail='Layout not found')
    return layout


@router.post('', response_model=LayoutResponse)
def create_layout(
    layout_in: LayoutCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(['admin', 'engineer', 'supervisor'])),
):
    _ensure_plant_exists(session, layout_in.plant_id)
    tenant_code = get_tenant_code(user)

    layout = PlantLayout(
        tenant_code=tenant_code,
        name=layout_in.name,
        description=layout_in.description,
        json_content=layout_in.json_content,
        thumbnail_data=layout_in.thumbnail_data,
        plant_id=layout_in.plant_id,
        is_active=layout_in.is_active,
    )
    session.add(layout)
    session.commit()
    session.refresh(layout)
    return layout


@router.put('/{layout_id}', response_model=LayoutResponse)
def update_layout(
    layout_id: uuid.UUID,
    layout_in: LayoutUpdate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(['admin', 'engineer', 'supervisor'])),
):
    layout = session.get(PlantLayout, layout_id)
    if not layout or layout.tenant_code != get_tenant_code(user):
        raise HTTPException(status_code=404, detail='Layout not found')

    layout_data = layout_in.model_dump(exclude_unset=True)
    if 'plant_id' in layout_data:
        _ensure_plant_exists(session, layout_data.get('plant_id'))

    for key, value in layout_data.items():
        setattr(layout, key, value)

    layout.updated_at = datetime.utcnow()
    session.add(layout)
    session.commit()
    session.refresh(layout)
    return layout


@router.delete('/{layout_id}')
def delete_layout(
    layout_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(['admin', 'engineer'])),
):
    layout = session.get(PlantLayout, layout_id)
    if not layout or layout.tenant_code != get_tenant_code(user):
        raise HTTPException(status_code=404, detail='Layout not found')

    layout.is_active = False
    session.add(layout)
    session.commit()
    return {'ok': True}


@router.websocket('/ws')
async def plant_layouts_ws(websocket: WebSocket):
    if not _is_ws_authorized(websocket):
        await websocket.close(code=1008, reason='Unauthorized')
        return

    await websocket.accept()
    _ws_clients.add(websocket)
    await websocket.send_json({
        'type': 'ws_ready',
        'module': 'plant_layouts',
        'message': 'WebSocket connected',
    })

    try:
        while True:
            raw = await websocket.receive_text()
            payload: dict
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                payload = {'type': 'text', 'message': raw}

            message_type = str(payload.get('type') or '').lower()
            if message_type == 'ping':
                await websocket.send_json({'type': 'pong', 'ts': datetime.utcnow().isoformat()})
                continue

            if not payload.get('type'):
                payload['type'] = 'event'
            payload.setdefault('source', 'plant_layouts_ws')
            payload.setdefault('ts', datetime.utcnow().isoformat())
            await _broadcast_ws(payload)

    except WebSocketDisconnect:
        _ws_clients.discard(websocket)
    except Exception:
        _ws_clients.discard(websocket)
        await websocket.close(code=1011)
