# mssql_server.py
try:
    from mcp.server.fastmcp import FastMCP
    import pymssql
except ImportError as e:
    # Esto ayuda a ver si faltan librerias si lo corres manual
    print(f"Error critico: Falta libreria - {e}")
    exit(1)

# Configuración
DB_CONFIG = {
    "server": "10.252.0.144",
    "user": "proceso_opav",
    "password": "Opav2022.", 
    "database": "Takta"
}

mcp = FastMCP("TaktaMSSQL")

@mcp.tool()
def query_sql(query: str) -> str:
    """Ejecuta SELECT en la base de datos Takta."""
    try:
        conn = pymssql.connect(**DB_CONFIG)
        cursor = conn.cursor(as_dict=True)
        cursor.execute(query)
        results = cursor.fetchall()
        conn.close()
        return str(results)
    except Exception as e:
        return f"Error SQL: {e}"

@mcp.tool()
def list_tables() -> str:
    """Lista las tablas."""
    return query_sql("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'")

if __name__ == "__main__":
    try:
        mcp.run()
    except Exception as e:
        print(f"Error al iniciar MCP: {e}")