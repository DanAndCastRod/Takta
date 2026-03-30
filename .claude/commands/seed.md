Poblar la base de datos de Takta con datos de demo.

1. Verificar DB_MODE en .env (sqlite o mssql)
2. Ejecutar: python -m backend.app.seeds.seed_demo_bulk --scale medium
3. Reportar resultado (tablas pobladas y conteos)
4. Si hay error, leer backend/app/seeds/seed_demo_bulk.py y diagnosticar
