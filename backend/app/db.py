from sqlmodel import SQLModel, create_engine, Session
import os
from dotenv import load_dotenv

load_dotenv()

# Build connection string from environment variables or use default (from .env analysis)
# Driver for SQL Server
SERVER = os.getenv("SERVER", "10.252.0.144")
DATABASE = os.getenv("DB_NAME", "Takta")
USERNAME = os.getenv("USER", "proceso_opav")
PASSWORD = os.getenv("PASSWORD", "Opav2022.")

# URL format for pymssql: mssql+pymssql://user:password@server/database
DATABASE_URL = f"mssql+pymssql://{USERNAME}:{PASSWORD}@{SERVER}/{DATABASE}"

engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
