# Hoja de Cronometraje (Ingeniería de Tiempos)

## Metadatos
- **Código Formato**: WM-01
- **Activo**: {{asset_name}}
- **Actividad Estándar**: {{activity_name}}
- **Operario Evaluado**: {{operator_name}}
- **Analista**: {{analyst_name}}

## Condiciones
- **Suplementos (Allowances)**: {{allowances_pct}}% (Fatiga, Necesidades)
- **Factor de Ritmo (Rating)**: {{rating_factor}} (escala 100%)

## Registro de Ciclos (Minutos decimales)

| Elemento Tarea | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | Promedio (MO) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A. Elemento 1 | | | | | | | | | | | |
| B. Elemento 2 | | | | | | | | | | | |
| C. Elemento 3 | | | | | | | | | | | |

## Cálculo
1. **Tiempo Observado Total (MO)**: {{mo_total}}
2. **Tiempo Normal (TN)** = MO x (Rating / 100) = {{tn_value}}
3. **Tiempo Estándar (TE)** = TN x (1 + Suplementos) = {{te_value}}
