"""
Tests for excellence endpoints: /api/ci, /api/audits, /api/logistics.
"""
from datetime import datetime, timedelta


def _create_asset(client, auth_headers, name, type_="Area"):
    response = client.post(
        "/api/assets",
        json={"name": name, "type": type_},
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()


def test_ci_actions_flow(client, auth_headers):
    asset = _create_asset(client, auth_headers, "Area Calidad")

    create_resp = client.post(
        "/api/ci/actions",
        json={
            "asset_id": asset["id"],
            "source_document": "AUD-5S-001",
            "description": "Estandarizar limpieza de zona",
            "responsible": "Supervisor A",
            "status": "Open",
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 200
    action_id = create_resp.json()["id"]

    update_resp = client.patch(
        f"/api/ci/actions/{action_id}",
        json={"status": "Closed"},
        headers=auth_headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "Closed"


def test_audits_flow_with_auto_actions(client, auth_headers):
    asset = _create_asset(client, auth_headers, "Linea Auditoria", "Linea")

    resp = client.post(
        "/api/audits",
        json={
            "asset_id": asset["id"],
            "type": "5S",
            "auditor": "Ing. QA",
            "auto_create_actions": True,
            "action_threshold": 2,
            "action_responsible": "Lider 5S",
            "scores": [
                {"category": "Seiri", "question_text": "Clasificacion", "score_value": 4},
                {"category": "Seiton", "question_text": "Orden", "score_value": 2},
                {"category": "Seiso", "question_text": "Limpieza", "score_value": 1},
            ],
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_score"] == 7
    assert data["max_possible_score"] == 15
    assert data["compliance_pct"] == 46.7
    assert data["actions_created"] == 2

    actions_resp = client.get("/api/ci/actions", headers=auth_headers)
    assert actions_resp.status_code == 200
    audit_actions = [a for a in actions_resp.json() if str(a["source_document"]).startswith("AUDIT:")]
    assert len(audit_actions) == 2


def test_audit_radar_comparison(client, auth_headers):
    asset = _create_asset(client, auth_headers, "Area 5S Radar", "Area")

    now = datetime.utcnow()
    prev = now - timedelta(days=35)

    current_payload = {
        "asset_id": asset["id"],
        "type": "5S",
        "auditor": "Auditor Actual",
        "audit_date": now.isoformat(),
        "scores": [
            {"category": "Seiri", "question_text": "Q1", "score_value": 4},
            {"category": "Seiton", "question_text": "Q2", "score_value": 5},
        ],
    }
    previous_payload = {
        "asset_id": asset["id"],
        "type": "5S",
        "auditor": "Auditor Prev",
        "audit_date": prev.isoformat(),
        "scores": [
            {"category": "Seiri", "question_text": "Q1", "score_value": 2},
            {"category": "Seiton", "question_text": "Q2", "score_value": 3},
        ],
    }

    assert client.post("/api/audits", json=current_payload, headers=auth_headers).status_code == 200
    assert client.post("/api/audits", json=previous_payload, headers=auth_headers).status_code == 200

    radar_resp = client.get(
        f"/api/audits/radar/comparison?asset_id={asset['id']}&audit_type=5S",
        headers=auth_headers,
    )
    assert radar_resp.status_code == 200
    radar = radar_resp.json()
    assert "current_month" in radar
    assert "previous_month" in radar
    assert len(radar["categories"]) >= 2


def test_kanban_flow(client, auth_headers):
    origin = _create_asset(client, auth_headers, "Bodega MP", "Area")
    dest = _create_asset(client, auth_headers, "Linea Empaque", "Linea")

    calc_resp = client.post(
        "/api/logistics/kanban/calculate",
        json={
            "sku_code": "SKU-TEST-01",
            "asset_origin_id": origin["id"],
            "asset_dest_id": dest["id"],
            "container_capacity": 50,
            "daily_demand": 800,
            "lead_time_days": 1.5,
            "safety_stock_pct": 0.15,
        },
        headers=auth_headers,
    )
    assert calc_resp.status_code == 200
    assert calc_resp.json()["calculated_cards"] > 0

    list_resp = client.get("/api/logistics/kanban/loops", headers=auth_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1


def test_kanban_rejects_same_origin_and_destination(client, auth_headers):
    asset = _create_asset(client, auth_headers, "Area Unica", "Area")
    response = client.post(
        "/api/logistics/kanban/calculate",
        json={
            "sku_code": "SKU-SAME",
            "asset_origin_id": asset["id"],
            "asset_dest_id": asset["id"],
            "container_capacity": 40,
            "daily_demand": 250,
            "lead_time_days": 1.0,
            "safety_stock_pct": 0.1,
        },
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Origin and destination assets must be different"


def test_delete_ci_action(client, auth_headers):
    asset = _create_asset(client, auth_headers, "Area Delete Action")
    created = client.post(
        "/api/ci/actions",
        json={
            "asset_id": asset["id"],
            "source_document": "MANUAL-DELETE",
            "description": "Eliminar accion de prueba",
            "responsible": "Owner",
            "status": "Open",
        },
        headers=auth_headers,
    )
    assert created.status_code == 200
    action_id = created.json()["id"]

    delete_resp = client.delete(f"/api/ci/actions/{action_id}", headers=auth_headers)
    assert delete_resp.status_code == 204

    rows = client.get("/api/ci/actions", headers=auth_headers).json()
    assert all(row["id"] != action_id for row in rows)


def test_ci_actions_filter_by_source_prefix(client, auth_headers):
    asset = _create_asset(client, auth_headers, "Area Source Filter")
    payloads = [
        {
            "asset_id": asset["id"],
            "source_document": "KPI_MC:2026-03:MC-GV-01",
            "description": "Accion KPI 1",
            "responsible": "Owner 1",
            "status": "Open",
        },
        {
            "asset_id": asset["id"],
            "source_document": "KPI_MC:2026-03:MC-EO-01",
            "description": "Accion KPI 2",
            "responsible": "Owner 2",
            "status": "Open",
        },
        {
            "asset_id": asset["id"],
            "source_document": "AUDIT:2026-03:5S-01",
            "description": "Accion Audit",
            "responsible": "Owner 3",
            "status": "Open",
        },
    ]
    for payload in payloads:
        created = client.post("/api/ci/actions", json=payload, headers=auth_headers)
        assert created.status_code == 200

    prefix_resp = client.get(
        "/api/ci/actions?source_prefix=KPI_MC:2026-03:",
        headers=auth_headers,
    )
    assert prefix_resp.status_code == 200
    prefix_rows = prefix_resp.json()
    assert len(prefix_rows) == 2
    assert all(str(row["source_document"]).startswith("KPI_MC:2026-03:") for row in prefix_rows)

    exact_resp = client.get(
        "/api/ci/actions?source_document=KPI_MC:2026-03:MC-GV-01",
        headers=auth_headers,
    )
    assert exact_resp.status_code == 200
    exact_rows = exact_resp.json()
    assert len(exact_rows) == 1
    assert exact_rows[0]["source_document"] == "KPI_MC:2026-03:MC-GV-01"


def test_delete_audit_and_linked_actions(client, auth_headers):
    asset = _create_asset(client, auth_headers, "Area Delete Audit")
    created = client.post(
        "/api/audits",
        json={
            "asset_id": asset["id"],
            "type": "5S",
            "auditor": "Ing Delete",
            "auto_create_actions": True,
            "action_threshold": 3,
            "scores": [
                {"category": "Seiri", "question_text": "Clasificacion", "score_value": 2},
                {"category": "Seiton", "question_text": "Orden", "score_value": 2},
            ],
        },
        headers=auth_headers,
    )
    assert created.status_code == 200
    audit = created.json()
    audit_id = audit["id"]

    delete_resp = client.delete(f"/api/audits/{audit_id}", headers=auth_headers)
    assert delete_resp.status_code == 204

    detail_resp = client.get(f"/api/audits/{audit_id}", headers=auth_headers)
    assert detail_resp.status_code == 404

    actions = client.get("/api/ci/actions", headers=auth_headers).json()
    assert all(action["source_document"] != f"AUDIT:{audit_id}" for action in actions)


def test_delete_kanban_loop(client, auth_headers):
    origin = _create_asset(client, auth_headers, "Origin Delete", "Area")
    dest = _create_asset(client, auth_headers, "Dest Delete", "Linea")
    created = client.post(
        "/api/logistics/kanban/calculate",
        json={
            "sku_code": "SKU-DELETE",
            "asset_origin_id": origin["id"],
            "asset_dest_id": dest["id"],
            "container_capacity": 30,
            "daily_demand": 300,
            "lead_time_days": 1.2,
            "safety_stock_pct": 0.1,
        },
        headers=auth_headers,
    )
    assert created.status_code == 200
    loop_id = created.json()["id"]

    delete_resp = client.delete(f"/api/logistics/kanban/loops/{loop_id}", headers=auth_headers)
    assert delete_resp.status_code == 204

    loops = client.get("/api/logistics/kanban/loops", headers=auth_headers).json()
    assert all(loop["id"] != loop_id for loop in loops)


def test_mc_kpi_catalog_and_scorecard_seed(client, auth_headers):
    catalog_resp = client.get("/api/ci/kpis/mc/catalog", headers=auth_headers)
    assert catalog_resp.status_code == 200
    catalog = catalog_resp.json()
    assert len(catalog) >= 12
    assert any(row["code"] == "MC-GV-01" for row in catalog)

    scorecard_resp = client.get("/api/ci/kpis/mc/scorecard?period=2026-03", headers=auth_headers)
    assert scorecard_resp.status_code == 200
    scorecard = scorecard_resp.json()
    assert scorecard["period"] == "2026-03"
    assert scorecard["totals"]["items_total"] >= 12
    assert scorecard["totals"]["individual_weight_total"] == 100
    assert scorecard["totals"]["kpi_weight_total"] == 100
    assert scorecard["totals"]["completion_rate_pct"] == 0


def test_mc_kpi_close_pending_weights_endpoint(client, auth_headers):
    catalog_resp = client.get("/api/ci/kpis/mc/catalog", headers=auth_headers)
    assert catalog_resp.status_code == 200
    catalog = catalog_resp.json()
    assert len(catalog) >= 12

    target = next(row for row in catalog if row["code"] == "MC-EO-03")
    patch_resp = client.patch(
        f"/api/ci/kpis/mc/catalog/{target['id']}",
        json={"kpi_weight_pct": 0, "kpi_weight_defined": False},
        headers=auth_headers,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["kpi_weight_defined"] is False

    close_resp = client.post("/api/ci/kpis/mc/catalog/close-pending-weights", headers=auth_headers)
    assert close_resp.status_code == 200
    result = close_resp.json()
    assert result["updated"] >= 1
    assert result["total_weight_pct"] == 100

    refreshed = client.get("/api/ci/kpis/mc/catalog", headers=auth_headers).json()
    closed = next(row for row in refreshed if row["code"] == "MC-EO-03")
    assert closed["kpi_weight_defined"] is True
    assert closed["kpi_weight_pct"] == 10


def test_mc_kpi_measurement_upsert_and_delete(client, auth_headers):
    catalog = client.get("/api/ci/kpis/mc/catalog", headers=auth_headers).json()
    kpi = next(row for row in catalog if row["code"] == "MC-GV-01")

    upsert_resp = client.put(
        "/api/ci/kpis/mc/measurements",
        json={
            "kpi_definition_id": kpi["id"],
            "period": "2026-03",
            "target_value": 100,
            "actual_value": 93,
            "notes": "Cierre quincenal",
        },
        headers=auth_headers,
    )
    assert upsert_resp.status_code == 200
    measurement = upsert_resp.json()
    assert measurement["period"] == "2026-03"
    assert measurement["compliance_pct"] == 93
    assert measurement["status_color"] == "yellow"

    scorecard = client.get("/api/ci/kpis/mc/scorecard?period=2026-03", headers=auth_headers).json()
    item = next(row for row in scorecard["items"] if row["code"] == "MC-GV-01")
    assert item["has_measurement"] is True
    assert item["individual_contribution_pct"] == 9.3
    assert item["kpi_contribution_pct"] == 9.3

    list_resp = client.get("/api/ci/kpis/mc/measurements?period=2026-03", headers=auth_headers)
    assert list_resp.status_code == 200
    rows = list_resp.json()
    assert any(row["id"] == measurement["id"] for row in rows)

    delete_resp = client.delete(f"/api/ci/kpis/mc/measurements/{measurement['id']}", headers=auth_headers)
    assert delete_resp.status_code == 204

    rows_after = client.get("/api/ci/kpis/mc/measurements?period=2026-03", headers=auth_headers).json()
    assert all(row["id"] != measurement["id"] for row in rows_after)


def test_mc_kpi_trend_returns_points_and_delta(client, auth_headers):
    catalog = client.get("/api/ci/kpis/mc/catalog", headers=auth_headers).json()
    kpi = next(row for row in catalog if row["code"] == "MC-GV-01")

    feb_resp = client.put(
        "/api/ci/kpis/mc/measurements",
        json={
            "kpi_definition_id": kpi["id"],
            "period": "2026-02",
            "compliance_pct": 80,
        },
        headers=auth_headers,
    )
    assert feb_resp.status_code == 200

    mar_resp = client.put(
        "/api/ci/kpis/mc/measurements",
        json={
            "kpi_definition_id": kpi["id"],
            "period": "2026-03",
            "compliance_pct": 100,
        },
        headers=auth_headers,
    )
    assert mar_resp.status_code == 200

    trend_resp = client.get("/api/ci/kpis/mc/trend?months=2&end_period=2026-03", headers=auth_headers)
    assert trend_resp.status_code == 200
    trend = trend_resp.json()
    assert trend["start_period"] == "2026-02"
    assert trend["end_period"] == "2026-03"
    assert len(trend["points"]) == 2
    assert trend["points"][0]["period"] == "2026-02"
    assert trend["points"][1]["period"] == "2026-03"
    assert trend["delta_vs_previous"]["weighted_kpi_result_delta_pct"] == 2.0
    assert trend["trend_alert"]["level"] in {"healthy", "watch", "risk", "critical", "none"}


def test_mc_kpi_critical_deviation_creates_and_verifies_action_workflow(client, auth_headers):
    period = datetime.utcnow().strftime("%Y-%m")
    catalog = client.get("/api/ci/kpis/mc/catalog", headers=auth_headers).json()
    kpi = next(row for row in catalog if row["code"] == "MC-GV-01")

    low_resp = client.put(
        "/api/ci/kpis/mc/measurements",
        json={
            "kpi_definition_id": kpi["id"],
            "period": period,
            "compliance_pct": 60,
        },
        headers=auth_headers,
    )
    assert low_resp.status_code == 200

    actions_low = client.get("/api/ci/actions", headers=auth_headers).json()
    source = f"KPI_MC:{period}:MC-GV-01"
    linked_low = [row for row in actions_low if row["source_document"] == source]
    assert len(linked_low) == 1
    assert linked_low[0]["status"] == "Open"
    action_id = linked_low[0]["id"]

    workflow_low_resp = client.get(f"/api/ci/actions/{action_id}/workflow", headers=auth_headers)
    assert workflow_low_resp.status_code == 200
    assert workflow_low_resp.json()["workflow_status"] == "Open"

    recover_resp = client.put(
        "/api/ci/kpis/mc/measurements",
        json={
            "kpi_definition_id": kpi["id"],
            "period": period,
            "compliance_pct": 97,
        },
        headers=auth_headers,
    )
    assert recover_resp.status_code == 200

    actions_recover = client.get("/api/ci/actions", headers=auth_headers).json()
    linked_recover = [row for row in actions_recover if row["source_document"] == source]
    assert len(linked_recover) == 1
    assert linked_recover[0]["status"] == "Verified"

    workflow_recover_resp = client.get(f"/api/ci/actions/{action_id}/workflow", headers=auth_headers)
    assert workflow_recover_resp.status_code == 200
    workflow_recover = workflow_recover_resp.json()
    assert workflow_recover["workflow_status"] == "Verified"
    assert workflow_recover["verified_by"] == "system-kpi"

    regress_resp = client.put(
        "/api/ci/kpis/mc/measurements",
        json={
            "kpi_definition_id": kpi["id"],
            "period": period,
            "compliance_pct": 62,
        },
        headers=auth_headers,
    )
    assert regress_resp.status_code == 200

    actions_regress = client.get("/api/ci/actions", headers=auth_headers).json()
    linked_regress = [row for row in actions_regress if row["source_document"] == source]
    assert len(linked_regress) == 1
    assert linked_regress[0]["status"] == "Open"

    workflow_regress_resp = client.get(f"/api/ci/actions/{action_id}/workflow", headers=auth_headers)
    assert workflow_regress_resp.status_code == 200
    assert workflow_regress_resp.json()["workflow_status"] == "Open"
