# Calculadora de Capacidad Instalada (Throughput)

## Metadatos
- **Código Formato**: WM-10
- **Línea**: {{line_name}}
- **Cuello de Botella Identificado**: {{bottleneck_station}}

## Parámetros Base
- Turnos por día: {{shifts_per_day}}
- Horas por turno: {{hours_per_shift}}
- Días laborales/mes: {{work_days_month}}

## Pérdidas de Capacidad

| Concepto | Tiempo (min/turno) | % Impacto |
|----------|--------------------|-----------|
| Almuerzo/Descansos | | |
| Setup / Cambios | | |
| Mantenimiento Plan. | | |
| **Tiempo Disponible Neto** | **{{net_time}}** | |

## Cálculo
1. **Capacidad Teórica (Diseño)**: {{design_capacity}} un/hora
2. **Capacidad Efectiva**: {{effective_capacity}} un/hora
3. **Capacidad Real (Histórica)**: {{real_capacity}} un/hora
4. **Utilización**: {{utilization_pct}}%
