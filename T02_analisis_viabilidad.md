# T02 - Análisis de Viabilidad

## Información de la Solicitud

| Campo | Valor |
|-------|-------|
| **ID Solicitud** | SOL-2026-001 |
| **Título** | Sistema de Estandarización Operativa (OAC-SEO) |
| **Analista** | Daniel Castaneda |
| **Fecha análisis** | 2026-01-22 |

---

## 1. Resumen Ejecutivo

El proyecto OAC-SEO busca digitalizar y estandarizar la ingeniería de procesos en las plantas de beneficio. Es un proyecto de alta complejidad técnica debido a la necesidad de modelar relaciones recursivas (jerarquías de activos variables) y proporcionar herramientas visuales interactivas (VSM, Diagramas) en un entorno web. Sin embargo, es **altamente viable** dado el impacto directo en la reducción de costos y la clara definición de las fases en el Plan Maestro. Requiere un stack robusto y un diseño enfocado en la experiencia de usuario en planta.

---

## 2. Evaluación Técnica

### Complejidad
| Aspecto | Baja | Media | Alta |
|---------|------|-------|------|
| Frontend | ⬜ | ⬜ | ✅ |
| Backend | ⬜ | ⬜ | ✅ |
| Integraciones | ⬜ | ✅ | ⬜ |
| Datos | ⬜ | ⬜ | ✅ |

### Stack Sugerido
- **Frontend**: HTML5, JavaScript (ES6+), Bootstrap Bios Apps (Estricto cumplimiento de Diseño), Editor.js.
- **Backend**: FastAPI (Python) - Seleccionado por rendimiento asíncrono y facilidad de modelado con SQLModel.
- **Base de Datos**: SQL Server (Modelo Relacional con soporte de jerarquías).

---

## 3. Recursos Requeridos

| Recurso | Cantidad | Disponibilidad |
|---------|----------|----------------|
| Desarrollador FullStack | 2 | Media |
| Analista Funcional/Procesos | 1 | Alta |
| QA | 1 | Media |

---

## 4. Estimación de Tiempo

| Fase | Días |
|------|------|
| Diseño | 10 |
| Desarrollo (Fases 1-3) | 45 |
| Pruebas | 15 |
| Despliegue Piloto | 10 |
| **Total** | **80 Días** |

---

## 5. Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Resistencia a la adopción digital en planta | Alta | Alto | UX/UI intuitivo, capacitación intensiva y gestión del cambio (Fase 4 - Cultura). |
| Complejidad en modelado de datos jerárquico | Media | Alto | Uso de relaciones reflexivas en SQLModel y optimización de consultas. |
| Conectividad intermitente en zonas de planta | Media | Medio | Implementación de capacidades Offline-first o PWA donde sea posible. |

---

## 6. Dependencias

- Definición final de la jerarquía de activos por parte de Ingeniería de Procesos.
- Acceso a servidores para despliegue de Django/DB.
- Disponibilidad de tablets/dispositivos en planta para las pruebas.

---

## 7. Decisión

| Decisión | Selección |
|----------|-----------|
| ✅ **Aprobar** | Pasa a Backlog |
| ⬜ **Rechazar** | Justificar abajo |
| ⬜ **Requiere más info** | Devolver a solicitante |

### Comentarios
El proyecto está alineado con la estrategia de Transformación Digital 2026. Se aprueba el inicio de la Fase 1 (Arquitectura).

---

**Firma Líder TD**: _________________ **Fecha**: _________
