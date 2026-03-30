Agregar una nueva pagina al frontend de Takta.

Preguntar al usuario:
- Nombre de la pagina (PascalCase)
- Ruta hash (#/ruta)
- Descripcion del modulo

Luego:
1. Leer una pagina existente similar como referencia (frontend/src/pages/)
2. Crear frontend/src/pages/NombrePage.js siguiendo el patron
3. Registrar la ruta en frontend/src/router.js con import dinamico
4. Agregar entrada al sidebar en frontend/src/components/layout/Sidebar.js
5. Usar uiFeedback para notificaciones, nunca alert()
6. Usar prefijos tk-* para componentes CSS
7. Actualizar task.md y walkthrough.md
