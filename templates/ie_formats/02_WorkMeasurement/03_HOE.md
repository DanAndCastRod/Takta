# Hoja de Operación Estándar (HOE)

## Metadatos
- **Código Formato**: WM-03
- **Estación de Trabajo**: {{station_name}}
- **Tiempo Takt**: {{takt_time}} s
- **Tiempo Ciclo**: {{cycle_time}} s

## Layout del Puesto
> Dibujo simple de la mesa de trabajo y ubicación de materiales.

![Layout]({{layout_url}})

## Secuencia de Trabajo

| Secuencia | Elemento de Trabajo | Clase (Manual/Auto/Caminar) | Tiempo (s) | Puntos Clave |
|-----------|---------------------|-----------------------------|------------|--------------|
| 1 | Cargar pieza A | Manual | 5 | Verificar rebabas |
| 2 | Caminar a Prensa | Caminar | 3 | |
| 3 | Prensar | Auto | 15 | |
| 4 | Descargar | Manual | 4 | |

## Gráfico de Pila (Stack Chart)
> Visualización de la carga de trabajo vs Takt Time.
