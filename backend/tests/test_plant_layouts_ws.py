"""
Tests for plant-layouts WebSocket realtime endpoint.
"""

from fastapi.testclient import TestClient


def test_plant_layouts_ws_requires_token(client: TestClient):
    try:
        with client.websocket_connect("/api/plant-layouts/ws") as websocket:
            websocket.receive_json()
    except Exception:
        # Connection should fail without token.
        assert True
    else:
        assert False, "WebSocket without token should not connect"


def test_plant_layouts_ws_ping_and_broadcast(client: TestClient, admin_token: str):
    with client.websocket_connect(f"/api/plant-layouts/ws?token={admin_token}") as websocket:
        ready = websocket.receive_json()
        assert ready["type"] == "ws_ready"

        websocket.send_json({"type": "ping"})
        pong = websocket.receive_json()
        assert pong["type"] == "pong"

        payload = {
            "type": "asset_metric",
            "asset_id": "11111111-1111-1111-1111-111111111111",
            "value": 0.72,
        }
        websocket.send_json(payload)
        echoed = websocket.receive_json()
        assert echoed["type"] == "asset_metric"
        assert echoed["asset_id"] == payload["asset_id"]
        assert echoed["value"] == payload["value"]
