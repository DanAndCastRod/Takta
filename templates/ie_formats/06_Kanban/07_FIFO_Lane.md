# Cálculo de Carril FIFO

## Metadatos
- **Código Formato**: KAN-07
- **Procesos**: De {{process_a}} a {{process_b}}

## Variables
- **Tasa de Producción A (Supply)**: {{rate_a}} un/h
- **Tasa de Consumo B (Demand)**: {{rate_b}} un/h
- **Tiempo de Desacople (Tiempo de Parada Permitido)**: {{decouple_time}} min

## Cálculo de Max WIP
> Max Stock = (Tasa Consumo * Tiempo Desacople) + Lote de Transferencia

- **Max WIP**: {{max_wip}} unidades
- **Longitud Física Carril**: {{lane_length}} metros (asumiendo {{unit_size}} m/unidad)
