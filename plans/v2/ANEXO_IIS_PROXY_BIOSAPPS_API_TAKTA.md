# Anexo IIS: Reverse Proxy para `biosapps.grupobios.co/api_takta/`

Objetivo: exponer el backend interno de Takta (PM2 en `127.0.0.1:8105`) bajo el prefijo corporativo `/api_takta/`.

## 1. Requisitos IIS

- IIS URL Rewrite instalado.
- IIS Application Request Routing (ARR) instalado.
- En ARR, habilitar `Enable proxy`.

## 2. Regla sugerida (`web.config`)

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="TaktaApiProxy" stopProcessing="true">
          <match url="^api_takta/(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:8105/{R:1}" appendQueryString="true" />
          <serverVariables>
            <set name="HTTP_X_FORWARDED_PROTO" value="https" />
            <set name="HTTP_X_FORWARDED_HOST" value="biosapps.grupobios.co" />
          </serverVariables>
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

## 3. Validaciones

1. `https://biosapps.grupobios.co/api_takta/` responde mensaje de health.
2. `https://biosapps.grupobios.co/api_takta/api/auth/me` responde (401 o 200 según token).
3. Desde frontend interno, `VITE_API_URL=https://biosapps.grupobios.co/api_takta/api` sin errores de CORS.

## 4. Errores comunes

- `502.3`: backend no está corriendo en `8105` o firewall local bloquea loopback.
- `404`: patrón `match` incorrecto o sitio equivocado en IIS.
- `401` en módulos: token expirado o `Authorization` no está llegando al backend.
