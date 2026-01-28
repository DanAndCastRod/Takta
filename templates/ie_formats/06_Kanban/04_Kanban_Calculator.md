# Calculadora de Loop Kanban

## Metadatos
- **Código Formato**: KAN-04
- **Item**: {{item_name}}

## Variables
1. **D** (Demanda Promedio): {{demand}} un/día
2. **L** (Lead Time Reposición): {{lead_time}} días
3. **SS** (Stock Seguridad %): {{safety_stock_pct}}%
4. **C** (Capacidad Contenedor): {{container_capacity}} un

## Fórmula
> N = (D * L * (1 + SS)) / C

## Resultados
- **N (Número de Tarjetas)**: {{cards_calculated}}
- **Stock Máximo (N * C)**: {{max_inventory}}
