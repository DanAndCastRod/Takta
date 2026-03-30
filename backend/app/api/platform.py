from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field as PydanticField
from sqlmodel import Session, select

from ..core.auth import CurrentUser, get_current_user, get_tenant_code, require_role
from ..db import get_session
from ..models import (
    Asset,
    ContinuousImprovementKpiDefinition,
    ContinuousImprovementKpiMeasurement,
    DiagramChangeLog,
    DiagramLibraryFavorite,
    DiagramLibraryItem,
    DiagramPropertySchema,
    DowntimeEvent,
    ImprovementAction,
    IntegrationEvent,
    IntegrationHealthSnapshot,
    LayerTreeState,
    NonConformity,
    PlantLayout,
    SimulationDecision,
    SimulationScenario,
    SimulationScenarioResult,
    Tenant,
    TenantConfigAudit,
    TenantFeatureFlag,
    TenantTheme,
    TenantUiConfig,
    WeightSamplingSpec,
)


router = APIRouter(
    prefix="/api/platform",
    tags=["Platform V2"],
    dependencies=[Depends(get_current_user)],
)


DEFAULT_THEME = {
    "brand_name": "TAKTA",
    "badge_label": "OAC-SEO",
    "logo_url": None,
    "colors": {
        "brand_orange": "#f97316",
        "brand_orange_dark": "#ea580c",
        "surface": "#ffffff",
        "surface_soft": "#f8fafc",
        "text_primary": "#0f172a",
        "text_secondary": "#334155",
    },
    "typography": {
        "font_family": "\"Segoe UI\", \"Inter\", system-ui, -apple-system, BlinkMacSystemFont, \"Helvetica Neue\", Arial, sans-serif",
        "heading_weight": 700,
        "body_weight": 400,
    },
}


DEFAULT_MENU = [
    {
        "title": "Inicio",
        "items": [
            {"id": "dashboard", "path": "#/", "label": "Dashboard", "feature": "core.dashboard"},
            {"id": "landing", "path": "#/landing", "label": "Vista consolidada", "feature": None},
            {"id": "docs", "path": "#/docs", "label": "Docs", "feature": None},
        ],
    },
    {
        "title": "Ingeniería",
        "items": [
            {"id": "assets", "path": "#/assets", "label": "Árbol de activos", "feature": "module.assets"},
            {"id": "engineering", "path": "#/engineering", "label": "Ingeniería", "feature": "module.engineering"},
            {"id": "timing", "path": "#/timing", "label": "Cronómetro", "feature": "module.timing"},
            {"id": "capacity", "path": "#/capacity", "label": "Capacidad", "feature": "module.capacity"},
        ],
    },
    {
        "title": "Operación",
        "items": [
            {"id": "execution", "path": "#/execution", "label": "Ejecución", "feature": "module.execution"},
            {"id": "mobile", "path": "#/mobile", "label": "Piso móvil", "feature": "module.execution.mobile"},
        ],
    },
    {
        "title": "Calidad y Mejora",
        "items": [
            {"id": "weight", "path": "#/weight-sampling", "label": "Muestreo de peso", "feature": "module.quality"},
            {"id": "excellence", "path": "#/excellence", "label": "Excelencia", "feature": "module.excellence"},
            {"id": "meetings", "path": "#/meetings", "label": "Actas IP", "feature": "module.meetings"},
        ],
    },
    {
        "title": "Documentación y Diseño",
        "items": [
            {"id": "editor", "path": "#/editor", "label": "Editor docs", "feature": "module.documents.editor"},
            {"id": "documents", "path": "#/documents", "label": "Documentos", "feature": "module.documents"},
            {"id": "diagram", "path": "#/plant-editor", "label": "Diagram Studio", "feature": "module.diagram"},
        ],
    },
]

DEFAULT_MENU_ITEM_BY_ID = {
    str(item["id"]): item
    for group in DEFAULT_MENU
    for item in group.get("items", [])
    if item.get("id")
}
DEFAULT_MENU_TITLE_BY_ITEM_IDS = {
    tuple(str(item["id"]) for item in group.get("items", []) if item.get("id")): group["title"]
    for group in DEFAULT_MENU
}


FEATURE_CATALOG = [
    "core.dashboard",
    "core.integration_health",
    "module.assets",
    "module.engineering",
    "module.timing",
    "module.capacity",
    "module.execution",
    "module.execution.mobile",
    "module.quality",
    "module.excellence",
    "module.meetings",
    "module.documents",
    "module.documents.editor",
    "module.diagram",
    "module.simulation",
    "module.white_label_admin",
]


PROFILE_FEATURES = {
    "minimal": {
        "core.dashboard",
        "module.assets",
        "module.execution",
        "module.quality",
        "module.meetings",
        "module.documents",
    },
    "full": set(FEATURE_CATALOG),
}


INTEGRATION_EVENT_CATALOG = {
    "integration": ["context.summary.requested", "context.summary.failed", "nightly.validation.completed"],
    "quality": ["quality.sample.created", "quality.spc.capability.run", "quality.nc.opened"],
    "excellence": ["kpi.measurement.upserted", "kpi.scorecard.requested", "action.workflow.transition"],
    "diagram": ["diagram.layout.saved", "diagram.layer_tree.updated", "diagram.simulation.executed"],
}


DEFAULT_PROPERTY_SCHEMAS = {
    "rect": {
        "title": "Zona",
        "fields": [
            {"key": "assetId", "label": "Activo", "type": "asset_ref", "required": False},
            {"key": "zoneType", "label": "Tipo de zona", "type": "enum", "options": ["production", "storage", "office", "transit"], "default": "production"},
            {"key": "capacity", "label": "Capacidad u/h", "type": "number", "min": 0, "default": 60},
            {"key": "wipLimit", "label": "Límite WIP", "type": "number", "min": 0, "default": 0},
        ],
    },
    "ellipse": {
        "title": "Estación",
        "fields": [
            {"key": "assetId", "label": "Activo", "type": "asset_ref", "required": False},
            {"key": "cycleTimeSec", "label": "Tiempo ciclo (s)", "type": "number", "min": 1, "default": 60},
            {"key": "capacity", "label": "Capacidad u/h", "type": "number", "min": 0, "default": 50},
        ],
    },
    "arrowLine": {
        "title": "Conector",
        "fields": [
            {"key": "type", "label": "Tipo de flujo", "type": "enum", "options": ["material", "information", "personnel", "energy"], "default": "material"},
            {"key": "capacity", "label": "Capacidad", "type": "text", "default": "100 u/h"},
            {"key": "variability", "label": "Variabilidad %", "type": "number", "min": 0, "max": 200, "default": 10},
        ],
    },
}


class TenantCreate(BaseModel):
    code: str
    name: str
    profile: str = "full"
    is_active: bool = True


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    profile: Optional[str] = None
    is_active: Optional[bool] = None


class ThemeUpdate(BaseModel):
    brand_name: Optional[str] = None
    badge_label: Optional[str] = None
    logo_url: Optional[str] = None
    colors: Optional[Dict[str, Any]] = None
    typography: Optional[Dict[str, Any]] = None
    custom_css: Optional[str] = None


class UiConfigUpdate(BaseModel):
    menu: Optional[List[Dict[str, Any]]] = None
    modules: Optional[Dict[str, Any]] = None
    locale: Optional[str] = None
    timezone: Optional[str] = None


class FeatureFlagUpdate(BaseModel):
    is_enabled: bool
    rollout: str = "ga"
    notes: Optional[str] = None


class IntegrationEventCreate(BaseModel):
    module: str
    event_code: str
    severity: str = "info"
    status: str = "ok"
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    payload: Dict[str, Any] = PydanticField(default_factory=dict)
    source: Optional[str] = None


