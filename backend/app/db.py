"""
Database configuration for Takta.

Controls which database engine to use via the DB_MODE environment variable:
  - "sqlite" (default) — local SQLite file, zero config, instant startup
  - "mssql"            — SQL Server for staging/production

Configuration is read from .env at project root.
Legacy FORCE_SQLITE=True is still honored for backwards compatibility.
"""

from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text
import os
from pathlib import Path
from dotenv import load_dotenv
import logging

# ── Logging ──
logger = logging.getLogger(__name__)

# ── Load .env from project root ──
# Walk up from this file (backend/app/db.py) → backend/app → backend → project_root
_project_root = Path(__file__).resolve().parent.parent.parent
_env_file = _project_root / ".env"
if _env_file.exists():
    load_dotenv(_env_file, override=False)  # don't override already-set env vars
else:
    load_dotenv()  # fallback: search cwd


# ── Resolve DB_MODE ──
def _resolve_db_mode() -> str:
    """
    Determine which database to use. Priority:
      1. DB_MODE env var (explicit)
      2. FORCE_SQLITE=True (legacy, maps to 'sqlite')
      3. Default: 'sqlite'
    """
    explicit_mode = os.getenv("DB_MODE")
    if explicit_mode:
        return explicit_mode.strip().lower()

    # Legacy: FORCE_SQLITE
    if os.getenv("FORCE_SQLITE", "False").lower() == "true":
        return "sqlite"

    # Default
    return "sqlite"


DB_MODE = _resolve_db_mode()

# ── Connection Parameters ──
# SQL Server (only used when DB_MODE == 'mssql')
MSSQL_SERVER = os.getenv("MSSQL_SERVER", os.getenv("SERVER", "10.252.0.144"))
MSSQL_DATABASE = os.getenv("MSSQL_DATABASE", os.getenv("DB_NAME", "Takta"))
MSSQL_USER = os.getenv("MSSQL_USER", os.getenv("USER", "proceso_opav"))
MSSQL_PASSWORD = os.getenv("MSSQL_PASSWORD", os.getenv("PASSWORD", "Opav2022."))
MSSQL_URL = f"mssql+pymssql://{MSSQL_USER}:{MSSQL_PASSWORD}@{MSSQL_SERVER}/{MSSQL_DATABASE}"

# SQLite
SQLITE_PATH = os.getenv("SQLITE_PATH", str(_project_root / "takta.db"))
SQLITE_URL = f"sqlite:///{SQLITE_PATH}"


# ── Engine Singleton ──
_engine = None


def get_engine():
    """
    Create or return the database engine singleton.

    - "sqlite": instant, no network dependency
    - "mssql":  connect to SQL Server; if connection fails, fall back to SQLite
    """
    global _engine
    if _engine is not None:
        return _engine

    if DB_MODE == "mssql":
        _engine = _create_mssql_engine()
    else:
        logger.info(f"[DB] Using SQLite: {SQLITE_PATH}")
        _engine = create_engine(
            SQLITE_URL,
            connect_args={"check_same_thread": False},
        )

    return _engine


def _create_mssql_engine():
    """Attempt SQL Server connection with SQLite fallback."""
    try:
        logger.info(f"[DB] Connecting to SQL Server: {MSSQL_SERVER}/{MSSQL_DATABASE}...")
        engine = create_engine(MSSQL_URL, echo=False, pool_pre_ping=True)
        # Validate the connection actually works
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("[DB] SQL Server connected successfully.")
        return engine
    except Exception as e:
        logger.error(f"[DB] SQL Server connection failed: {e}")
        logger.warning(f"[DB] Falling back to SQLite: {SQLITE_PATH}")
        return create_engine(
            SQLITE_URL,
            connect_args={"check_same_thread": False},
        )


def reset_engine():
    """Reset the engine singleton. Used by tests to inject a test engine."""
    global _engine
    _engine = None


def set_engine(engine):
    """Override the engine singleton. Used by tests."""
    global _engine
    _engine = engine


def _sqlite_column_exists(engine, table_name: str, column_name: str) -> bool:
    with engine.connect() as conn:
        rows = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
    return any(row[1] == column_name for row in rows)


def _sqlite_add_column_if_missing(engine, table_name: str, column_name: str, ddl_type: str) -> None:
    if _sqlite_column_exists(engine, table_name, column_name):
        return
    with engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl_type}"))
    logger.info(f"[DB] SQLite migration applied: {table_name}.{column_name}")


