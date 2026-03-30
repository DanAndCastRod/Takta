# Guia de White Label - Takta

Version: 1.0  
Fecha: 2026-03-29  
Estado: Activa

---

## 1. Objetivo

Esta guia explica como usar la capacidad white label de Takta para personalizar la identidad visual por tenant.

El alcance actual incluye:

- Nombre de marca.
- Badge o subtitulo corto.
- Logo por URL.
- Paleta principal de colores.
- Persistencia por tenant.

---

## 2. Que personaliza hoy

La implementacion actual permite personalizar por tenant:

- `brand_name`: nombre visible de la plataforma.
- `badge_label`: sello corto que acompana la marca.
- `logo_url`: logo cargado por URL.
- `colors.brand_orange`: color principal de CTA y acentos.
- `colors.brand_orange_dark`: color hover/estado fuerte.
- `colors.surface`: superficie principal.
- `colors.surface_soft`: superficie secundaria.
- `colors.text_primary`: texto principal.
- `colors.text_secondary`: texto secundario.

Estos cambios impactan actualmente:

- Navbar.
- Login.
- Pagina de configuracion.
- Botones y utilidades visuales que usan la paleta de marca.
- Varias clases legacy `orange-*` puenteadas a la paleta runtime.

---

## 3. Requisitos

- Tener acceso autenticado.
- Tener rol con permiso para actualizar configuracion de plataforma.
- Tener creado el tenant objetivo.
- Contar con una URL publica o accesible para el logo.

---

## 4. Ruta funcional

La configuracion se realiza desde:

- `#/settings`
- Seccion: `White Label y Feature Flags`

Flujo general:

1. Seleccionar el tenant.
2. Editar la identidad visual.
3. Guardar branding.
4. Validar navbar, login y componentes principales.

---

## 5. Campos de configuracion

### Marca

- Campo: `Marca`
- Uso: nombre principal visible en navbar y login.
- Recomendacion: usar nombre corto, de 1 a 3 palabras.

### Badge

- Campo: `Badge`
- Uso: descriptor corto junto al nombre de marca.
- Recomendacion: maximo 20 caracteres visibles.

### Logo URL

- Campo: `Logo URL`
- Uso: logo mostrado en navbar y login.
- Recomendacion:
  - Preferir `SVG` o `PNG` con fondo transparente.
  - Usar URL estable.
  - Evitar archivos muy pesados.

### Colores

- `Marca principal`: CTA base, estados activos y acentos.
- `Marca hover`: hover o variante intensa.
- `Superficie base`: fondos base del preview y piezas tematicas.
- `Superficie suave`: fondos suaves, chips y tarjetas secundarias.
- `Texto principal`: titulos y texto fuerte.
- `Texto secundario`: texto auxiliar y descripciones.

---

## 6. Procedimiento recomendado

### Caso A: Crear identidad para un tenant nuevo

1. Ingresar a `#/settings`.
2. Seleccionar el tenant.
3. Definir `Marca`.
4. Definir `Badge`.
5. Pegar `Logo URL`.
6. Cargar la paleta principal.
7. Revisar el preview.
8. Guardar branding.
9. Cambiar de modulo y validar consistencia visual.

### Caso B: Ajustar una marca existente

1. Seleccionar el tenant.
2. Cambiar solo los campos necesarios.
3. Confirmar preview.
4. Guardar branding.
5. Recargar sesion visual si el navegador conserva cache agresivo.

---

## 7. Validacion funcional

Despues de guardar, validar:

- Navbar muestra logo o fallback con inicial.
- Navbar muestra nombre y badge correctos.
- Login usa la misma identidad.
- Botones principales adoptan color de marca.
- Hover usa el color fuerte configurado.
- Tarjetas o superficies suaves no rompen contraste.
- Texto principal y secundario siguen siendo legibles.

Checklist minima:

- `Marca` visible.
- `Badge` visible.
- `Logo` cargando sin error.
- `CTA principal` con color correcto.
- `Hover` correcto.
- `Contraste` aceptable.

---

## 8. Buenas practicas de diseno

- Mantener contraste alto entre fondo y texto.
- No usar logos con mucho espacio en blanco.
- Evitar colores demasiado cercanos entre `brand_orange` y `brand_orange_dark`.
- Evitar `surface` oscuros si el resto de la UI no fue pensada para dark mode.
- Mantener `text_primary` oscuro cuando `surface` sea claro.

Configuracion segura sugerida:

- Fondo claro.
- Texto principal oscuro.
- Texto secundario gris oscuro.
- Color de marca saturado pero no fluorescente.
- Hover ligeramente mas oscuro que el color base.

---

## 9. Comportamiento tecnico

El branding se resuelve por tenant a traves del runtime:

1. Frontend solicita runtime del tenant.
2. Backend devuelve `theme`.
3. Frontend guarda runtime local.
4. Frontend aplica variables CSS.
5. Navbar y login consumen `brand_name`, `badge_label` y `logo_url`.

Variables visuales aplicadas hoy:

- `--brand-orange`
- `--brand-orange-dark`
- `--color-brand-orange`
- `--color-brand-orange-dark`
- `--surface`
- `--surface-soft`
- `--surface-muted`
- `--border-subtle`
- `--text-primary`
- `--text-secondary`
- `--text-muted`
- `--font-family-runtime`

---

## 10. Limitaciones actuales

- El logo depende de una URL valida; no hay carga binaria directa desde la UI.
- El white label esta centrado en identidad visual, no en plantillas de contenido.
- No toda la aplicacion usa tokens 100 por ciento puros; existe una capa puente para clases legacy.
- No se validan reglas de contraste automaticamente desde Settings.

---

## 11. Problemas frecuentes

### El logo no aparece

Revisar:

- URL incorrecta.
- Recurso bloqueado por permisos.
- Recurso no publico.
- Formato incompatible o respuesta no imagen.

### El color no cambia en todas partes

Posibles causas:

- La vista no fue recargada todavia.
- Existe una clase legacy no cubierta por la paleta.
- El navegador conserva cache de CSS.

### La marca cambia en navbar pero no en login

Revisar:

- Que el runtime se haya guardado correctamente.
- Que el usuario este entrando desde la misma sesion/navegador.
- Que no exista cache vieja del frontend.

---

## 12. Flujo de soporte

Si un tenant reporta problema de branding:

1. Confirmar tenant afectado.
2. Abrir `#/settings`.
3. Validar campos guardados.
4. Probar logo URL directamente.
5. Confirmar cambio en navbar.
6. Confirmar cambio en login.
7. Si persiste, revisar runtime del tenant y cache del navegador.

---

## 13. Referencias tecnicas

Archivos clave:

- `frontend/src/pages/SettingsPage.js`
- `frontend/src/services/tenant-ui.service.js`
- `frontend/src/components/layout/Navbar.js`
- `frontend/src/pages/Login.js`
- `frontend/src/style.css`
- `backend/app/api/platform.py`

---

## 14. Criterio de listo

Un tenant puede considerarse correctamente white-labeleado cuando:

- Tiene identidad propia visible.
- El logo carga de forma estable.
- Los CTA respetan la paleta configurada.
- Login y navbar muestran la misma marca.
- No hay perdida de legibilidad.
