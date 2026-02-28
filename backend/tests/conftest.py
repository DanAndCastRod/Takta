"""
Pytest fixtures for Takta API tests.
Uses SQLite in-memory database for isolation and speed.

Uses db.set_engine() / db.reset_engine() for proper test isolation
instead of relying on module-level globals.
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from sqlmodel.pool import StaticPool

from backend.app.main import app
from backend.app.db import get_session, set_engine, reset_engine
from backend.app.core.security import create_access_token


# --- Database Fixture ---

@pytest.fixture(name="session", autouse=False)
def session_fixture():
    """
    Create a fresh in-memory SQLite database for each test.
    Injects it into the db module via set_engine() so that
    init_db() and get_session() use the test database.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Inject test engine into db module
    set_engine(engine)
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        yield session

    # Clean up: reset engine so subsequent tests get fresh state
    reset_engine()


@pytest.fixture(name="client")
def client_fixture(session: Session):
    """
    Create a TestClient that uses the in-memory session.
    Overrides the get_session dependency so no real DB is touched.
    """
    def get_session_override():
        yield session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# --- Auth Helpers ---

@pytest.fixture(name="admin_token")
def admin_token_fixture():
    """Generate a valid admin JWT token for testing."""
    return create_access_token(data={
        "sub": "test_admin",
        "role": "admin",
        "name": "Test Admin",
    })


@pytest.fixture(name="engineer_token")
def engineer_token_fixture():
    """Generate a valid engineer JWT token for testing."""
    return create_access_token(data={
        "sub": "test_engineer",
        "role": "engineer",
        "name": "Test Engineer",
    })


@pytest.fixture(name="auth_headers")
def auth_headers_fixture(admin_token):
    """Return Authorization headers with admin token."""
    return {"Authorization": f"Bearer {admin_token}"}
