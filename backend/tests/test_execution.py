"""
Tests for /api/execution endpoints (Sprint 7/8 MVP).
"""


def _create_asset(client, auth_headers, name="Area Empaque", type_="Area"):
    response = client.post(
        "/api/assets",
        json={"name": name, "type": type_},
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()


def test_execution_requires_auth(client):
    response = client.get("/api/execution/logs")
    assert response.status_code == 401


def test_create_and_list_production_log(client, auth_headers):
    asset = _create_asset(client, auth_headers)

    create_resp = client.post(
        "/api/execution/logs",
        json={
            "asset_id": asset["id"],
            "shift": "Manana",
            "event_type": "start",
            "quantity_produced": 120,
            "notes": "Inicio turno"
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 200
    assert create_resp.json()["asset_id"] == asset["id"]

    list_resp = client.get("/api/execution/logs", headers=auth_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1


def test_create_and_close_downtime(client, auth_headers):
    asset = _create_asset(client, auth_headers, name="Linea 3", type_="Linea")

    create_resp = client.post(
        "/api/execution/downtimes",
        json={
            "asset_id": asset["id"],
            "downtime_type": "Mecanico",
            "diagnosis": "Falla en rodamiento"
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 200
    event_id = create_resp.json()["id"]

    close_resp = client.patch(
        f"/api/execution/downtimes/{event_id}/close",
        json={"root_cause": "Mantenimiento preventivo vencido"},
        headers=auth_headers,
    )
    assert close_resp.status_code == 200
    assert close_resp.json()["duration_minutes"] is not None


def test_staff_and_skills_flow(client, auth_headers):
    area = _create_asset(client, auth_headers, name="Area Corte", type_="Area")

    op_resp = client.post(
        "/api/execution/staff/operators",
        json={
            "employee_code": "OP-001",
            "full_name": "Operario Uno",
            "default_area_id": area["id"],
            "shift": "Tarde"
        },
        headers=auth_headers,
    )
    assert op_resp.status_code == 200
    operator_id = op_resp.json()["id"]

    act_resp = client.post(
        "/api/engineering/activities",
        json={"name": "Corte Manual", "type": "Operation", "is_value_added": True},
        headers=auth_headers,
    )
    assert act_resp.status_code == 200
    activity_id = act_resp.json()["id"]

    skill_resp = client.post(
        "/api/execution/staff/skills",
        json={
            "operator_id": operator_id,
            "activity_id": activity_id,
            "skill_level": 3
        },
        headers=auth_headers,
    )
    assert skill_resp.status_code == 200
    assert skill_resp.json()["skill_level"] == 3

    list_skills = client.get(f"/api/execution/staff/{operator_id}/skills", headers=auth_headers)
    assert list_skills.status_code == 200
    assert len(list_skills.json()) == 1


def test_delete_execution_entities(client, auth_headers):
    area = _create_asset(client, auth_headers, name="Area Delete", type_="Area")

    op_resp = client.post(
        "/api/execution/staff/operators",
        json={
            "employee_code": "OP-DEL-001",
            "full_name": "Operario Delete",
            "default_area_id": area["id"],
            "shift": "Manana"
        },
        headers=auth_headers,
    )
    assert op_resp.status_code == 200
    operator_id = op_resp.json()["id"]

    activity_resp = client.post(
        "/api/engineering/activities",
        json={"name": "Actividad Delete", "type": "Operation", "is_value_added": True},
        headers=auth_headers,
    )
    assert activity_resp.status_code == 200
    activity_id = activity_resp.json()["id"]

    skill_resp = client.post(
        "/api/execution/staff/skills",
        json={
            "operator_id": operator_id,
            "activity_id": activity_id,
            "skill_level": 2
        },
        headers=auth_headers,
    )
    assert skill_resp.status_code == 200
    skill_id = skill_resp.json()["id"]

    log_resp = client.post(
        "/api/execution/logs",
        json={
            "asset_id": area["id"],
            "shift": "Manana",
            "event_type": "start",
            "operator_id": operator_id
        },
        headers=auth_headers,
    )
    assert log_resp.status_code == 200
    log_id = log_resp.json()["id"]

    downtime_resp = client.post(
        "/api/execution/downtimes",
        json={
            "asset_id": area["id"],
            "downtime_type": "Programado"
        },
        headers=auth_headers,
    )
    assert downtime_resp.status_code == 200
    downtime_id = downtime_resp.json()["id"]

    assert client.delete(f"/api/execution/staff/skills/{skill_id}", headers=auth_headers).status_code == 204
    assert client.delete(f"/api/execution/logs/{log_id}", headers=auth_headers).status_code == 204
    assert client.delete(f"/api/execution/downtimes/{downtime_id}", headers=auth_headers).status_code == 204
    assert client.delete(f"/api/execution/staff/operators/{operator_id}", headers=auth_headers).status_code == 204


def test_shift_plans_bulk_and_delete(client, auth_headers):
    area = _create_asset(client, auth_headers, name="Area Plan", type_="Area")

    operator_resp = client.post(
        "/api/execution/staff/operators",
        json={
            "employee_code": "OP-PLAN-001",
            "full_name": "Operario Plan",
            "default_area_id": area["id"],
            "shift": "Manana",
        },
        headers=auth_headers,
    )
    assert operator_resp.status_code == 200
    operator_id = operator_resp.json()["id"]

    bulk_resp = client.post(
        "/api/execution/shifts/plans/bulk",
        json={
            "plans": [
                {
                    "plan_date": "2026-03-03",
                    "shift": "Manana",
                    "asset_id": area["id"],
                    "operator_id": operator_id,
                    "target_quantity": 1200,
                    "notes": "Plan 1",
                },
                {
                    "plan_date": "2026-03-04",
                    "shift": "Tarde",
                    "asset_id": area["id"],
                    "operator_id": None,
                    "target_quantity": 900,
                    "notes": "Plan 2",
                },
            ]
        },
        headers=auth_headers,
    )
    assert bulk_resp.status_code == 200
    assert bulk_resp.json()["created"] == 2

    list_resp = client.get("/api/execution/shifts/plans", headers=auth_headers)
    assert list_resp.status_code == 200
    rows = list_resp.json()
    assert len(rows) >= 2

    created_row = next((row for row in rows if row["plan_date"] == "2026-03-03"), None)
    assert created_row is not None
    assert created_row["asset_id"] == area["id"]

    delete_resp = client.delete(
        f"/api/execution/shifts/plans/{created_row['id']}",
        headers=auth_headers,
    )
    assert delete_resp.status_code == 204
