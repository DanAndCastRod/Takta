# E2E Frontend (Playwright)

## Suites disponibles

- `mock`: valida shell UX/UI sin depender del backend real.
- `real`: valida autenticacion y navegacion por rol contra backend FastAPI real.

## Requisitos

```bash
npm run test:e2e:install
```

Para la suite `real`:

- Backend disponible en `http://127.0.0.1:9003` (la config tambien intenta levantar `uvicorn` automaticamente).
- Credenciales seed:
  - `admin / admin123`
  - `ingeniero / takta2026`
  - `supervisor / takta2026`

## Comandos

```bash
# Smoke con mocks
npm run test:e2e

# Smoke real contra backend
npm run test:e2e:real

# Variante headed (debug visual)
npm run test:e2e:real:headed
```

## Cobertura actual

- `mock`: sidebar responsive + controles PWA en `Settings`.
- `real`: autenticacion real contra backend + navegacion por rol (`admin`, `ingeniero`, `supervisor`) y verificacion de `Settings/PWA`.
