"""
Template ingest helpers.

Provides idempotent upsert from templates/ie_formats into FormatTemplate table.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List

from sqlmodel import Session, select

from ..models import FormatTemplate


def get_templates_dir() -> Path:
    # backend/app/services/template_ingest.py -> ... -> project_root/templates/ie_formats
    project_root = Path(__file__).resolve().parent.parent.parent.parent
    return project_root / "templates" / "ie_formats"


CONTEXT_MARKER = "## Contexto Integrado Takta"


def build_relation_schema(category: str, code: str) -> Dict[str, object]:
    return {
        "version": "1.0",
        "template_code": code,
        "category": category,
        "context_fields": [
            "source_module",
            "asset_id",
            "asset_name",
            "reference_id",
            "reference_code",
            "activity_id",
            "activity_name",
            "standard_id",
            "study_id",
            "action_id",
            "audit_id",
            "kanban_id",
            "layout_id",
            "meeting_id",
            "meeting_title",
        ],
        "relationships": [
            {"from_module": "assets", "to_module": "engineering", "through": "asset_id"},
            {"from_module": "engineering", "to_module": "timing", "through": "standard_id"},
            {"from_module": "timing", "to_module": "engineering", "through": "study_id"},
            {"from_module": "excellence", "to_module": "assets", "through": "action_id|audit_id"},
            {"from_module": "excellence", "to_module": "logistics", "through": "kanban_id"},
            {"from_module": "meetings", "to_module": "excellence", "through": "meeting_id|action_id"},
            {"from_module": "meetings", "to_module": "engineering", "through": "meeting_id|standard_id"},
            {"from_module": "plant_editor", "to_module": "assets", "through": "layout_id|asset_id"},
            {"from_module": "documents", "to_module": "all", "through": "context_fields"},
        ],
    }


def build_context_markdown() -> str:
    return """
## Contexto Integrado Takta

> Completa o valida esta sección al crear el documento para conservar trazabilidad entre módulos.

| Campo | Valor |
|---|---|
| Módulo origen | {{source_module}} |
| Activo ID | {{asset_id}} |
| Activo | {{asset_name}} |
| SKU ID | {{reference_id}} |
| SKU | {{reference_code}} |
| Actividad ID | {{activity_id}} |
| Actividad | {{activity_name}} |
| Estándar ID | {{standard_id}} |
| Estudio de tiempos ID | {{study_id}} |
| Acción CI ID | {{action_id}} |
| Auditoría ID | {{audit_id}} |
| Loop Kanban ID | {{kanban_id}} |
| Layout/Diagrama ID | {{layout_id}} |
| Acta ID | {{meeting_id}} |
| Acta | {{meeting_title}} |

### Interrelación operativa

- Activos ↔ Ingeniería: estructura física y contexto de proceso.
- Ingeniería ↔ Cronómetro: calibración de tiempos estándar y capacidad.
- Cronómetro ↔ Ejecución: validación en piso y retroalimentación operacional.
- Excelencia ↔ Activos/Ingeniería: acciones y auditorías con trazabilidad.
- Actas ↔ Todos los módulos: decisiones, compromisos y cierre semanal.
- Kanban ↔ Ingeniería/Ejecución: demanda, contenedores y flujo de reposición.
- Editor Docs ↔ Todos los módulos: centraliza evidencia y diagnóstico.
""".strip()


def enrich_template_content(content: str) -> str:
    if CONTEXT_MARKER in content:
        return content
    return f"{content.rstrip()}\n\n---\n\n{build_context_markdown()}\n"


def ingest_templates_from_disk(
    session: Session,
    *,
    only_if_empty: bool = False,
) -> Dict[str, object]:
    """
    Upserts markdown templates from disk into FormatTemplate.

    Returns:
        {
          "created": int,
          "updated": int,
          "errors": list[str],
          "skipped": bool,
        }
    """
    existing_count = len(session.exec(select(FormatTemplate.id)).all())
    if only_if_empty and existing_count > 0:
        return {"created": 0, "updated": 0, "errors": [], "skipped": True}

    formats_dir = get_templates_dir()
    if not formats_dir.exists() or not formats_dir.is_dir():
        raise FileNotFoundError(f"Templates directory not found at {formats_dir}")

    created = 0
    updated = 0
    errors: List[str] = []

    for filepath in formats_dir.rglob("*.md"):
        try:
            content = filepath.read_text(encoding="utf-8")
            category = filepath.parent.name
            code = filepath.stem

            name = code
            for line in content.splitlines():
                if line.startswith("# "):
                    name = line[2:].strip()
                    break

            enriched_content = enrich_template_content(content)
            schema_json = json.dumps(build_relation_schema(category, code), ensure_ascii=False)

            existing = session.exec(
                select(FormatTemplate).where(FormatTemplate.code == code)
            ).first()

            if existing:
                existing.name = name
                existing.category = category
                existing.markdown_structure = enriched_content
                existing.json_schema_structure = schema_json
                session.add(existing)
                updated += 1
            else:
                session.add(
                    FormatTemplate(
                        code=code,
                        name=name,
                        category=category,
                        markdown_structure=enriched_content,
                        json_schema_structure=schema_json,
                    )
                )
                created += 1
        except Exception as exc:
            errors.append(f"Error processing {filepath.name}: {exc}")

    session.commit()
    return {"created": created, "updated": updated, "errors": errors, "skipped": False}
