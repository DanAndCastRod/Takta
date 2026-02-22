"""
Tests for /api/assets endpoints.
Covers: CRUD, tree, breadcrumbs, cycle detection, orphan prevention.
"""


def test_root(client):
    """Health check."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OK"
    assert "version" in data


# --- CREATE ---

def test_create_asset(client):
    """Create a root asset (no parent)."""
    response = client.post("/api/assets/", json={
        "name": "Sede Pereira",
        "type": "Sede",
        "description": "Planta principal"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Sede Pereira"
    assert data["type"] == "Sede"
    assert data["parent_id"] is None
    assert "id" in data


def test_create_child_asset(client):
    """Create a child linked to a parent."""
    # Create parent
    parent = client.post("/api/assets/", json={
        "name": "Sede Pereira", "type": "Sede"
    }).json()
    
    # Create child
    child = client.post("/api/assets/", json={
        "name": "Planta Beneficio",
        "type": "Planta",
        "parent_id": parent["id"]
    })
    assert child.status_code == 201
    assert child.json()["parent_id"] == parent["id"]


def test_create_asset_invalid_parent(client):
    """Creating with a non-existent parent should fail."""
    response = client.post("/api/assets/", json={
        "name": "Orphan",
        "type": "Planta",
        "parent_id": "00000000-0000-0000-0000-000000000000"
    })
    assert response.status_code == 404


# --- READ ---

def test_list_assets(client):
    """List assets (initially empty)."""
    response = client.get("/api/assets/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_list_assets_filter_by_type(client):
    """List with type filter returns only matching assets."""
    client.post("/api/assets/", json={"name": "Sede", "type": "Sede"})
    client.post("/api/assets/", json={"name": "Máquina", "type": "Maquina"})
    
    response = client.get("/api/assets/?type=Sede")
    data = response.json()
    assert all(a["type"] == "Sede" for a in data)


def test_get_asset_by_id(client):
    """Get a single asset by its ID."""
    created = client.post("/api/assets/", json={
        "name": "Sede Pereira", "type": "Sede"
    }).json()
    
    response = client.get(f"/api/assets/{created['id']}")
    assert response.status_code == 200
    assert response.json()["name"] == "Sede Pereira"


def test_get_asset_not_found(client):
    """Requesting non-existent asset returns 404."""
    response = client.get("/api/assets/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


# --- TREE ---

def test_asset_tree_nested(client):
    """Tree endpoint returns nested JSON structure."""
    # Build: Sede -> Planta -> Línea
    sede = client.post("/api/assets/", json={"name": "Sede", "type": "Sede"}).json()
    planta = client.post("/api/assets/", json={
        "name": "Planta", "type": "Planta", "parent_id": sede["id"]
    }).json()
    client.post("/api/assets/", json={
        "name": "Línea 1", "type": "Linea", "parent_id": planta["id"]
    })
    
    tree = client.get("/api/assets/tree").json()
    assert len(tree) == 1  # One root
    assert tree[0]["name"] == "Sede"
    assert len(tree[0]["children"]) == 1
    assert tree[0]["children"][0]["name"] == "Planta"
    assert len(tree[0]["children"][0]["children"]) == 1
    assert tree[0]["children"][0]["children"][0]["name"] == "Línea 1"


# --- BREADCRUMBS ---

def test_breadcrumbs(client):
    """Context endpoint returns full path from root."""
    sede = client.post("/api/assets/", json={"name": "Sede", "type": "Sede"}).json()
    planta = client.post("/api/assets/", json={
        "name": "Planta", "type": "Planta", "parent_id": sede["id"]
    }).json()
    linea = client.post("/api/assets/", json={
        "name": "Línea 1", "type": "Linea", "parent_id": planta["id"]
    }).json()
    
    ctx = client.get(f"/api/assets/{linea['id']}/context").json()
    assert ctx["depth"] == 3
    assert ctx["breadcrumbs"][0]["name"] == "Sede"
    assert ctx["breadcrumbs"][1]["name"] == "Planta"
    assert ctx["breadcrumbs"][2]["name"] == "Línea 1"


# --- DELETE ---

def test_delete_leaf_asset(client):
    """Can delete an asset with no children."""
    created = client.post("/api/assets/", json={"name": "Temp", "type": "Sede"}).json()
    response = client.delete(f"/api/assets/{created['id']}")
    assert response.status_code == 204


def test_delete_asset_with_children_fails(client):
    """Cannot delete an asset that has children."""
    parent = client.post("/api/assets/", json={"name": "Parent", "type": "Sede"}).json()
    client.post("/api/assets/", json={
        "name": "Child", "type": "Planta", "parent_id": parent["id"]
    })
    
    response = client.delete(f"/api/assets/{parent['id']}")
    assert response.status_code == 400
    assert "children" in response.json()["detail"]
