"""
Tests for /api/auth endpoints.
Covers: login, /me, register, role protection.
"""


def test_login_success(client):
    """Login with valid credentials returns a token."""
    response = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "admin"


def test_login_invalid_password(client):
    """Login with wrong password returns 401."""
    response = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "wrong"
    })
    assert response.status_code == 401


def test_login_invalid_username(client):
    """Login with non-existent user returns 401."""
    response = client.post("/api/auth/login", json={
        "username": "nobody",
        "password": "pass"
    })
    assert response.status_code == 401


def test_me_with_token(client):
    """GET /me with valid token returns user info."""
    # Login first
    login = client.post("/api/auth/login", json={
        "username": "ingeniero",
        "password": "takta2026"
    }).json()
    
    # Use token
    response = client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {login['access_token']}"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "ingeniero"
    assert data["role"] == "engineer"


def test_me_without_token(client):
    """GET /me without token returns 401."""
    response = client.get("/api/auth/me")
    assert response.status_code in [401, 403]


def test_me_with_invalid_token(client):
    """GET /me with garbage token returns 401."""
    response = client.get("/api/auth/me", headers={
        "Authorization": "Bearer totally.invalid.token"
    })
    assert response.status_code == 401


def test_register_as_admin(client, admin_token):
    """Admin can register new users."""
    response = client.post("/api/auth/register", json={
        "username": "nuevo_analista",
        "password": "pass123",
        "role": "viewer",
        "display_name": "Analista Nuevo"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 201


def test_register_as_non_admin_fails(client, engineer_token):
    """Non-admin cannot register users."""
    response = client.post("/api/auth/register", json={
        "username": "hacker",
        "password": "pass",
        "role": "admin"
    }, headers={"Authorization": f"Bearer {engineer_token}"})
    assert response.status_code == 403
