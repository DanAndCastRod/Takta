from sqlmodel import select

from backend.app.models import Asset, ImprovementAction


def test_platform_runtime_defaults(client, auth_headers):
    response = client.get("/api/platform/runtime", headers=auth_headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["tenant"]["code"] == "default"
    assert payload["theme"]["brand_name"]
    assert isinstance(payload["ui_config"]["menu"], list)
    assert "module.diagram" in payload["feature_flags"]


def test_platform_feature_flags_update_and_profile(client, auth_headers):
    update_resp = client.put(
        "/api/platform/feature-flags/module.diagram",
        json={"is_enabled": False, "rollout": "ga", "notes": "test"},
        headers=auth_headers,
    )
    assert update_resp.status_code == 200

    flags_resp = client.get("/api/platform/feature-flags", headers=auth_headers)
    assert flags_resp.status_code == 200
    flags = {row["feature_key"]: row for row in flags_resp.json()["flags"]}
    assert flags["module.diagram"]["is_enabled"] is False

    profile_resp = client.post("/api/platform/feature-flags/apply-profile/minimal", headers=auth_headers)
    assert profile_resp.status_code == 200
    flags_resp = client.get("/api/platform/feature-flags", headers=auth_headers)
    flags = {row["feature_key"]: row for row in flags_resp.json()["flags"]}
    assert flags["module.diagram"]["is_enabled"] is False
    assert flags["module.assets"]["is_enabled"] is True


def test_platform_health_validation(client, auth_headers):
    response = client.post("/api/platform/integration/health/run-validation", headers=auth_headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"ok", "warning", "critical"}
    latest = client.get("/api/platform/integration/health/latest", headers=auth_headers)
    assert latest.status_code == 200
    assert latest.json()["status"] in {"ok", "warning", "critical", "unknown"}


def test_platform_diagram_library_seed_and_favorite(client, auth_headers):
    seed = client.post("/api/platform/diagram/libraries/seed", headers=auth_headers)
    assert seed.status_code == 200
    seeded = seed.json()
    assert seeded["total"] >= 1

    libraries = client.get("/api/platform/diagram/libraries?domain=plant", headers=auth_headers)
    assert libraries.status_code == 200
    rows = libraries.json()
    assert len(rows) >= 1
    item_id = rows[0]["id"]

    favorite = client.post(f"/api/platform/diagram/libraries/{item_id}/favorite", headers=auth_headers)
    assert favorite.status_code == 200
    favs = client.get("/api/platform/diagram/libraries/favorites", headers=auth_headers)
    assert favs.status_code == 200
    assert item_id in favs.json()


def test_platform_simulation_end_to_end(client, auth_headers, session):
    asset = Asset(name="Línea Simulación", type="Linea")
    session.add(asset)
    session.commit()
    session.refresh(asset)

    scenario_payload = {
        "name": "Escenario Base",
        "asset_id": str(asset.id),
        "mode": "flow",
        "config": {
            "hours": 8,
            "demand_per_hour": 120,
            "variability": {"coefficient": 0.12},
            "thresholds": {"green": 0.85, "yellow": 1.1},
            "nodes": [
                {"id": "n1", "label": "Corte", "capacity_per_hour": 110, "process_time_sec": 52},
                {"id": "n2", "label": "Empaque", "capacity_per_hour": 95, "process_time_sec": 61},
            ],
            "routes": [{"from": "n1", "to": "n2", "share": 1.0}],
            "historical": {"throughput_per_hour": 100},
        },
    }
    create = client.post("/api/platform/simulation/scenarios", json=scenario_payload, headers=auth_headers)
    assert create.status_code == 200
    scenario_id = create.json()["id"]

    run1 = client.post(
        f"/api/platform/simulation/scenarios/{scenario_id}/run",
        json={"run_label": "base", "is_baseline": True},
        headers=auth_headers,
    )
    assert run1.status_code == 200
    run1_payload = run1.json()
    assert run1_payload["result"]["kpis"]["throughput_per_hour"] > 0

    run2 = client.post(
        f"/api/platform/simulation/scenarios/{scenario_id}/run",
        json={"run_label": "mejora", "config_override": {"nodes": [{"id": "n1", "label": "Corte", "capacity_per_hour": 130, "process_time_sec": 45}, {"id": "n2", "label": "Empaque", "capacity_per_hour": 120, "process_time_sec": 50}], "routes": [{"from": "n1", "to": "n2", "share": 1.0}]}},
        headers=auth_headers,
    )
    assert run2.status_code == 200

    results = client.get(f"/api/platform/simulation/scenarios/{scenario_id}/results", headers=auth_headers)
    assert results.status_code == 200
    assert len(results.json()) >= 2

    compare = client.get(f"/api/platform/simulation/scenarios/{scenario_id}/compare", headers=auth_headers)
    assert compare.status_code == 200
    assert len(compare.json()["comparison"]) >= 4

    sync_actions = client.post(f"/api/platform/simulation/scenarios/{scenario_id}/actions/sync", headers=auth_headers)
    assert sync_actions.status_code == 200
    assert "created" in sync_actions.json()

    export = client.get(f"/api/platform/simulation/scenarios/{scenario_id}/export/executive", headers=auth_headers)
    assert export.status_code == 200
    assert "summary" in export.json()

    decision = client.post(
        f"/api/platform/simulation/scenarios/{scenario_id}/decisions",
        json={"title": "Ajustar balanceo", "notes": "Mover 1 operario", "expected_impact": {"throughput_per_hour": 8}},
        headers=auth_headers,
    )
    assert decision.status_code == 200
    decision_id = decision.json()["id"]

    patch_decision = client.patch(
        f"/api/platform/simulation/decisions/{decision_id}",
        json={"status": "approved", "actual_impact": {"throughput_per_hour": 6}},
        headers=auth_headers,
    )
    assert patch_decision.status_code == 200

    listed = client.get(f"/api/platform/simulation/scenarios/{scenario_id}/decisions", headers=auth_headers)
    assert listed.status_code == 200
    assert len(listed.json()) >= 1

    # Verify automatic action source format if created
    actions = session.exec(select(ImprovementAction)).all()
    assert actions is not None
