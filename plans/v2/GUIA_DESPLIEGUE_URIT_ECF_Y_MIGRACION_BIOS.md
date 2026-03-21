# Guía de Despliegue Dual: URiT/EC&F Externo + Grupo Bios Interno

Fecha: 2026-03-09  
Estado: Operable

## 1. Objetivo

Publicar Takta en dos canales independientes:

- Canal externo URiT/EC&F:
  - frontend en `takta.urit.services`
  - backend en `back.takta.ejecomercial.co` (cPanel Python App)
- Canal interno Grupo Bios:
  - backend interno por PM2 en Windows (`8105`)
  - exposición corporativa por IIS en `biosapps.grupobios.co/api_takta/`

Con independencia total de base de datos entre ambos canales.

## 2. Topología final

### 2.1 Externo URiT/EC&F

- Front: Cloudflare Pages (`takta.urit.services`)
- Back: cPanel Python App (`back.takta.ejecomercial.co`)
- Base URL frontend:
  - `VITE_API_URL=https://back.takta.ejecomercial.co/api`
- BD:
  - `SQLITE_PATH=/home/<cpanel-user>/takta-data/takta_urit.db`

### 2.2 Interno Grupo Bios

- Front interno: despliegue corporativo (Node-RED/public)
- Back interno: `C:\Analitica\python\API_takta` por PM2 en `8105`
- Exposición HTTP corporativa:
  - `https://biosapps.grupobios.co/api_takta/` (regla IIS reverse proxy)
- Base URL frontend interna:
  - `VITE_API_URL=https://biosapps.grupobios.co/api_takta/api`
- BD:
  - `SQLITE_PATH=C:/Analitica/python/API_takta/data/takta_bios.db`

## 3. Separación de datos (obligatoria)

No compartir DB entre canales. Configurar archivos/env independientes:

- Externo URiT:
  - `backend/.env.production.urit.example`
  - `frontend/.env.production.urit.example`
- Interno Bios:
  - `backend/.env.production.bios.example`
  - `frontend/.env.production.bios.example`

## 4. Despliegue externo URiT/EC&F

### 4.1 Frontend en Cloudflare Pages

1. Conectar repo/rama release.
2. Build:
   - `npm ci --prefix frontend && npm run build --prefix frontend`
   - output: `frontend/dist`
3. Dominio custom:
   - `takta.urit.services`
4. Variable:
   - `VITE_API_URL=https://back.takta.ejecomercial.co/api`

### 4.2 Backend en cPanel Python App

1. Crear Python App en cPanel para `back.takta.ejecomercial.co`.
2. Subir carpeta `backend` al application root.
3. Instalar dependencias en el virtualenv de cPanel:
   - `pip install -r requirements.txt`
4. Usar `passenger_wsgi.py` como startup file (entrypoint `application`).
5. Configurar variables de entorno:
   - `DB_MODE=sqlite`
   - `SQLITE_PATH=/home/<cpanel-user>/takta-data/takta_urit.db`
   - `CORS_ORIGINS=https://takta.urit.services`
6. Reiniciar aplicación desde cPanel y validar:
   - `https://back.takta.ejecomercial.co/`
   - `https://back.takta.ejecomercial.co/api/auth/me`

Nota técnica: FastAPI es ASGI; por eso se agregó `backend/passenger_wsgi.py` usando `a2wsgi`.

## 5. Canal público por GitHub Actions (EC&F)

Workflow ejemplo listo:

- `example.workflow.EC&F.yml`

Objetivo del workflow:

1. Compilar frontend de Takta.
2. Publicar frontend por SSH/SCP al host de EC&F.
3. Publicar backend FastAPI en `back.takta.ejecomercial.co`.
4. Instalar dependencias y reiniciar Passenger (`tmp/restart.txt`).

Secrets requeridos:

- `ECF_SSH_HOST`
- `ECF_SSH_USER`
- `ECF_SSH_PRIVATE_KEY`
- `ECF_FRONTEND_PATH` (opcional, default `~/public_html/takta.urit.services`)
- `ECF_BACKEND_PATH` (opcional, default `~/public_html/back.takta.ejecomercial.co`)
- `ECF_PYTHON_BIN` (opcional, default `python3`)
- `ECF_BACKEND_ENV_B64` (opcional, `.env` backend en base64)

Nota: este workflow sirve como canal de despliegue público para backend/frontend sin depender de Azure DevOps.

## 6. Despliegue interno Grupo Bios

### 5.1 Backend por PM2

Ruta:

- `C:\Analitica\python\API_takta`

Comando:

```powershell
pm2 start C:\Analitica\python\API_takta\.venv\Scripts\python.exe --name takta-api --cwd C:\Analitica\python\API_takta --interpreter none -- -m uvicorn app.main:app --host 0.0.0.0 --port 8105
pm2 save
```

Variables:

- `CORS_ORIGINS=https://biosapps.grupobios.co`
- `SQLITE_PATH=C:/Analitica/python/API_takta/data/takta_bios.db`

### 5.2 IIS reverse proxy (`/api_takta/`)

Configurar IIS + ARR para reenviar:

- entrada: `https://biosapps.grupobios.co/api_takta/{R:1}`
- destino: `http://127.0.0.1:8105/{R:1}`

Regla de referencia en:

- `plans/v2/ANEXO_IIS_PROXY_BIOSAPPS_API_TAKTA.md`

## 7. Pipeline privado Azure DevOps (Bios)

Archivo:

- `example.pipeline.yml`

Flujo:

1. Build frontend.
2. Copia backend a `C:\Analitica\python\API_takta`.
3. Copia frontend a `C:\Users\iot.td\.node-red\public\Takta`.
4. Configura `CORS_ORIGINS` y `SQLITE_PATH` internos.
5. Reinicia PM2 `takta-api`.

## 8. Seed de datos de prueba (UI stress)

Script disponible:

- `backend/app/seeds/seed_demo_bulk.py`

Comandos:

```powershell
py -m backend.app.seeds.seed_demo_bulk --scale small
py -m backend.app.seeds.seed_demo_bulk --scale medium
py -m backend.app.seeds.seed_demo_bulk --scale large
```

Qué base se debe poblar:

- Por defecto, Takta usa `takta.db` en la raíz del repo.
- `backend/takta.db` solo aplica si se configura explícitamente `SQLITE_PATH` apuntando allí.

Si quieres poblar `backend/takta.db` puntualmente:

```powershell
$env:SQLITE_PATH="D:\Takta\Takta\backend\takta.db"
py -m backend.app.seeds.seed_demo_bulk --scale medium
```

Verificación:

- El script imprime `Engine: sqlite:///...`.
- Confirmar `LastWriteTime` del archivo de DB activo.

## 9. Validación mínima por canal

### 7.1 URiT/EC&F externo

1. Login desde `takta.urit.services`.
2. Confirmar tráfico API a `back.takta.ejecomercial.co`.
3. Crear registro (activo o referencia) y validar persistencia en DB URiT.

### 7.2 Grupo Bios interno

1. Consumir API vía `biosapps.grupobios.co/api_takta/api/...`.
2. Confirmar `GET /api/auth/me` = 200.
3. Crear registro y validar persistencia en DB BIOS.

## 10. Rollback

1. Restaurar release anterior de frontend/back por canal.
2. Reiniciar servicio:
   - cPanel app restart (externo)
   - `pm2 restart takta-api` (interno)
3. Verificar `GET /` y login.

## 11. Referencias oficiales

- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- cPanel WSGI app setup: https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-python-wsgi-application/
- cPanel Setup Python App (startup/entry point): https://support.cpanel.net/hc/en-us/articles/360053483754-How-to-Install-a-Python-WSGI-Application
- a2wsgi (ASGI -> WSGI adapter): https://pypi.org/project/a2wsgi/