def _json_load(value: Optional[str], fallback: Any) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def _repair_mojibake_text(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    text = value
    if not any(token in text for token in ("Ã", "Â", "â", "\ufffd", "\x81", "\x8d", "\x8f", "\x90", "\x9d")):
        return text.replace("\u00ad", "")
    try:
        repaired = text.encode("latin1", errors="ignore").decode("utf-8")
        return (repaired or text).replace("\u00ad", "")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text.replace("\u00ad", "")


def _repair_nested_strings(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            _repair_mojibake_text(key) if isinstance(key, str) else key: _repair_nested_strings(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_repair_nested_strings(item) for item in value]
    return _repair_mojibake_text(value)


def _is_suspicious_text(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    return any(token in value for token in ("Ã", "Â", "â", "\ufffd", "\x81", "\x8d", "\x8f", "\x90", "\x9d"))


def _repair_menu_config(value: Any) -> List[Dict[str, Any]]:
    repaired = _repair_nested_strings(value)
    if not isinstance(repaired, list):
        return DEFAULT_MENU

    normalized: List[Dict[str, Any]] = []
    for group in repaired:
        if not isinstance(group, dict):
            continue
        normalized_group = dict(group)
        items: List[Dict[str, Any]] = []
        for item in normalized_group.get("items", []) or []:
            if not isinstance(item, dict):
                continue
            normalized_item = dict(item)
            default_item = DEFAULT_MENU_ITEM_BY_ID.get(str(normalized_item.get("id") or ""))
            if default_item and _is_suspicious_text(normalized_item.get("label")):
                normalized_item["label"] = default_item["label"]
            if default_item and _is_suspicious_text(normalized_item.get("path")):
                normalized_item["path"] = default_item["path"]
            items.append(normalized_item)
        normalized_group["items"] = items
        group_key = tuple(str(item.get("id")) for item in items if item.get("id"))
        default_title = DEFAULT_MENU_TITLE_BY_ITEM_IDS.get(group_key)
        if default_title and _is_suspicious_text(normalized_group.get("title")):
            normalized_group["title"] = default_title
        normalized.append(normalized_group)
    return normalized or DEFAULT_MENU


def _tenant_scope(tenant_code: str, requested: Optional[str] = None) -> str:
    target = (requested or tenant_code or "default").strip() or "default"
    return target


def _serialize_theme(theme: Optional[TenantTheme]) -> Dict[str, Any]:
    if not theme:
        return DEFAULT_THEME
    return {
        "brand_name": theme.brand_name,
        "badge_label": theme.badge_label,
        "logo_url": theme.logo_url,
        "colors": _json_load(theme.colors_json, DEFAULT_THEME["colors"]),
        "typography": _json_load(theme.typography_json, DEFAULT_THEME["typography"]),
        "custom_css": theme.custom_css,
    }


def _serialize_ui_config(ui: Optional[TenantUiConfig]) -> Dict[str, Any]:
    if not ui:
        return {"menu": DEFAULT_MENU, "modules": {}, "locale": "es-CO", "timezone": "America/Bogota"}
    menu = _repair_menu_config(_json_load(ui.menu_json, DEFAULT_MENU))
    modules = _repair_nested_strings(_json_load(ui.modules_json, {}))
    return {
        "menu": menu if isinstance(menu, list) else DEFAULT_MENU,
        "modules": modules if isinstance(modules, dict) else {},
        "locale": ui.locale,
        "timezone": ui.timezone,
    }


def _ensure_tenant_seed(session: Session, tenant_code: str, actor: str = "system", profile: str = "full") -> None:
    tenant = session.exec(select(Tenant).where(Tenant.code == tenant_code)).first()
    if not tenant:
        tenant = Tenant(
            code=tenant_code,
            name=tenant_code.upper(),
            profile=profile if profile in {"minimal", "full", "custom"} else "full",
            is_active=True,
            created_by=actor,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(tenant)
    theme = session.exec(select(TenantTheme).where(TenantTheme.tenant_code == tenant_code)).first()
    if not theme:
        session.add(
            TenantTheme(
                tenant_code=tenant_code,
                brand_name=DEFAULT_THEME["brand_name"],
                badge_label=DEFAULT_THEME["badge_label"],
                colors_json=json.dumps(DEFAULT_THEME["colors"], ensure_ascii=False),
                typography_json=json.dumps(DEFAULT_THEME["typography"], ensure_ascii=False),
                updated_by=actor,
                updated_at=datetime.utcnow(),
            )
        )
    ui = session.exec(select(TenantUiConfig).where(TenantUiConfig.tenant_code == tenant_code)).first()
    if not ui:
        session.add(
            TenantUiConfig(
                tenant_code=tenant_code,
                menu_json=json.dumps(DEFAULT_MENU, ensure_ascii=False),
                modules_json=json.dumps({}, ensure_ascii=False),
                locale="es-CO",
                timezone="America/Bogota",
                updated_by=actor,
                updated_at=datetime.utcnow(),
            )
        )
    else:
        repaired_menu = _repair_menu_config(_json_load(ui.menu_json, DEFAULT_MENU))
        repaired_modules = _repair_nested_strings(_json_load(ui.modules_json, {}))
        repaired_menu_json = json.dumps(
            repaired_menu if isinstance(repaired_menu, list) else DEFAULT_MENU,
            ensure_ascii=False,
        )
        repaired_modules_json = json.dumps(
            repaired_modules if isinstance(repaired_modules, dict) else {},
            ensure_ascii=False,
        )
        if ui.menu_json != repaired_menu_json or ui.modules_json != repaired_modules_json:
            ui.menu_json = repaired_menu_json
            ui.modules_json = repaired_modules_json
            ui.updated_by = actor
            ui.updated_at = datetime.utcnow()
            session.add(ui)
    if not session.exec(select(TenantFeatureFlag).where(TenantFeatureFlag.tenant_code == tenant_code)).all():
        enabled = PROFILE_FEATURES.get(profile, PROFILE_FEATURES["full"])
        for feature in FEATURE_CATALOG:
            session.add(
                TenantFeatureFlag(
                    tenant_code=tenant_code,
                    feature_key=feature,
                    is_enabled=feature in enabled,
                    rollout="ga",
                    updated_by=actor,
                    updated_at=datetime.utcnow(),
                )
            )
    session.commit()


def _write_config_audit(
    session: Session,
    tenant_code: str,
    config_type: str,
    config_key: str,
    old_value: Any,
    new_value: Any,
    actor: str,
) -> None:
    session.add(
        TenantConfigAudit(
            tenant_code=tenant_code,
            config_type=config_type,
            config_key=config_key,
            old_value_json=json.dumps(old_value, ensure_ascii=False) if old_value is not None else None,
            new_value_json=json.dumps(new_value, ensure_ascii=False) if new_value is not None else None,
            changed_by=actor,
            changed_at=datetime.utcnow(),
        )
    )


def _log_integration_event(
    session: Session,
    tenant_code: str,
    module: str,
    event_code: str,
    created_by: str,
    severity: str = "info",
    status: str = "ok",
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
    source: Optional[str] = None,
) -> IntegrationEvent:
    row = IntegrationEvent(
        tenant_code=tenant_code,
        module=module,
        event_code=event_code,
        severity=severity,
        status=status,
        entity_type=entity_type,
        entity_id=entity_id,
        payload_json=json.dumps(payload or {}, ensure_ascii=False),
        source=source,
        created_by=created_by,
        created_at=datetime.utcnow(),
    )
    session.add(row)
    return row


def _calculate_integration_health(session: Session, tenant_code: str) -> Dict[str, Any]:
    orphan_details: List[Dict[str, Any]] = []
    mismatch_details: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

    actions = session.exec(select(ImprovementAction).where(ImprovementAction.tenant_code == tenant_code)).all()
    asset_ids = {asset.id for asset in session.exec(select(Asset)).all()}
    for action in actions:
        if action.asset_id and action.asset_id not in asset_ids:
            orphan_details.append({"type": "action.asset_missing", "entity_id": str(action.id), "asset_id": str(action.asset_id)})

    definitions = session.exec(
        select(ContinuousImprovementKpiDefinition).where(ContinuousImprovementKpiDefinition.tenant_code == tenant_code)
    ).all()
    definition_by_id = {row.id: row for row in definitions}
    measurements = session.exec(
        select(ContinuousImprovementKpiMeasurement).where(ContinuousImprovementKpiMeasurement.tenant_code == tenant_code)
    ).all()
    for measurement in measurements:
        definition = definition_by_id.get(measurement.kpi_definition_id)
        if not definition:
            orphan_details.append({"type": "kpi.measurement.definition_missing", "entity_id": str(measurement.id)})
            continue
        if definition.tenant_code != measurement.tenant_code:
            mismatch_details.append({"type": "kpi.tenant_mismatch", "measurement_id": str(measurement.id), "definition_id": str(definition.id)})

    open_nc_count = len(
        session.exec(
            select(NonConformity).where(
                NonConformity.tenant_code == tenant_code,
                NonConformity.status.in_(["Open", "In Progress", "Close Requested"]),
            )
        ).all()
    )
    if open_nc_count > 25:
        warnings.append({"type": "quality.backlog_high", "value": open_nc_count})

    status = "ok"
    if mismatch_details or orphan_details:
        status = "critical"
    elif warnings:
        status = "warning"
    return {
        "status": status,
        "orphan_count": len(orphan_details),
        "mismatch_count": len(mismatch_details),
        "warning_count": len(warnings),
        "orphan_details": orphan_details[:150],
        "mismatch_details": mismatch_details[:150],
        "warnings": warnings,
    }


@router.get("/tenants")
def list_tenants(
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant_code = get_tenant_code(user)
    _ensure_tenant_seed(session, tenant_code, actor=user.username, profile=user.feature_profile)
    rows = session.exec(select(Tenant).order_by(Tenant.code.asc())).all()
    return [
        {
            "code": row.code,
            "name": row.name,
            "profile": row.profile,
            "is_active": row.is_active,
            "updated_at": row.updated_at,
        }
        for row in rows
    ]


@router.post("/tenants")
def create_tenant(
    payload: TenantCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin"])),
):
    code = payload.code.strip().lower()
    if not code:
        raise HTTPException(status_code=400, detail="Tenant code is required.")
    existing = session.exec(select(Tenant).where(Tenant.code == code)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Tenant already exists.")
    tenant = Tenant(
        code=code,
        name=payload.name,
        profile=payload.profile if payload.profile in {"minimal", "full", "custom"} else "full",
        is_active=payload.is_active,
        created_by=user.username,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(tenant)
    session.commit()
    _ensure_tenant_seed(session, code, actor=user.username, profile=tenant.profile)
    _write_config_audit(session, code, "tenant", "create", None, payload.model_dump(), user.username)
    session.commit()
    return {"ok": True, "tenant": {"code": code, "name": payload.name, "profile": tenant.profile}}


@router.patch("/tenants/{tenant_code}")
def update_tenant(
    tenant_code: str,
    payload: TenantUpdate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin"])),
):
    tenant = session.exec(select(Tenant).where(Tenant.code == tenant_code)).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")
    before = {"name": tenant.name, "profile": tenant.profile, "is_active": tenant.is_active}
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(tenant, key, value)
    tenant.updated_at = datetime.utcnow()
    session.add(tenant)
    _write_config_audit(session, tenant_code, "tenant", "update", before, data, user.username)
    session.commit()
    return {"ok": True}


@router.get("/runtime")
def get_runtime_config(
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    _ensure_tenant_seed(session, tenant, actor=user.username, profile=user.feature_profile)
    tenant_row = session.exec(select(Tenant).where(Tenant.code == tenant)).first()
    theme = session.exec(select(TenantTheme).where(TenantTheme.tenant_code == tenant)).first()
    ui = session.exec(select(TenantUiConfig).where(TenantUiConfig.tenant_code == tenant)).first()
    flags = session.exec(select(TenantFeatureFlag).where(TenantFeatureFlag.tenant_code == tenant)).all()
    return {
        "tenant": {
            "code": tenant,
            "name": tenant_row.name if tenant_row else tenant.upper(),
            "profile": tenant_row.profile if tenant_row else "full",
        },
        "theme": _serialize_theme(theme),
        "ui_config": _serialize_ui_config(ui),
        "feature_flags": {row.feature_key: {"enabled": row.is_enabled, "rollout": row.rollout} for row in flags},
    }


@router.put("/theme")
def upsert_theme(
    payload: ThemeUpdate,
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    _ensure_tenant_seed(session, tenant, actor=user.username, profile=user.feature_profile)
    row = session.exec(select(TenantTheme).where(TenantTheme.tenant_code == tenant)).first()
    if not row:
        row = TenantTheme(tenant_code=tenant)
    before = _serialize_theme(row if row.id else None)
    if payload.brand_name is not None:
        row.brand_name = payload.brand_name
    if payload.badge_label is not None:
        row.badge_label = payload.badge_label
    if payload.logo_url is not None:
        row.logo_url = payload.logo_url
    if payload.colors is not None:
        row.colors_json = json.dumps(payload.colors, ensure_ascii=False)
    if payload.typography is not None:
        row.typography_json = json.dumps(payload.typography, ensure_ascii=False)
    if payload.custom_css is not None:
        row.custom_css = payload.custom_css
    row.updated_by = user.username
    row.updated_at = datetime.utcnow()
    session.add(row)
    _write_config_audit(session, tenant, "theme", "theme", before, payload.model_dump(exclude_unset=True), user.username)
    session.commit()
    return {"ok": True, "theme": _serialize_theme(row)}


@router.put("/ui-config")
def upsert_ui_config(
    payload: UiConfigUpdate,
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    _ensure_tenant_seed(session, tenant, actor=user.username, profile=user.feature_profile)
    row = session.exec(select(TenantUiConfig).where(TenantUiConfig.tenant_code == tenant)).first()
    if not row:
        row = TenantUiConfig(tenant_code=tenant)
    before = _serialize_ui_config(row if row.id else None)
    if payload.menu is not None:
        row.menu_json = json.dumps(payload.menu, ensure_ascii=False)
    if payload.modules is not None:
        row.modules_json = json.dumps(payload.modules, ensure_ascii=False)
    if payload.locale is not None:
        row.locale = payload.locale
    if payload.timezone is not None:
        row.timezone = payload.timezone
    row.updated_by = user.username
    row.updated_at = datetime.utcnow()
    session.add(row)
    _write_config_audit(session, tenant, "ui", "ui_config", before, payload.model_dump(exclude_unset=True), user.username)
    session.commit()
    return {"ok": True, "ui_config": _serialize_ui_config(row)}


@router.get("/feature-flags")
def list_feature_flags(
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    _ensure_tenant_seed(session, tenant, actor=user.username, profile=user.feature_profile)
    rows = session.exec(select(TenantFeatureFlag).where(TenantFeatureFlag.tenant_code == tenant)).all()
    return {
        "tenant_code": tenant,
        "flags": [
            {
                "feature_key": row.feature_key,
                "is_enabled": row.is_enabled,
                "rollout": row.rollout,
                "notes": row.notes,
                "updated_at": row.updated_at,
                "updated_by": row.updated_by,
            }
            for row in sorted(rows, key=lambda item: item.feature_key)
        ],
    }


@router.put("/feature-flags/{feature_key}")
def update_feature_flag(
    feature_key: str,
    payload: FeatureFlagUpdate,
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    if feature_key not in FEATURE_CATALOG:
        raise HTTPException(status_code=404, detail="Unknown feature key.")
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    _ensure_tenant_seed(session, tenant, actor=user.username, profile=user.feature_profile)
    row = session.exec(
        select(TenantFeatureFlag).where(
            TenantFeatureFlag.tenant_code == tenant,
            TenantFeatureFlag.feature_key == feature_key,
        )
    ).first()
    if not row:
        row = TenantFeatureFlag(tenant_code=tenant, feature_key=feature_key)
    before = {"is_enabled": row.is_enabled, "rollout": row.rollout, "notes": row.notes}
    row.is_enabled = payload.is_enabled
    row.rollout = payload.rollout
    row.notes = payload.notes
    row.updated_by = user.username
    row.updated_at = datetime.utcnow()
    session.add(row)
    _write_config_audit(session, tenant, "feature", feature_key, before, payload.model_dump(), user.username)
    session.commit()
    return {"ok": True}


@router.post("/feature-flags/apply-profile/{profile}")
def apply_profile_feature_flags(
    profile: str,
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    profile = profile.strip().lower()
    if profile not in PROFILE_FEATURES:
        raise HTTPException(status_code=400, detail="profile must be 'minimal' or 'full'.")
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    _ensure_tenant_seed(session, tenant, actor=user.username, profile=profile)
    enabled = PROFILE_FEATURES[profile]
    flags = session.exec(select(TenantFeatureFlag).where(TenantFeatureFlag.tenant_code == tenant)).all()
    for row in flags:
        row.is_enabled = row.feature_key in enabled
        row.rollout = "ga"
        row.updated_by = user.username
        row.updated_at = datetime.utcnow()
        session.add(row)
    tenant_row = session.exec(select(Tenant).where(Tenant.code == tenant)).first()
    if tenant_row:
        tenant_row.profile = profile
        tenant_row.updated_at = datetime.utcnow()
        session.add(tenant_row)
    _write_config_audit(session, tenant, "feature", "apply_profile", None, {"profile": profile}, user.username)
    session.commit()
    return {"ok": True, "profile": profile}


@router.get("/config-audit")
def list_config_audit(
    tenant_code: Optional[str] = Query(default=None),
    limit: int = Query(default=80, ge=1, le=500),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    rows = session.exec(
        select(TenantConfigAudit)
        .where(TenantConfigAudit.tenant_code == tenant)
        .order_by(TenantConfigAudit.changed_at.desc())
    ).all()[:limit]
    return [
        {
            "id": str(row.id),
            "config_type": row.config_type,
            "config_key": row.config_key,
            "old_value": _json_load(row.old_value_json, None),
            "new_value": _json_load(row.new_value_json, None),
            "changed_by": row.changed_by,
            "changed_at": row.changed_at,
        }
        for row in rows
    ]


@router.get("/operations/backup-policy")
def get_backup_policy():
    return {
        "policy_version": "v2.0",
        "schedule": "daily 02:30 tenant-local",
        "retention": {"daily_days": 15, "weekly_weeks": 8, "monthly_months": 12},
        "storage": {"mode": "encrypted", "checksum": "sha256"},
        "restore_drill_frequency_days": 30,
    }


@router.post("/operations/backup/snapshot")
def trigger_backup_snapshot(
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin"])),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    snapshot_id = f"bkp-{tenant}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    _log_integration_event(
        session=session,
        tenant_code=tenant,
        module="platform",
        event_code="backup.snapshot.triggered",
        severity="info",
        status="ok",
        created_by=user.username,
        payload={"snapshot_id": snapshot_id},
        source="platform.api",
    )
    session.commit()
    return {"ok": True, "snapshot_id": snapshot_id}


@router.get("/operations/security/isolation-check")
def run_isolation_check(
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    _ensure_tenant_seed(session, tenant, actor=user.username, profile=user.feature_profile)
    health = _calculate_integration_health(session, tenant)
    isolated = health["mismatch_count"] == 0
    return {
        "tenant_code": tenant,
        "isolated": isolated,
        "status": "pass" if isolated else "fail",
        "mismatch_count": health["mismatch_count"],
        "orphan_count": health["orphan_count"],
    }


@router.get("/integration/events/catalog")
def get_event_catalog():
    return {"catalog": INTEGRATION_EVENT_CATALOG}


@router.post("/integration/events")
def create_integration_event(
    payload: IntegrationEventCreate,
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    event = _log_integration_event(
        session=session,
        tenant_code=tenant,
        module=payload.module,
        event_code=payload.event_code,
        severity=payload.severity,
        status=payload.status,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        payload=payload.payload,
        source=payload.source,
        created_by=user.username,
    )
    session.commit()
    session.refresh(event)
    return {"id": str(event.id), "created_at": event.created_at}


@router.get("/integration/events")
def list_integration_events(
    tenant_code: Optional[str] = Query(default=None),
    module: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=200, ge=1, le=1000),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    stmt = select(IntegrationEvent).where(IntegrationEvent.tenant_code == tenant)
    if module:
        stmt = stmt.where(IntegrationEvent.module == module)
    if severity:
        stmt = stmt.where(IntegrationEvent.severity == severity)
    if status:
        stmt = stmt.where(IntegrationEvent.status == status)
    rows = session.exec(stmt.order_by(IntegrationEvent.created_at.desc())).all()[:limit]
    return [
        {
            "id": str(row.id),
            "module": row.module,
            "event_code": row.event_code,
            "severity": row.severity,
            "status": row.status,
            "entity_type": row.entity_type,
            "entity_id": row.entity_id,
            "payload": _json_load(row.payload_json, {}),
            "source": row.source,
            "created_by": row.created_by,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.post("/integration/health/run-validation")
def run_integration_health_validation(
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    health = _calculate_integration_health(session, tenant)
    snapshot = IntegrationHealthSnapshot(
        tenant_code=tenant,
        status=health["status"],
        orphan_count=health["orphan_count"],
        mismatch_count=health["mismatch_count"],
        warning_count=health["warning_count"],
        summary_json=json.dumps(health, ensure_ascii=False),
        created_by=user.username,
        created_at=datetime.utcnow(),
    )
    session.add(snapshot)
    _log_integration_event(
        session=session,
        tenant_code=tenant,
        module="integration",
        event_code="nightly.validation.completed",
        severity="error" if health["status"] == "critical" else ("warn" if health["status"] == "warning" else "info"),
        status=health["status"],
        payload={"health": health},
        source="platform.health",
        created_by=user.username,
    )
    session.commit()
    session.refresh(snapshot)
    return {"snapshot_id": str(snapshot.id), "tenant_code": tenant, "status": snapshot.status, "health": health}


@router.post("/integration/jobs/nightly-validation")
def run_nightly_validation_job(
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    return run_integration_health_validation(tenant_code=tenant_code, session=session, user=user)


@router.get("/integration/health/latest")
def get_latest_integration_health(
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    row = session.exec(
        select(IntegrationHealthSnapshot)
        .where(IntegrationHealthSnapshot.tenant_code == tenant)
        .order_by(IntegrationHealthSnapshot.created_at.desc())
    ).first()
    if not row:
        return {"tenant_code": tenant, "status": "unknown", "summary": None}
    return {
        "tenant_code": tenant,
        "status": row.status,
        "orphan_count": row.orphan_count,
        "mismatch_count": row.mismatch_count,
        "warning_count": row.warning_count,
        "summary": _json_load(row.summary_json, {}),
        "created_at": row.created_at,
    }


@router.get("/integration/health/dashboard")
def get_integration_health_dashboard(
    tenant_code: Optional[str] = Query(default=None),
    days: int = Query(default=7, ge=1, le=90),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    rows = session.exec(
        select(IntegrationHealthSnapshot)
        .where(IntegrationHealthSnapshot.tenant_code == tenant)
        .order_by(IntegrationHealthSnapshot.created_at.desc())
    ).all()[:days]
    status_counts = {"ok": 0, "warning": 0, "critical": 0}
    for row in rows:
        status_counts[row.status] = status_counts.get(row.status, 0) + 1
    latest = rows[0] if rows else None
    return {
        "tenant_code": tenant,
        "days": days,
        "status_counts": status_counts,
        "latest": {
            "status": latest.status,
            "orphan_count": latest.orphan_count,
            "mismatch_count": latest.mismatch_count,
            "warning_count": latest.warning_count,
            "created_at": latest.created_at,
        } if latest else None,
        "history": [
            {
                "created_at": row.created_at,
                "status": row.status,
                "orphan_count": row.orphan_count,
                "mismatch_count": row.mismatch_count,
                "warning_count": row.warning_count,
            }
            for row in rows
        ],
    }


class DiagramLibraryCreate(BaseModel):
    domain: str
    code: str
    name: str
    version: str = "1.0.0"
    element_type: str
    tags: List[str] = PydanticField(default_factory=list)
    shape: Dict[str, Any] = PydanticField(default_factory=dict)
    guide_markdown: Optional[str] = None
    is_template: bool = False


class DiagramLibraryUpdate(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None
    tags: Optional[List[str]] = None
    shape: Optional[Dict[str, Any]] = None
    guide_markdown: Optional[str] = None
    is_template: Optional[bool] = None
    is_active: Optional[bool] = None


class LayerTreeUpsert(BaseModel):
    diagram_id: Optional[uuid.UUID] = None
    tree: Dict[str, Any]
    ui_state: Dict[str, Any] = PydanticField(default_factory=dict)


class PropertySchemaUpsert(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    version: str = "1.0.0"
    schema_definition: Dict[str, Any] = PydanticField(alias="schema")
    is_active: bool = True


class DiagramChangeCreate(BaseModel):
    diagram_id: Optional[uuid.UUID] = None
    object_id: Optional[str] = None
    change_type: str
    before: Optional[Dict[str, Any]] = None
    after: Optional[Dict[str, Any]] = None


def _read_diagram_seed_file() -> List[Dict[str, Any]]:
    path = Path(__file__).resolve().parent.parent / "seeds" / "diagram_libraries.json"
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []


@router.post("/diagram/libraries/seed")
def seed_diagram_libraries(
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    entries = _read_diagram_seed_file()
    created = 0
    updated = 0
    for entry in entries:
        code = str(entry.get("code") or "").strip()
        version = str(entry.get("version") or "1.0.0")
        if not code:
            continue
        row = session.exec(
            select(DiagramLibraryItem).where(
                DiagramLibraryItem.tenant_code == tenant,
                DiagramLibraryItem.code == code,
                DiagramLibraryItem.version == version,
            )
        ).first()
        payload = {
            "domain": entry.get("domain", "process"),
            "name": entry.get("name", code),
            "element_type": entry.get("element_type", "rect"),
            "tags_json": json.dumps(entry.get("tags", []), ensure_ascii=False),
            "shape_json": json.dumps(entry.get("shape", {}), ensure_ascii=False),
            "guide_markdown": entry.get("guide_markdown"),
            "is_template": bool(entry.get("is_template", False)),
            "is_active": True,
        }
        if row:
            for key, value in payload.items():
                setattr(row, key, value)
            row.updated_at = datetime.utcnow()
            session.add(row)
            updated += 1
            continue
        session.add(
            DiagramLibraryItem(
                tenant_code=tenant,
                code=code,
                version=version,
                created_by=user.username,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                **payload,
            )
        )
        created += 1
    session.commit()
    return {"created": created, "updated": updated, "total": len(entries)}


@router.get("/diagram/libraries")
def list_diagram_libraries(
    tenant_code: Optional[str] = Query(default=None),
    domain: Optional[str] = None,
    search: Optional[str] = None,
    only_templates: bool = False,
    version: Optional[str] = None,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    stmt = select(DiagramLibraryItem).where(
        DiagramLibraryItem.tenant_code == tenant,
        DiagramLibraryItem.is_active.is_(True),
    )
    if domain:
        stmt = stmt.where(DiagramLibraryItem.domain == domain)
    if only_templates:
        stmt = stmt.where(DiagramLibraryItem.is_template.is_(True))
    if version:
        stmt = stmt.where(DiagramLibraryItem.version == version)
    rows = session.exec(stmt.order_by(DiagramLibraryItem.domain.asc(), DiagramLibraryItem.name.asc())).all()
    favorites = {
        str(row.library_item_id)
        for row in session.exec(
            select(DiagramLibraryFavorite).where(
                DiagramLibraryFavorite.tenant_code == tenant,
                DiagramLibraryFavorite.username == user.username,
            )
        ).all()
    }
    normalized_search = (search or "").strip().lower()
    output = []
    for row in rows:
        tags = _json_load(row.tags_json, [])
        if normalized_search:
            searchable = f"{row.code} {row.name} {' '.join(map(str, tags))}".lower()
            if normalized_search not in searchable:
                continue
        output.append(
            {
                "id": str(row.id),
                "domain": row.domain,
                "code": row.code,
                "name": row.name,
                "version": row.version,
                "element_type": row.element_type,
                "tags": tags,
                "shape": _json_load(row.shape_json, {}),
                "guide_markdown": row.guide_markdown,
                "is_template": row.is_template,
                "favorite": str(row.id) in favorites,
            }
        )
    return output


@router.post("/diagram/libraries")
def create_diagram_library_item(
    payload: DiagramLibraryCreate,
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    row = DiagramLibraryItem(
        tenant_code=tenant,
        domain=payload.domain,
        code=payload.code,
        name=payload.name,
        version=payload.version,
        element_type=payload.element_type,
        tags_json=json.dumps(payload.tags, ensure_ascii=False),
        shape_json=json.dumps(payload.shape, ensure_ascii=False),
        guide_markdown=payload.guide_markdown,
        is_template=payload.is_template,
        is_active=True,
        created_by=user.username,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"id": str(row.id)}


@router.patch("/diagram/libraries/{item_id}")
def update_diagram_library_item(
    item_id: uuid.UUID,
    payload: DiagramLibraryUpdate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    row = session.get(DiagramLibraryItem, item_id)
    if not row:
        raise HTTPException(status_code=404, detail="Library item not found.")
    data = payload.model_dump(exclude_unset=True)
    if "tags" in data:
        row.tags_json = json.dumps(data.pop("tags"), ensure_ascii=False)
    if "shape" in data:
        row.shape_json = json.dumps(data.pop("shape"), ensure_ascii=False)
    for key, value in data.items():
        setattr(row, key, value)
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()
    return {"ok": True}


@router.delete("/diagram/libraries/{item_id}", status_code=204)
def delete_diagram_library_item(
    item_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    row = session.get(DiagramLibraryItem, item_id)
    if not row:
        raise HTTPException(status_code=404, detail="Library item not found.")
    row.is_active = False
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()


@router.get("/diagram/libraries/guides")
def list_diagram_guides(
    tenant_code: Optional[str] = Query(default=None),
    domain: Optional[str] = None,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    stmt = select(DiagramLibraryItem).where(
        DiagramLibraryItem.tenant_code == tenant,
        DiagramLibraryItem.is_active.is_(True),
    )
    if domain:
        stmt = stmt.where(DiagramLibraryItem.domain == domain)
    rows = session.exec(stmt.order_by(DiagramLibraryItem.domain.asc(), DiagramLibraryItem.name.asc())).all()
    return [
        {
            "id": str(row.id),
            "domain": row.domain,
            "name": row.name,
            "guide_markdown": row.guide_markdown or "",
        }
        for row in rows
        if row.guide_markdown
    ]


@router.post("/diagram/libraries/{item_id}/favorite")
def favorite_library_item(
    item_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = get_tenant_code(user)
    exists = session.exec(
        select(DiagramLibraryFavorite).where(
            DiagramLibraryFavorite.tenant_code == tenant,
            DiagramLibraryFavorite.username == user.username,
            DiagramLibraryFavorite.library_item_id == item_id,
        )
    ).first()
    if exists:
        return {"ok": True, "favorite": True}
    session.add(
        DiagramLibraryFavorite(
            tenant_code=tenant,
            username=user.username,
            library_item_id=item_id,
            created_at=datetime.utcnow(),
        )
    )
    session.commit()
    return {"ok": True, "favorite": True}


@router.delete("/diagram/libraries/{item_id}/favorite")
def unfavorite_library_item(
    item_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = get_tenant_code(user)
    row = session.exec(
        select(DiagramLibraryFavorite).where(
            DiagramLibraryFavorite.tenant_code == tenant,
            DiagramLibraryFavorite.username == user.username,
            DiagramLibraryFavorite.library_item_id == item_id,
        )
    ).first()
    if row:
        session.delete(row)
        session.commit()
    return {"ok": True, "favorite": False}


@router.get("/diagram/libraries/favorites")
def list_library_favorites(
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = get_tenant_code(user)
    rows = session.exec(
        select(DiagramLibraryFavorite).where(
            DiagramLibraryFavorite.tenant_code == tenant,
            DiagramLibraryFavorite.username == user.username,
        )
    ).all()
    return [str(row.library_item_id) for row in rows]


@router.put("/diagram/layer-tree")
def upsert_layer_tree(
    payload: LayerTreeUpsert,
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    row = session.exec(
        select(LayerTreeState).where(
            LayerTreeState.tenant_code == tenant,
            LayerTreeState.diagram_id == payload.diagram_id,
        )
    ).first()
    if not row:
        row = LayerTreeState(
            tenant_code=tenant,
            diagram_id=payload.diagram_id,
            updated_by=user.username,
            updated_at=datetime.utcnow(),
            tree_json="{}",
            ui_state_json="{}",
        )
    row.tree_json = json.dumps(payload.tree, ensure_ascii=False)
    row.ui_state_json = json.dumps(payload.ui_state, ensure_ascii=False)
    row.updated_by = user.username
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()
    return {"ok": True}


@router.get("/diagram/layer-tree")
def get_layer_tree(
    diagram_id: Optional[uuid.UUID] = None,
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    row = session.exec(
        select(LayerTreeState).where(
            LayerTreeState.tenant_code == tenant,
            LayerTreeState.diagram_id == diagram_id,
        )
    ).first()
    if not row:
        return {"diagram_id": str(diagram_id) if diagram_id else None, "tree": {}, "ui_state": {}}
    return {
        "diagram_id": str(row.diagram_id) if row.diagram_id else None,
        "tree": _json_load(row.tree_json, {}),
        "ui_state": _json_load(row.ui_state_json, {}),
        "updated_at": row.updated_at,
        "updated_by": row.updated_by,
    }


@router.post("/diagram/property-schemas/seed-defaults")
def seed_property_schemas(
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    created = 0
    updated = 0
    for element_type, schema in DEFAULT_PROPERTY_SCHEMAS.items():
        row = session.exec(
            select(DiagramPropertySchema).where(
                DiagramPropertySchema.tenant_code == tenant,
                DiagramPropertySchema.element_type == element_type,
                DiagramPropertySchema.version == "1.0.0",
            )
        ).first()
        if row:
            row.schema_payload_json = json.dumps(schema, ensure_ascii=False)
            row.updated_at = datetime.utcnow()
            session.add(row)
            updated += 1
            continue
        session.add(
            DiagramPropertySchema(
                tenant_code=tenant,
                element_type=element_type,
                version="1.0.0",
                schema_payload_json=json.dumps(schema, ensure_ascii=False),
                is_active=True,
                created_by=user.username,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
        )
        created += 1
    session.commit()
    return {"created": created, "updated": updated}


@router.get("/diagram/property-schemas")
def list_property_schemas(
    element_type: Optional[str] = None,
    tenant_code: Optional[str] = Query(default=None),
    include_inactive: bool = False,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    stmt = select(DiagramPropertySchema).where(DiagramPropertySchema.tenant_code == tenant)
    if element_type:
        stmt = stmt.where(DiagramPropertySchema.element_type == element_type)
    if not include_inactive:
        stmt = stmt.where(DiagramPropertySchema.is_active.is_(True))
    rows = session.exec(stmt.order_by(DiagramPropertySchema.element_type.asc(), DiagramPropertySchema.updated_at.desc())).all()
    return [
        {
            "id": str(row.id),
            "element_type": row.element_type,
            "version": row.version,
            "schema": _json_load(row.schema_payload_json, {}),
            "is_active": row.is_active,
            "updated_at": row.updated_at,
        }
        for row in rows
    ]


@router.put("/diagram/property-schemas/{element_type}")
def upsert_property_schema(
    element_type: str,
    payload: PropertySchemaUpsert,
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    row = session.exec(
        select(DiagramPropertySchema).where(
            DiagramPropertySchema.tenant_code == tenant,
            DiagramPropertySchema.element_type == element_type,
            DiagramPropertySchema.version == payload.version,
        )
    ).first()
    if not row:
        row = DiagramPropertySchema(
            tenant_code=tenant,
            element_type=element_type,
            version=payload.version,
            created_by=user.username,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            schema_payload_json="{}",
            is_active=payload.is_active,
        )
    row.schema_payload_json = json.dumps(payload.schema_definition, ensure_ascii=False)
    row.is_active = payload.is_active
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()
    return {"ok": True}


@router.post("/diagram/change-log")
def create_diagram_change_log(
    payload: DiagramChangeCreate,
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    row = DiagramChangeLog(
        tenant_code=tenant,
        diagram_id=payload.diagram_id,
        object_id=payload.object_id,
        change_type=payload.change_type,
        before_json=json.dumps(payload.before, ensure_ascii=False) if payload.before is not None else None,
        after_json=json.dumps(payload.after, ensure_ascii=False) if payload.after is not None else None,
        changed_by=user.username,
        created_at=datetime.utcnow(),
    )
    session.add(row)
    session.commit()
    return {"ok": True, "id": str(row.id)}


@router.get("/diagram/change-log")
def list_diagram_change_log(
    diagram_id: Optional[uuid.UUID] = None,
    limit: int = Query(default=120, ge=1, le=1000),
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    stmt = select(DiagramChangeLog).where(DiagramChangeLog.tenant_code == tenant)
    if diagram_id:
        stmt = stmt.where(DiagramChangeLog.diagram_id == diagram_id)
    rows = session.exec(stmt.order_by(DiagramChangeLog.created_at.desc())).all()[:limit]
    return [
        {
            "id": str(row.id),
            "diagram_id": str(row.diagram_id) if row.diagram_id else None,
            "object_id": row.object_id,
            "change_type": row.change_type,
            "before": _json_load(row.before_json, None),
            "after": _json_load(row.after_json, None),
            "changed_by": row.changed_by,
            "created_at": row.created_at,
        }
        for row in rows
    ]


class SimulationScenarioCreate(BaseModel):
    name: str
    asset_id: Optional[uuid.UUID] = None
    diagram_id: Optional[uuid.UUID] = None
    mode: str = "flow"
    config: Dict[str, Any] = PydanticField(default_factory=dict)


class SimulationScenarioUpdate(BaseModel):
    name: Optional[str] = None
    mode: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class SimulationRunRequest(BaseModel):
    run_label: Optional[str] = None
    is_baseline: bool = False
    config_override: Dict[str, Any] = PydanticField(default_factory=dict)


class SimulationDecisionCreate(BaseModel):
    result_id: Optional[uuid.UUID] = None
    title: str
    notes: Optional[str] = None
    expected_impact: Dict[str, Any] = PydanticField(default_factory=dict)
    status: str = "proposed"


class SimulationDecisionUpdate(BaseModel):
    notes: Optional[str] = None
    actual_impact: Optional[Dict[str, Any]] = None
    status: Optional[str] = None


def _merge_dict(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    result = dict(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = _merge_dict(result[key], value)
        else:
            result[key] = value
    return result


def _simulation_threshold_color(ratio: float, green_threshold: float, yellow_threshold: float) -> str:
    if ratio <= green_threshold:
        return "green"
    if ratio <= yellow_threshold:
        return "yellow"
    return "red"


def _action_source_for_critical_point(scenario_id: uuid.UUID, node_id: str) -> str:
    return f"SIM:{scenario_id}:{node_id}"


def _run_simulation_calculation(
    session: Session,
    tenant_code: str,
    scenario: SimulationScenario,
    raw_config: Dict[str, Any],
) -> Dict[str, Any]:
    config = raw_config or {}
    nodes = list(config.get("nodes") or [])
    routes = list(config.get("routes") or [])
    demand_per_hour = float(config.get("demand_per_hour") or 100.0)
    hours = max(0.1, float(config.get("hours") or 8.0))
    variability_cfg = config.get("variability") or {}
    variability = max(0.0, min(float(variability_cfg.get("coefficient") or 0.1), 1.0))
    threshold_cfg = config.get("thresholds") or {}
    threshold_green = max(0.1, float(threshold_cfg.get("green") or 0.85))
    threshold_yellow = max(threshold_green + 0.01, float(threshold_cfg.get("yellow") or 1.15))

    if not nodes:
        raise HTTPException(status_code=400, detail="Simulation config requires at least one node.")

    node_metrics: List[Dict[str, Any]] = []
    bottleneck: Optional[Dict[str, Any]] = None
    total_lead_time_min = 0.0
    total_wip = 0.0

    for index, node in enumerate(nodes):
        node_id = str(node.get("id") or f"node-{index + 1}")
        label = str(node.get("label") or node.get("name") or f"Nodo {index + 1}")
        base_capacity = float(node.get("capacity_per_hour") or node.get("capacity") or 1.0)
        process_time_sec = max(1.0, float(node.get("process_time_sec") or node.get("cycle_time_sec") or 60.0))
        availability = max(0.2, min(float(node.get("availability") or 1.0), 1.2))
        phase = (index % 7) - 3
        deterministic_wave = (phase / 6.0) * variability
        effective_capacity = max(0.2, base_capacity * availability * (1.0 - deterministic_wave))
        utilization = demand_per_hour / max(effective_capacity, 0.01)
        tone = _simulation_threshold_color(utilization, threshold_green, threshold_yellow)
        throughput_hour = min(demand_per_hour, effective_capacity)
        throughput_total = throughput_hour * hours
        lead_time_min = (process_time_sec / 60.0) * (1.0 + max(0.0, utilization - 1.0) * 1.35)
        wip_units = throughput_hour * (lead_time_min / 60.0)
        compliance_pct = (throughput_hour / demand_per_hour) * 100 if demand_per_hour > 0 else 100
        metric = {
            "node_id": node_id,
            "label": label,
            "effective_capacity_per_hour": round(effective_capacity, 3),
            "utilization_ratio": round(utilization, 3),
            "throughput_per_hour": round(throughput_hour, 3),
            "throughput_total": round(throughput_total, 3),
            "lead_time_min": round(lead_time_min, 3),
            "wip_units": round(wip_units, 3),
            "compliance_pct": round(compliance_pct, 2),
            "tone": tone,
            "criticality_score": round((utilization * 100.0) + (20.0 if tone == "red" else 0.0), 2),
        }
        node_metrics.append(metric)
        total_lead_time_min += lead_time_min
        total_wip += wip_units
        if not bottleneck or metric["effective_capacity_per_hour"] < bottleneck["effective_capacity_per_hour"]:
            bottleneck = metric

    throughput_per_hour = min(metric["throughput_per_hour"] for metric in node_metrics)
    throughput_total = throughput_per_hour * hours
    compliance_pct = (throughput_per_hour / demand_per_hour) * 100 if demand_per_hour > 0 else 100

    route_metrics: List[Dict[str, Any]] = []
    for route in routes:
        from_id = str(route.get("from") or "")
        to_id = str(route.get("to") or "")
        share = float(route.get("share") or 1.0)
        from_node = next((node for node in node_metrics if node["node_id"] == from_id), None)
        to_node = next((node for node in node_metrics if node["node_id"] == to_id), None)
        if not from_node or not to_node:
            continue
        route_capacity = min(from_node["effective_capacity_per_hour"], to_node["effective_capacity_per_hour"])
        route_demand = demand_per_hour * share
        density_ratio = route_demand / max(route_capacity, 0.01)
        route_metrics.append(
            {
                "from": from_id,
                "to": to_id,
                "share": round(share, 3),
                "density_ratio": round(density_ratio, 3),
                "tone": _simulation_threshold_color(density_ratio, threshold_green, threshold_yellow),
            }
        )

    quality_open = len(
        session.exec(
            select(NonConformity).where(
                NonConformity.tenant_code == tenant_code,
                NonConformity.asset_id == scenario.asset_id if scenario.asset_id else True,
                NonConformity.status.in_(["Open", "In Progress", "Close Requested"]),
            )
        ).all()
    )
    downtime_count = len(
        session.exec(
            select(DowntimeEvent).where(
                DowntimeEvent.asset_id == scenario.asset_id if scenario.asset_id else True
            )
        ).all()
    )
    spc_specs = len(
        session.exec(
            select(WeightSamplingSpec).where(
                WeightSamplingSpec.tenant_code == tenant_code,
                WeightSamplingSpec.asset_id == scenario.asset_id if scenario.asset_id else True,
            )
        ).all()
    )

    critical_points = sorted(node_metrics, key=lambda row: row["criticality_score"], reverse=True)[:10]
    recommendations: List[Dict[str, Any]] = []
    for row in critical_points:
        if row["tone"] != "red":
            continue
        recommendations.append(
            {
                "type": "bottleneck",
                "source_module": "engineering",
                "node_id": row["node_id"],
                "message": f"Incrementar capacidad o balanceo en {row['label']} (utilización {row['utilization_ratio']:.2f}).",
                "priority": "high",
            }
        )
    if quality_open > 0:
        recommendations.append(
            {
                "type": "quality",
                "source_module": "quality",
                "message": f"Backlog NC/CAPA abierto: {quality_open}. Priorizar acciones antes de escalar volumen.",
                "priority": "high" if quality_open >= 10 else "medium",
            }
        )
    if downtime_count > 0:
        recommendations.append(
            {
                "type": "execution",
                "source_module": "execution",
                "message": f"Eventos de paro registrados: {downtime_count}. Revisar confiabilidad y mantenimiento.",
                "priority": "medium",
            }
        )
    if spc_specs == 0:
        recommendations.append(
            {
                "type": "spc_coverage",
                "source_module": "quality",
                "message": "No hay especificaciones SPC vinculadas al escenario; crear cobertura de control.",
                "priority": "medium",
            }
        )

    historical = config.get("historical") or {}
    validation = {}
    for metric_name in ("throughput_per_hour", "lead_time_min", "wip_units", "compliance_pct"):
        hist_val = historical.get(metric_name)
        if hist_val in (None, ""):
            continue
        current_val = {
            "throughput_per_hour": throughput_per_hour,
            "lead_time_min": total_lead_time_min,
            "wip_units": total_wip,
            "compliance_pct": compliance_pct,
        }[metric_name]
        diff = current_val - float(hist_val)
        validation[metric_name] = {
            "historical": round(float(hist_val), 3),
            "simulated": round(float(current_val), 3),
            "delta": round(diff, 3),
            "delta_pct": round((diff / float(hist_val) * 100.0), 3) if float(hist_val) else None,
        }

    return {
        "scenario_id": str(scenario.id),
        "mode": scenario.mode,
        "thresholds": {"green": threshold_green, "yellow": threshold_yellow},
        "inputs": {
            "demand_per_hour": demand_per_hour,
            "hours": hours,
            "variability": variability_cfg,
            "node_count": len(nodes),
            "route_count": len(routes),
        },
        "kpis": {
            "throughput_per_hour": round(throughput_per_hour, 3),
            "throughput_total": round(throughput_total, 3),
            "lead_time_min": round(total_lead_time_min, 3),
            "wip_units": round(total_wip, 3),
            "compliance_pct": round(compliance_pct, 3),
        },
        "bottleneck": bottleneck,
        "nodes": node_metrics,
        "routes": route_metrics,
        "critical_points": critical_points,
        "recommendations": recommendations,
        "integration_signals": {
            "quality_open_nc": quality_open,
            "execution_downtime_events": downtime_count,
            "spc_specifications": spc_specs,
        },
        "historical_validation": validation,
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/simulation/scenarios")
def list_simulation_scenarios(
    tenant_code: Optional[str] = Query(default=None),
    asset_id: Optional[uuid.UUID] = None,
    include_inactive: bool = False,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    stmt = select(SimulationScenario).where(SimulationScenario.tenant_code == tenant)
    if asset_id:
        stmt = stmt.where(SimulationScenario.asset_id == asset_id)
    if not include_inactive:
        stmt = stmt.where(SimulationScenario.is_active.is_(True))
    rows = session.exec(stmt.order_by(SimulationScenario.updated_at.desc())).all()
    return [
        {
            "id": str(row.id),
            "name": row.name,
            "asset_id": str(row.asset_id) if row.asset_id else None,
            "diagram_id": str(row.diagram_id) if row.diagram_id else None,
            "mode": row.mode,
            "is_active": row.is_active,
            "updated_at": row.updated_at,
        }
        for row in rows
    ]


@router.post("/simulation/scenarios")
def create_simulation_scenario(
    payload: SimulationScenarioCreate,
    tenant_code: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    tenant = _tenant_scope(get_tenant_code(user), tenant_code)
    row = SimulationScenario(
        tenant_code=tenant,
        name=payload.name,
        asset_id=payload.asset_id,
        diagram_id=payload.diagram_id,
        mode=payload.mode,
        config_json=json.dumps(payload.config, ensure_ascii=False),
        is_active=True,
        created_by=user.username,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"id": str(row.id)}


@router.patch("/simulation/scenarios/{scenario_id}")
def update_simulation_scenario(
    scenario_id: uuid.UUID,
    payload: SimulationScenarioUpdate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    row = session.get(SimulationScenario, scenario_id)
    if not row:
        raise HTTPException(status_code=404, detail="Scenario not found.")
    data = payload.model_dump(exclude_unset=True)
    if "config" in data:
        row.config_json = json.dumps(data.pop("config"), ensure_ascii=False)
    for key, value in data.items():
        setattr(row, key, value)
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()
    return {"ok": True}


@router.delete("/simulation/scenarios/{scenario_id}", status_code=204)
def delete_simulation_scenario(
    scenario_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    row = session.get(SimulationScenario, scenario_id)
    if not row:
        raise HTTPException(status_code=404, detail="Scenario not found.")
    row.is_active = False
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()


@router.post("/simulation/scenarios/{scenario_id}/run")
def run_simulation_scenario(
    scenario_id: uuid.UUID,
    payload: SimulationRunRequest,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    scenario = session.get(SimulationScenario, scenario_id)
    if not scenario or not scenario.is_active:
        raise HTTPException(status_code=404, detail="Scenario not found.")
    base_config = _json_load(scenario.config_json, {})
    run_config = _merge_dict(base_config, payload.config_override)
    result_data = _run_simulation_calculation(session, scenario.tenant_code, scenario, run_config)
    run = SimulationScenarioResult(
        scenario_id=scenario.id,
        run_label=payload.run_label,
        is_baseline=payload.is_baseline,
        input_json=json.dumps(run_config, ensure_ascii=False),
        result_json=json.dumps(result_data, ensure_ascii=False),
        created_by=user.username,
        created_at=datetime.utcnow(),
    )
    session.add(run)
    scenario.updated_at = datetime.utcnow()
    session.add(scenario)
    _log_integration_event(
        session=session,
        tenant_code=scenario.tenant_code,
        module="diagram",
        event_code="diagram.simulation.executed",
        severity="warn" if result_data["kpis"]["compliance_pct"] < 95 else "info",
        status="ok",
        payload={
            "scenario_id": str(scenario.id),
            "run_label": payload.run_label,
            "compliance_pct": result_data["kpis"]["compliance_pct"],
            "critical_points": len(result_data["critical_points"]),
        },
        source="platform.simulation",
        created_by=user.username,
    )
    session.commit()
    session.refresh(run)
    return {"run_id": str(run.id), "scenario_id": str(scenario.id), "result": result_data}


@router.get("/simulation/scenarios/{scenario_id}/results")
def list_simulation_results(
    scenario_id: uuid.UUID,
    limit: int = Query(default=40, ge=1, le=500),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    scenario = session.get(SimulationScenario, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found.")
    rows = session.exec(
        select(SimulationScenarioResult)
        .where(SimulationScenarioResult.scenario_id == scenario_id)
        .order_by(SimulationScenarioResult.created_at.desc())
    ).all()[:limit]
    return [
        {
            "id": str(row.id),
            "run_label": row.run_label,
            "is_baseline": row.is_baseline,
            "input": _json_load(row.input_json, {}),
            "result": _json_load(row.result_json, {}),
            "created_by": row.created_by,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.get("/simulation/scenarios/{scenario_id}/compare")
def compare_simulation_results(
    scenario_id: uuid.UUID,
    left_result_id: Optional[uuid.UUID] = None,
    right_result_id: Optional[uuid.UUID] = None,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    rows = session.exec(
        select(SimulationScenarioResult)
        .where(SimulationScenarioResult.scenario_id == scenario_id)
        .order_by(SimulationScenarioResult.created_at.desc())
    ).all()
    if len(rows) < 2 and (not left_result_id or not right_result_id):
        raise HTTPException(status_code=400, detail="At least two results are required for comparison.")
    left = next((row for row in rows if row.id == left_result_id), None) if left_result_id else rows[1]
    right = next((row for row in rows if row.id == right_result_id), None) if right_result_id else rows[0]
    if not left or not right:
        raise HTTPException(status_code=404, detail="Result pair not found.")
    left_result = _json_load(left.result_json, {})
    right_result = _json_load(right.result_json, {})
    left_kpi = left_result.get("kpis", {})
    right_kpi = right_result.get("kpis", {})
    metrics = ["throughput_per_hour", "throughput_total", "lead_time_min", "wip_units", "compliance_pct"]
    comparison = []
    for key in metrics:
        left_val = float(left_kpi.get(key) or 0.0)
        right_val = float(right_kpi.get(key) or 0.0)
        delta = right_val - left_val
        comparison.append(
            {
                "metric": key,
                "left": round(left_val, 3),
                "right": round(right_val, 3),
                "delta": round(delta, 3),
                "delta_pct": round((delta / left_val * 100.0), 3) if left_val else None,
            }
        )
    return {
        "scenario_id": str(scenario_id),
        "left_result_id": str(left.id),
        "right_result_id": str(right.id),
        "comparison": comparison,
        "recommendations": right_result.get("recommendations", []),
    }


@router.post("/simulation/scenarios/{scenario_id}/actions/sync")
def sync_simulation_actions(
    scenario_id: uuid.UUID,
    result_id: Optional[uuid.UUID] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    scenario = session.get(SimulationScenario, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found.")
    result = (
        session.get(SimulationScenarioResult, result_id)
        if result_id
        else session.exec(
            select(SimulationScenarioResult)
            .where(SimulationScenarioResult.scenario_id == scenario_id)
            .order_by(SimulationScenarioResult.created_at.desc())
        ).first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="Simulation result not found.")
    payload = _json_load(result.result_json, {})
    critical_points = payload.get("critical_points") or []
    created = 0
    updated = 0
    for point in critical_points:
        if point.get("tone") != "red":
            continue
        node_id = str(point.get("node_id") or "")
        if not node_id:
            continue
        source_document = _action_source_for_critical_point(scenario_id, node_id)
        action = session.exec(
            select(ImprovementAction).where(
                ImprovementAction.tenant_code == scenario.tenant_code,
                ImprovementAction.source_document == source_document,
            )
        ).first()
        description = (
            f"[Simulación] Nodo crítico {point.get('label')}: "
            f"utilización {point.get('utilization_ratio')} y capacidad efectiva {point.get('effective_capacity_per_hour')}."
        )
        if action:
            action.description = description
            action.status = "Open"
            action.completion_date = None
            session.add(action)
            updated += 1
            continue
        session.add(
            ImprovementAction(
                tenant_code=scenario.tenant_code,
                asset_id=scenario.asset_id,
                source_document=source_document,
                description=description,
                responsible=user.username,
                due_date=datetime.utcnow().date(),
                status="Open",
                completion_date=None,
            )
        )
        created += 1
    session.commit()
    return {"created": created, "updated": updated}


@router.get("/simulation/scenarios/{scenario_id}/export/executive")
def export_simulation_executive(
    scenario_id: uuid.UUID,
    result_id: Optional[uuid.UUID] = Query(default=None),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    scenario = session.get(SimulationScenario, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found.")
    result = (
        session.get(SimulationScenarioResult, result_id)
        if result_id
        else session.exec(
            select(SimulationScenarioResult)
            .where(SimulationScenarioResult.scenario_id == scenario_id)
            .order_by(SimulationScenarioResult.created_at.desc())
        ).first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="Simulation result not found.")
    data = _json_load(result.result_json, {})
    kpis = data.get("kpis", {})
    summary_lines = [
        f"Escenario: {scenario.name}",
        f"Throughput: {kpis.get('throughput_per_hour', 0)} u/h",
        f"Lead time: {kpis.get('lead_time_min', 0)} min",
        f"WIP estimado: {kpis.get('wip_units', 0)} unidades",
        f"Cumplimiento: {kpis.get('compliance_pct', 0)}%",
        f"Puntos críticos: {len(data.get('critical_points', []))}",
        f"Recomendaciones: {len(data.get('recommendations', []))}",
    ]
    return {
        "scenario_id": str(scenario_id),
        "result_id": str(result.id),
        "summary": "\n".join(summary_lines),
        "kpis": kpis,
        "critical_points": data.get("critical_points", []),
        "recommendations": data.get("recommendations", []),
        "integration_signals": data.get("integration_signals", {}),
        "historical_validation": data.get("historical_validation", {}),
    }


@router.post("/simulation/scenarios/{scenario_id}/decisions")
def create_simulation_decision(
    scenario_id: uuid.UUID,
    payload: SimulationDecisionCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    scenario = session.get(SimulationScenario, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found.")
    row = SimulationDecision(
        scenario_id=scenario_id,
        result_id=payload.result_id,
        title=payload.title,
        notes=payload.notes,
        expected_impact_json=json.dumps(payload.expected_impact, ensure_ascii=False),
        actual_impact_json=json.dumps({}, ensure_ascii=False),
        status=payload.status,
        created_by=user.username,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"id": str(row.id)}


@router.get("/simulation/scenarios/{scenario_id}/decisions")
def list_simulation_decisions(
    scenario_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    rows = session.exec(
        select(SimulationDecision)
        .where(SimulationDecision.scenario_id == scenario_id)
        .order_by(SimulationDecision.updated_at.desc())
    ).all()
    return [
        {
            "id": str(row.id),
            "result_id": str(row.result_id) if row.result_id else None,
            "title": row.title,
            "notes": row.notes,
            "expected_impact": _json_load(row.expected_impact_json, {}),
            "actual_impact": _json_load(row.actual_impact_json, {}),
            "status": row.status,
            "created_by": row.created_by,
            "updated_at": row.updated_at,
        }
        for row in rows
    ]


@router.patch("/simulation/decisions/{decision_id}")
def update_simulation_decision(
    decision_id: uuid.UUID,
    payload: SimulationDecisionUpdate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    row = session.get(SimulationDecision, decision_id)
    if not row:
        raise HTTPException(status_code=404, detail="Decision not found.")
    data = payload.model_dump(exclude_unset=True)
    if "actual_impact" in data:
        row.actual_impact_json = json.dumps(data.pop("actual_impact"), ensure_ascii=False)
    for key, value in data.items():
        setattr(row, key, value)
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()
    return {"ok": True}




