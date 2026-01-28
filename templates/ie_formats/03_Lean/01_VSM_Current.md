# Value Stream Map (VSM) - Estado Actual

## Metadatos
- **Código Formato**: LEAN-01
- **Familia de Producto**: {{product_family}}
- **Demanda Cliente**: {{customer_demand}} un/mes

## Flujo de Valor

| Procesos (Cajas) | Inventario (Triángulos) | Tiempo Ciclo (CT) | Tiempo Cambio (CO) | Disponibilidad |
|------------------|:-----------------------:|:-----------------:|:------------------:|:--------------:|
| 1. Corte | 500 un (2 días) | 30s | 15m | 90% |
| 2. Ensamble | 200 un (0.5 días) | 45s | 0m | 95% |
| 3. Empaque | 1000 un (Prod Termin) | 10s | 5m | 98% |

## Línea de Tiempo
- **Lead Time Total (LT)**: {{total_lead_time}} días
- **Tiempo Valor Agregado (VAT)**: {{total_vat}} seg
- **Eficiencia de Ciclo (VAT/LT)**: {{pce_pct}}%
