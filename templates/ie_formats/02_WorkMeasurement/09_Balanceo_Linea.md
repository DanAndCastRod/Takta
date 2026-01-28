# Hoja de Balanceo de Línea (Yamazumi)

## Metadatos
- **Código Formato**: WM-09
- **Línea**: {{line_name}}
- **Demanda Diaria**: {{daily_demand}} un
- **Tiempo Disponible**: {{available_time}} min
- **Takt Time Calculado**: {{takt_time}} min/un

## Carga de Trabajo por Estación

| Estación / Operario | Actividades Asignadas | Tiempo Total (min) | % Ocupación respecto a Takt | Estatus |
|---------------------|-----------------------|:------------------:|:---------------------------:|:-------:|
| OP-1 | A, B, C | 0.9 | 95% | ✅ OK |
| OP-2 | D, E | 1.1 | 115% | ❌ Cuello Botella |
| OP-3 | F | 0.5 | 52% | ⚠️ Ocio |

## Eficiencia de Línea
- **Eficiencia Balanceo**: {{balance_efficiency}}%
- **Headcount Teórico**: {{theoretical_headcount}}
