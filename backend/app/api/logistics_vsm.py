from __future__ import annotations

import io
import json
import uuid
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional, Set

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from ..core.auth import CurrentUser, get_current_user, require_role
from ..db import get_session
from ..models import Asset, KanbanLoop, VSMCanvas
from ..services.simple_pdf import build_text_pdf


router = APIRouter(
    prefix="/api/logistics",
    tags=["Logistics VSM"],
    dependencies=[Depends(get_current_user)],
)


def _safe_json_load(raw: str, default: Any) -> Any:
    try:
        return json.loads(raw or "")
    except Exception:
        return default


class VSMCanvasCreate(BaseModel):
    name: str
    asset_id: Optional[uuid.UUID] = None
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    constraints: Dict[str, Any] = {}


class VSMCanvasUpdate(BaseModel):
    name: Optional[str] = None
    asset_id: Optional[uuid.UUID] = None
    nodes: Optional[List[Dict[str, Any]]] = None
    edges: Optional[List[Dict[str, Any]]] = None
    constraints: Optional[Dict[str, Any]] = None


@router.post("/vsm/canvases")
def create_vsm_canvas(
    payload: VSMCanvasCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    if payload.asset_id and not session.get(Asset, payload.asset_id):
        raise HTTPException(status_code=404, detail="Asset not found")
    row = VSMCanvas(
        name=payload.name.strip(),
        asset_id=payload.asset_id,
        nodes_json=json.dumps(payload.nodes, ensure_ascii=False),
        edges_json=json.dumps(payload.edges, ensure_ascii=False),
        constraints_json=json.dumps(payload.constraints, ensure_ascii=False),
        created_by=user.username,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"id": str(row.id)}


@router.get("/vsm/canvases")
def list_vsm_canvases(
    asset_id: Optional[uuid.UUID] = None,
    session: Session = Depends(get_session),
):
    stmt = select(VSMCanvas)
    if asset_id:
        stmt = stmt.where(VSMCanvas.asset_id == asset_id)
    rows = session.exec(stmt.order_by(VSMCanvas.updated_at.desc())).all()
    assets = {row.id: row.name for row in session.exec(select(Asset)).all()}
    return [
        {
            "id": str(row.id),
            "name": row.name,
            "asset_id": str(row.asset_id) if row.asset_id else None,
            "asset_name": assets.get(row.asset_id) if row.asset_id else None,
            "nodes_count": len(_safe_json_load(row.nodes_json, [])),
            "edges_count": len(_safe_json_load(row.edges_json, [])),
            "created_by": row.created_by,
            "created_at": row.created_at.isoformat(),
            "updated_at": row.updated_at.isoformat(),
        }
        for row in rows
    ]


@router.get("/vsm/canvases/{canvas_id}")
def get_vsm_canvas(canvas_id: uuid.UUID, session: Session = Depends(get_session)):
    row = session.get(VSMCanvas, canvas_id)
    if not row:
        raise HTTPException(status_code=404, detail="VSM canvas not found")
    return {
        "id": str(row.id),
        "name": row.name,
        "asset_id": str(row.asset_id) if row.asset_id else None,
        "nodes": _safe_json_load(row.nodes_json, []),
        "edges": _safe_json_load(row.edges_json, []),
        "constraints": _safe_json_load(row.constraints_json, {}),
        "created_by": row.created_by,
        "created_at": row.created_at.isoformat(),
        "updated_at": row.updated_at.isoformat(),
    }


@router.patch("/vsm/canvases/{canvas_id}")
def update_vsm_canvas(
    canvas_id: uuid.UUID,
    payload: VSMCanvasUpdate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    row = session.get(VSMCanvas, canvas_id)
    if not row:
        raise HTTPException(status_code=404, detail="VSM canvas not found")
    data = payload.model_dump(exclude_unset=True)
    if "asset_id" in data and data["asset_id"] and not session.get(Asset, data["asset_id"]):
        raise HTTPException(status_code=404, detail="Asset not found")
    if "nodes" in data:
        row.nodes_json = json.dumps(data.pop("nodes"), ensure_ascii=False)
    if "edges" in data:
        row.edges_json = json.dumps(data.pop("edges"), ensure_ascii=False)
    if "constraints" in data:
        row.constraints_json = json.dumps(data.pop("constraints"), ensure_ascii=False)
    for key, value in data.items():
        setattr(row, key, value)
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"id": str(row.id), "updated_at": row.updated_at.isoformat(), "updated_by": user.username}


@router.delete("/vsm/canvases/{canvas_id}", status_code=204)
def delete_vsm_canvas(
    canvas_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    row = session.get(VSMCanvas, canvas_id)
    if not row:
        raise HTTPException(status_code=404, detail="VSM canvas not found")
    session.delete(row)
    session.commit()


def _path_dfs(
    graph: Dict[str, List[str]],
    current: str,
    targets: Set[str],
    visited: Set[str],
    acc: List[str],
    out: List[List[str]],
) -> None:
    if current in visited:
        return
    visited.add(current)
    acc.append(current)
    if current in targets or not graph.get(current):
        out.append(list(acc))
    else:
        for nxt in graph[current]:
            _path_dfs(graph, nxt, targets, visited, acc, out)
    acc.pop()
    visited.remove(current)


def _edge_traffic_color(density: float) -> str:
    if density >= 0.85:
        return "red"
    if density >= 0.60:
        return "yellow"
    return "green"


@router.get("/vsm/canvases/{canvas_id}/analyze-routes")
def analyze_vsm_routes(canvas_id: uuid.UUID, session: Session = Depends(get_session)):
    row = session.get(VSMCanvas, canvas_id)
    if not row:
        raise HTTPException(status_code=404, detail="VSM canvas not found")

    nodes = _safe_json_load(row.nodes_json, [])
    edges = _safe_json_load(row.edges_json, [])
    if not nodes:
        return {"canvas_id": str(canvas_id), "routes": [], "totals": {"lead_time": 0, "cycle_time": 0}}

    node_map = {str(node.get("id")): node for node in nodes if node.get("id")}
    graph: Dict[str, List[str]] = defaultdict(list)
    in_degree: Dict[str, int] = {node_id: 0 for node_id in node_map}

    for edge in edges:
        src = str(edge.get("from") or "")
        dst = str(edge.get("to") or "")
        if src in node_map and dst in node_map:
            graph[src].append(dst)
            in_degree[dst] = in_degree.get(dst, 0) + 1

    sources = [node_id for node_id in node_map if in_degree.get(node_id, 0) == 0]
    if not sources:
        sources = list(node_map.keys())[:1]
    sinks = {node_id for node_id in node_map if not graph.get(node_id)}

    paths: List[List[str]] = []
    for source in sources:
        _path_dfs(graph, source, sinks, set(), [], paths)

    edge_density: Dict[tuple[str, str], float] = {}
    for edge in edges:
        src = str(edge.get("from") or "")
        dst = str(edge.get("to") or "")
        density = float(edge.get("flow_density") or 0)
        if src and dst:
            edge_density[(src, dst)] = density

    route_payload: List[Dict[str, Any]] = []
    longest_route = None
    longest_lead = -1.0
    for idx, path in enumerate(paths, start=1):
        lead = 0.0
        cycle = 0.0
        traffic = []
        for pos, node_id in enumerate(path):
            node = node_map[node_id]
            lead += float(node.get("lead_time") or 0)
            cycle += float(node.get("cycle_time") or 0)
            if pos < len(path) - 1:
                pair = (node_id, path[pos + 1])
                density = float(edge_density.get(pair, 0))
                traffic.append(
                    {
                        "from": pair[0],
                        "to": pair[1],
                        "flow_density": density,
                        "traffic_color": _edge_traffic_color(density),
                    }
                )
        payload = {
            "route_id": idx,
            "path": path,
            "lead_time": round(lead, 3),
            "cycle_time": round(cycle, 3),
            "traffic": traffic,
        }
        route_payload.append(payload)
        if lead > longest_lead:
            longest_lead = lead
            longest_route = payload

    total_lead = sum(float(node_map[n].get("lead_time") or 0) for n in node_map)
    total_cycle = sum(float(node_map[n].get("cycle_time") or 0) for n in node_map)
    return {
        "canvas_id": str(canvas_id),
        "routes": route_payload,
        "critical_route": longest_route,
        "totals": {"lead_time": round(total_lead, 3), "cycle_time": round(total_cycle, 3)},
    }


@router.get("/vsm/canvases/{canvas_id}/export/pdf")
def export_vsm_pdf(canvas_id: uuid.UUID, session: Session = Depends(get_session)):
    canvas = session.get(VSMCanvas, canvas_id)
    if not canvas:
        raise HTTPException(status_code=404, detail="VSM canvas not found")
    analysis = analyze_vsm_routes(canvas_id=canvas_id, session=session)
    lines = [
        f"Canvas: {canvas.name}",
        f"Nodes: {len(_safe_json_load(canvas.nodes_json, []))}",
        f"Edges: {len(_safe_json_load(canvas.edges_json, []))}",
        f"Total lead time: {analysis['totals']['lead_time']}",
        f"Total cycle time: {analysis['totals']['cycle_time']}",
        "",
        "Routes:",
    ]
    for route in analysis.get("routes", []):
        lines.append(
            f"- Route {route['route_id']}: {' -> '.join(route['path'])} | "
            f"LT={route['lead_time']} | CT={route['cycle_time']}"
        )
    payload = build_text_pdf(f"Takta VSM Report {canvas.name}", lines)
    headers = {"Content-Disposition": f'attachment; filename="takta_vsm_{canvas_id}.pdf"'}
    return StreamingResponse(io.BytesIO(payload), media_type="application/pdf", headers=headers)


@router.get("/kanban/loops/{loop_id}/export/pdf")
def export_kanban_loop_pdf(loop_id: uuid.UUID, session: Session = Depends(get_session)):
    loop = session.get(KanbanLoop, loop_id)
    if not loop:
        raise HTTPException(status_code=404, detail="Kanban loop not found")
    origin = session.get(Asset, loop.asset_origin_id)
    dest = session.get(Asset, loop.asset_dest_id)
    lines = [
        f"SKU: {loop.sku_code}",
        f"Origin: {origin.name if origin else loop.asset_origin_id}",
        f"Destination: {dest.name if dest else loop.asset_dest_id}",
        f"Container capacity: {loop.container_capacity}",
        f"Daily demand: {loop.daily_demand}",
        f"Lead time (days): {loop.lead_time_days}",
        f"Safety stock (%): {loop.safety_stock_pct}",
        f"Calculated cards: {loop.calculated_cards}",
    ]
    payload = build_text_pdf(f"Takta Kanban Card {loop.sku_code}", lines)
    headers = {"Content-Disposition": f'attachment; filename="takta_kanban_{loop_id}.pdf"'}
    return StreamingResponse(io.BytesIO(payload), media_type="application/pdf", headers=headers)

