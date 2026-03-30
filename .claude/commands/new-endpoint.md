Agregar un nuevo endpoint al backend de Takta.

Preguntar al usuario:
- Router destino (nombre del archivo en backend/app/api/)
- Metodo HTTP y ruta
- Que hace el endpoint
- Modelo de datos involucrado

Luego:
1. Leer el router destino completo
2. Verificar si el modelo existe en backend/app/models.py
3. Si no existe el modelo, agregarlo al final de models.py
4. Escribir el endpoint async con tipado completo siguiendo el patron del router
5. Agregar prueba en backend/tests/ siguiendo el patron de conftest.py
6. Verificar que el router este registrado en backend/app/main.py
7. Actualizar task.md marcando el item correspondiente
8. Agregar entrada en walkthrough.md
