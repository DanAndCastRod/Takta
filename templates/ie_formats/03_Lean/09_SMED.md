# Registro SMED (Single Minute Exchange of Die)

## Metadatos
- **Código Formato**: LEAN-09
- **Máquina**: {{machine_name}}
- **Cambio de**: {{product_from}} **a**: {{product_to}}

## Análisis del Cambio
- **Tiempo Inicio (Parada)**: {{start_time}}
- **Tiempo Fin (Primera pieza buena)**: {{end_time}}
- **Duración Total**: {{total_duration}} min

## Desglose de Actividades

| Actividad | Duración (min) | Tipo (Interna/Externa) | Conversión Posible? |
|-----------|:--------------:|:----------------------:|:-------------------:|
| Buscar herramientas | 10 | Interna (Máq Parada) | ✅ Externalizar |
| Cambiar molde | 15 | Interna | ❌ No |
| Ajustar parámetros | 5 | Interna | 🟡 Reducir |
| Limpiar zona | 10 | Externa (Máq Andando)| N/A |
