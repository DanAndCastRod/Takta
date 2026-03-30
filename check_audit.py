import sqlite3
import json

db_path = r"c:\Users\daniel.castaneda\OneDrive - Grupo BIOS S.A.S\Transformación Digital\2026\Ecosistema TD\Takta\takta.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT * FROM tenantconfigaudit ORDER BY changed_at DESC LIMIT 5;")
for row in cursor.fetchall():
    print(dict(row))
