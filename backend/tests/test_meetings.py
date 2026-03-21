"""
Tests for engineering meetings endpoints: /api/meetings.
"""

from datetime import date, timedelta


def _create_asset(client, auth_headers, name="Planta Meetings", type_="Planta"):
    response = client.post(
        "/api/assets",
        json={"name": name, "type": type_},
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()


def test_meeting_create_and_list(client, auth_headers):
    asset = _create_asset(client, auth_headers)
    today = date.today()

    create_resp = client.post(
        "/api/meetings/records",
        json={
            "asset_id": asset["id"],
            "title": "Arranque semanal IP",
            "meeting_date": today.isoformat(),
            "start_time": "07:30",
            "end_time": "09:00",
            "location": "Teams",
            "objective": "Alinear KPIs y compromisos",
            "scope": "IP + Operaciones",
            "status": "Open",
            "participants": [{"name": "Diego", "role": "Lider"}],
            "agenda": [{"order": 1, "title": "Revision KPIs"}],
            "kpis": [{"objective": "Ahorros OPAV", "weight_pct": 10, "target_value": 800000000, "unit": "COP"}],
            "focuses": [{"focus": "Cargar KPIs 2026", "responsible": "Todos"}],
            "commitments": [
                {"description": "Cargar KPIs en sistema", "responsible": "Todos", "due_date": today.isoformat(), "status": "Open"}
            ],
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 200
    created = create_resp.json()
    assert created["title"] == "Arranque semanal IP"
    assert created["open_commitments"] == 1

    list_resp = client.get("/api/meetings/records", headers=auth_headers)
    assert list_resp.status_code == 200
    rows = list_resp.json()
    assert len(rows) >= 1
    assert rows[0]["title"] == "Arranque semanal IP"


def test_materialize_commitments_to_actions(client, auth_headers):
    asset = _create_asset(client, auth_headers, name="Area Empaque", type_="Area")
    due = date.today() + timedelta(days=2)
    created = client.post(
        "/api/meetings/records",
        json={
            "asset_id": asset["id"],
            "title": "Seguimiento semana 1",
            "meeting_date": date.today().isoformat(),
            "status": "Open",
            "commitments": [
                {"description": "Actualizar matriz de tiempos", "responsible": "Analista 1", "due_date": due.isoformat(), "status": "Open"},
                {"description": "Definir focos SST", "responsible": "Analista 2", "status": "Open"},
            ],
        },
        headers=auth_headers,
    ).json()

    sync_resp = client.post(
        f"/api/meetings/records/{created['id']}/materialize-actions",
        json={"force": False, "default_due_days": 5},
        headers=auth_headers,
    )
    assert sync_resp.status_code == 200
    payload = sync_resp.json()
    assert payload["created_actions"] == 2
    assert payload["errors_count"] == 0
    assert all(item.get("action_id") for item in payload["commitments"])

    actions_resp = client.get("/api/ci/actions", headers=auth_headers)
    assert actions_resp.status_code == 200
    meeting_actions = [a for a in actions_resp.json() if str(a["source_document"]).startswith("MEETING:")]
    assert len(meeting_actions) >= 2


def test_meeting_comparison(client, auth_headers):
    base_date = date.today()
    prev = client.post(
        "/api/meetings/records",
        json={
            "title": "Semana 1",
            "meeting_date": (base_date - timedelta(days=7)).isoformat(),
            "status": "Open",
            "commitments": [
                {"description": "Cerrar brecha de setup", "responsible": "Ana", "status": "Open"},
                {"description": "Actualizar SOP", "responsible": "Juan", "status": "Open"},
            ],
        },
        headers=auth_headers,
    ).json()

    current = client.post(
        "/api/meetings/records",
        json={
            "title": "Semana 2",
            "meeting_date": base_date.isoformat(),
            "status": "Open",
            "commitments": [
                {"description": "Cerrar brecha de setup", "responsible": "Ana", "status": "In Progress"},
                {"description": "Actualizar SOP", "responsible": "Juan", "status": "Closed"},
                {"description": "Crear backup ICUT", "responsible": "Carlos", "status": "Open"},
            ],
        },
        headers=auth_headers,
    ).json()

    comp_resp = client.get(
        f"/api/meetings/records/{current['id']}/comparison?previous_meeting_id={prev['id']}",
        headers=auth_headers,
    )
    assert comp_resp.status_code == 200
    comparison = comp_resp.json()
    assert len(comparison["carried_over"]) == 1
    assert len(comparison["closed_since_last"]) == 1
    assert len(comparison["new_commitments"]) == 1


def test_meeting_heuristic_import(client, auth_headers):
    sample_text = """
Fecha 3 de marzo de 2026
Titulo de la reunion
Arranque Semanal - Ingenieria de Procesos
Objetivo
Definir focos de trabajo y compromisos
ORDEN DEL DIA
1. Revision de KPIs
2. Estandarizacion de procesos criticos
FOCOS PRINCIPALES DE LA SEMANA
1 Cargar KPIs 2026          Todos
COMPROMISOS PARA LA PROXIMA SEMANA
1. Diego: Construir matriz de priorizacion
2. Todos: Definir plan de formacion
PROXIMA REUNION
Fecha: 17 de marzo de 2026
"""
    response = client.post(
        "/api/meetings/import/heuristic",
        json={"raw_text": sample_text, "default_title": "Acta de prueba"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["draft"]["title"] == "Arranque Semanal - Ingenieria de Procesos"
    assert len(payload["draft"]["agenda"]) == 2
    assert len(payload["draft"]["commitments"]) == 2


def test_delete_meeting(client, auth_headers):
    created = client.post(
        "/api/meetings/records",
        json={
            "title": "Acta temporal",
            "meeting_date": date.today().isoformat(),
            "status": "Draft",
        },
        headers=auth_headers,
    )
    assert created.status_code == 200
    meeting_id = created.json()["id"]

    delete_resp = client.delete(f"/api/meetings/records/{meeting_id}", headers=auth_headers)
    assert delete_resp.status_code == 204

    get_resp = client.get(f"/api/meetings/records/{meeting_id}", headers=auth_headers)
    assert get_resp.status_code == 404


def test_meeting_create_rejects_invalid_commitment_action(client, auth_headers):
    response = client.post(
        "/api/meetings/records",
        json={
            "title": "Acta con accion invalida",
            "meeting_date": date.today().isoformat(),
            "status": "Draft",
            "commitments": [
                {
                    "description": "Validar accion",
                    "responsible": "QA",
                    "action_id": "11111111-1111-1111-1111-111111111111",
                    "status": "Open",
                }
            ],
        },
        headers=auth_headers,
    )
    assert response.status_code == 404
    assert "linked action not found" in response.json()["detail"]


def test_meeting_dashboard_includes_kpi_mc_summary(client, auth_headers):
    catalog_resp = client.get("/api/ci/kpis/mc/catalog", headers=auth_headers)
    assert catalog_resp.status_code == 200
    catalog = catalog_resp.json()
    assert len(catalog) >= 1
    kpi = catalog[0]

    upsert_prev_resp = client.put(
        "/api/ci/kpis/mc/measurements",
        json={
            "kpi_definition_id": kpi["id"],
            "period": "2026-02",
            "compliance_pct": 70,
        },
        headers=auth_headers,
    )
    assert upsert_prev_resp.status_code == 200

    upsert_current_resp = client.put(
        "/api/ci/kpis/mc/measurements",
        json={
            "kpi_definition_id": kpi["id"],
            "period": "2026-03",
            "compliance_pct": 95,
        },
        headers=auth_headers,
    )
    assert upsert_current_resp.status_code == 200

    dashboard_resp = client.get("/api/meetings/dashboard", headers=auth_headers)
    assert dashboard_resp.status_code == 200
    dashboard = dashboard_resp.json()
    assert "kpi_mc_period" in dashboard
    assert "kpi_mc_completion_rate_pct" in dashboard
    assert "kpi_mc_weighted_kpi_result_pct" in dashboard
    assert "kpi_mc_red_items" in dashboard
    assert "kpi_mc_previous_period" in dashboard
    assert "kpi_mc_previous_weighted_kpi_result_pct" in dashboard
    assert "kpi_mc_weighted_kpi_result_delta_pct" in dashboard
    assert "kpi_mc_completion_rate_delta_pct" in dashboard
    assert "kpi_mc_red_items_delta" in dashboard
    assert "kpi_mc_target_pct" in dashboard
    assert "kpi_mc_gap_to_target_pct" in dashboard
    assert "kpi_mc_trend_alert_level" in dashboard
    assert "kpi_mc_trend_alert_message" in dashboard
    assert "kpi_mc_trend_recommended_action" in dashboard
    assert "quality_non_conformities_open" in dashboard
    assert "quality_non_conformities_critical" in dashboard
    assert "quality_capa_open" in dashboard
    assert "quality_capa_overdue" in dashboard

    assert dashboard["kpi_mc_period"] == "2026-03"
    assert dashboard["kpi_mc_previous_period"] == "2026-02"
    assert dashboard["kpi_mc_weighted_kpi_result_delta_pct"] is not None
    assert dashboard["kpi_mc_target_pct"] == 95.0


def test_meeting_quality_issues_and_sync_commitments(client, auth_headers):
    asset = _create_asset(client, auth_headers, name="Planta Calidad", type_="Planta")

    activity = client.post(
        "/api/engineering/activities/",
        json={"name": "Pesaje", "type": "Inspection", "is_value_added": True},
        headers=auth_headers,
    ).json()
    reference = client.post(
        "/api/engineering/references/",
        json={"code": "M-QA-001", "description": "SKU QA", "family": "QA", "uom": "g", "packaging_uom": "caja"},
        headers=auth_headers,
    ).json()
    standard = client.post(
        "/api/engineering/standards/",
        json={
            "asset_id": asset["id"],
            "activity_id": activity["id"],
            "product_reference_id": reference["id"],
            "standard_time_minutes": 1.5,
            "frequency": "Per unit",
        },
        headers=auth_headers,
    ).json()

    spec = client.post(
        "/api/quality/weight-specs",
        json={
            "name": "Spec Meetings QA",
            "asset_id": asset["id"],
            "product_reference_id": reference["id"],
            "process_standard_id": standard["id"],
            "unit": "g",
            "lower_limit": 95.0,
            "target_weight": 100.0,
            "upper_limit": 105.0,
        },
        headers=auth_headers,
    ).json()
    sample = client.post(
        f"/api/quality/weight-specs/{spec['id']}/samples",
        json={"measured_value": 108.0, "measured_by": "meet.qa", "auto_create_non_conformity": False},
        headers=auth_headers,
    ).json()
    nc = client.post(
        "/api/quality/non-conformities",
        json={
            "asset_id": asset["id"],
            "product_reference_id": reference["id"],
            "process_standard_id": standard["id"],
            "weight_specification_id": spec["id"],
            "weight_sample_id": sample["id"],
            "source": "manual",
            "severity": "critical",
            "title": "NC reuniones",
            "description": "Desvio relevante",
        },
        headers=auth_headers,
    ).json()
    capa = client.post(
        f"/api/quality/non-conformities/{nc['id']}/capa-actions",
        json={
            "action_type": "Corrective",
            "title": "Ajustar balanza QA",
            "responsible": "Supervisor QA",
            "status": "Open",
            "auto_link_improvement_action": True,
        },
        headers=auth_headers,
    ).json()

    meeting = client.post(
        "/api/meetings/records",
        json={
            "asset_id": asset["id"],
            "title": "Acta calidad",
            "meeting_date": date.today().isoformat(),
            "status": "Open",
        },
        headers=auth_headers,
    ).json()

    issues_resp = client.get(
        f"/api/meetings/quality/issues?asset_id={asset['id']}",
        headers=auth_headers,
    )
    assert issues_resp.status_code == 200
    issues = issues_resp.json()
    assert any(item["issue_type"] == "non_conformity" for item in issues)
    assert any(item["issue_type"] == "capa_action" for item in issues)

    sync_resp = client.post(
        f"/api/meetings/records/{meeting['id']}/sync-quality-commitments",
        headers=auth_headers,
    )
    assert sync_resp.status_code == 200
    sync_payload = sync_resp.json()
    assert sync_payload["created_commitments"] >= 1
    assert sync_payload["total_commitments"] >= 1

    updated_meeting = client.get(f"/api/meetings/records/{meeting['id']}", headers=auth_headers).json()
    descriptions = [item["description"] for item in updated_meeting["commitments"]]
    assert any("Ajustar balanza QA" in row for row in descriptions)

    dashboard = client.get("/api/meetings/dashboard", headers=auth_headers).json()
    assert dashboard["quality_non_conformities_open"] >= 1
    assert dashboard["quality_capa_open"] >= 1
