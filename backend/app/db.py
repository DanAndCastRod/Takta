from sqlmodel import SQLModel, create_engine, Session
import os
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# --- Configuration ---
# SQL Server Config
SERVER = os.getenv("SERVER", "10.252.0.144")
DATABASE = os.getenv("DB_NAME", "Takta")
USERNAME = os.getenv("USER", "proceso_opav")
PASSWORD = os.getenv("PASSWORD", "Opav2022.")

# URL for SQL Server
# Note: Using 'trustServerCertificate=yes' might be needed for some MSSQL setups, but handled by pymssql
MSSQL_URL = f"mssql+pymssql://{USERNAME}:{PASSWORD}@{SERVER}/{DATABASE}"

# URL for SQLite Fallback (local file)
SQLITE_URL = "sqlite:///./takta.db"

# Force mode
FORCE_SQLITE = os.getenv("FORCE_SQLITE", "False").lower() == "true"

engine = None

def get_engine():
    global engine
    if engine:
        return engine

    if FORCE_SQLITE:
        logger.warning("⚠️ FORCE_SQLITE is True. Using SQLite database.")
        engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
        return engine

    try:
        # Attempt minimal connection test
        logger.info(f"🔌 Attempting to connect to SQL Server at {SERVER}...")
        # Create a temporary engine for testing without 'echo' to avoid noise
        test_engine = create_engine(MSSQL_URL)
        with test_engine.connect() as conn:
            pass
        logger.info("✅ Connected to SQL Server successfully.")
        
        # If successful, create variable engine
        engine = create_engine(MSSQL_URL, echo=True)
        return engine
        
    except Exception as e:
        logger.error(f"❌ Failed to connect to SQL Server: {e}")
        logger.warning("⚠️ Falling back to local SQLite database: takta.db")
        # Fallback
        engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
        return engine

# Initialize engine logic
engine = get_engine()

def init_db():
    try:
        SQLModel.metadata.create_all(engine)
        logger.info("✅ Database initialized (tables created).")
    except Exception as e:
        logger.error(f"❌ Error creating tables: {e}")

def get_session():
    with Session(engine) as session:
        yield session