def _run_sqlite_migrations(engine) -> None:
    """
    Lightweight additive migrations for SQLite environments where create_all()
    does not alter existing tables.
    """
    backend_name = engine.url.get_backend_name()
    if backend_name != "sqlite":
        return

    _sqlite_add_column_if_missing(engine, "productreference", "uom", "VARCHAR")
    _sqlite_add_column_if_missing(engine, "productreference", "packaging_uom", "VARCHAR")
    _sqlite_add_column_if_missing(engine, "timestudy", "asset_id", "CHAR(32)")
    _sqlite_add_column_if_missing(engine, "timestudy", "product_reference_id", "CHAR(32)")
    _sqlite_add_column_if_missing(engine, "timestudy", "sampling_interval_seconds", "INTEGER")
    _sqlite_add_column_if_missing(engine, "timestudy", "sampling_population_size", "INTEGER")
    _sqlite_add_column_if_missing(engine, "formatinstance", "updated_at", "DATETIME")
    _sqlite_add_column_if_missing(engine, "formatinstance", "source_context_json", "TEXT")
    _sqlite_add_column_if_missing(engine, "nonconformity", "close_requested_at", "DATETIME")
    _sqlite_add_column_if_missing(engine, "nonconformity", "close_requested_by", "VARCHAR")
    _sqlite_add_column_if_missing(engine, "nonconformity", "approved_at", "DATETIME")
    _sqlite_add_column_if_missing(engine, "nonconformity", "approved_by", "VARCHAR")
    _sqlite_add_column_if_missing(engine, "nonconformity", "verified_at", "DATETIME")
    _sqlite_add_column_if_missing(engine, "nonconformity", "verified_by", "VARCHAR")
    _sqlite_add_column_if_missing(engine, "nonconformity", "rejected_at", "DATETIME")
    _sqlite_add_column_if_missing(engine, "nonconformity", "rejected_by", "VARCHAR")
    _sqlite_add_column_if_missing(engine, "nonconformity", "rejected_reason", "VARCHAR")
    _sqlite_add_column_if_missing(engine, "capaaction", "close_requested_at", "DATETIME")
    _sqlite_add_column_if_missing(engine, "capaaction", "close_requested_by", "VARCHAR")
    _sqlite_add_column_if_missing(engine, "capaaction", "approved_at", "DATETIME")
    _sqlite_add_column_if_missing(engine, "capaaction", "approved_by", "VARCHAR")
    _sqlite_add_column_if_missing(engine, "capaaction", "verified_at", "DATETIME")
    _sqlite_add_column_if_missing(engine, "capaaction", "verified_by", "VARCHAR")
    _sqlite_add_column_if_missing(engine, "capaaction", "rejected_at", "DATETIME")
    _sqlite_add_column_if_missing(engine, "capaaction", "rejected_by", "VARCHAR")
    _sqlite_add_column_if_missing(engine, "capaaction", "rejected_reason", "VARCHAR")
    _sqlite_add_column_if_missing(engine, "improvementaction", "tenant_code", "VARCHAR DEFAULT 'default'")
    _sqlite_add_column_if_missing(engine, "continuousimprovementkpidefinition", "tenant_code", "VARCHAR DEFAULT 'default'")
    _sqlite_add_column_if_missing(engine, "continuousimprovementkpimeasurement", "tenant_code", "VARCHAR DEFAULT 'default'")
    _sqlite_add_column_if_missing(engine, "weightsamplingspec", "tenant_code", "VARCHAR DEFAULT 'default'")
    _sqlite_add_column_if_missing(engine, "nonconformity", "tenant_code", "VARCHAR DEFAULT 'default'")
    _sqlite_add_column_if_missing(engine, "capaaction", "tenant_code", "VARCHAR DEFAULT 'default'")
    _sqlite_add_column_if_missing(engine, "vsmcanvas", "tenant_code", "VARCHAR DEFAULT 'default'")
    _sqlite_add_column_if_missing(engine, "plantlayout", "tenant_code", "VARCHAR DEFAULT 'default'")
    _sqlite_add_column_if_missing(engine, "engineeringmeeting", "tenant_code", "VARCHAR DEFAULT 'default'")


def init_db():
    """Create all SQLModel tables if they don't exist."""
    engine = get_engine()
    try:
        SQLModel.metadata.create_all(engine)
        _run_sqlite_migrations(engine)
        logger.info("[DB] Tables created/verified.")
    except Exception as e:
        logger.error(f"[DB] Error creating tables: {e}")
        raise


def get_session():
    """FastAPI dependency: yields a database session per request."""
    engine = get_engine()
    with Session(engine) as session:
        yield session
