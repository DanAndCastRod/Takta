# Matriz QA Roles/Tenant V2

Fecha: 2026-03-09  
Ambito: frontend web (`Playwright real`) + backend FastAPI en `127.0.0.1:9003`

## Objetivo

Validar que los flujos base de autenticacion, navegacion y contexto tenant funcionen por rol en entorno integrado (sin mocks).

## Supuestos

- Tenant activo: `default`.
- Usuarios seed:
  - `admin / admin123`
  - `ingeniero / takta2026`
  - `supervisor / takta2026`

## Matriz por rol

| Caso | Tenant | Rol | Flujo validado | Resultado esperado |
|---|---|---|---|---|
| QA-RT-01 | default | admin | Login real via API, carga shell, apertura `Activos`, apertura `Configuracion` | Token activo, `#/assets` y `#/settings` cargan sin error de router |
| QA-RT-02 | default | admin | `Settings` con estado PWA y selector de tenant | `#settings-pwa-status` visible y `#settings-tenant-select` con opciones |
| QA-RT-03 | default | ingeniero | Login real via API, navegacion a `Ingenieria` y `Actas IP` | `#/engineering` y `#/meetings` cargan, sin redireccion a login |
| QA-RT-04 | default | supervisor | Login real via API, navegacion a `Ejecucion` y `Muestreo de peso` | `#/execution` y `#/weight-sampling` cargan, sin redireccion a login |
| QA-RT-05 | default | todos | Persistencia de tenant en runtime | `localStorage.takta.tenant_code` definido tras login |

## Automatizacion asociada

- Archivo: `frontend/e2e-real/auth-navigation-roles.spec.js`
- Config: `frontend/playwright.real.config.js`
- Comando: `npm --prefix frontend run test:e2e:real`

## Criterio de aceptacion

- Todos los casos QA-RT en verde.
- Sin mensaje `Error loading page.` en `#app-content`.
- Sin redireccion inesperada a `#/login` durante la navegacion de cada rol.

## Evidencia de ejecucion (2026-03-09)

- `npm --prefix frontend run test:e2e` -> `2 passed`.
- `npm --prefix frontend run test:e2e:real` -> `4 passed`.
