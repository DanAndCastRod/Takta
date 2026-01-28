# Claude Context for Takta

**Project**: Takta (Sistema de Estandarización Operativa)
**Company**: Grupo BIOS (OAC)

## Architecture Overview
*   **Architecture**: Decoupled Monolith (FastAPI Backend + Thin Client Frontend).
*   **Data**: SQL Server with a focus on Hierarchical Data (`Asset` Tree) and Relational Integrity (`ProcessStandard`).
*   **Frontend**: Custom implementation using Bios Design System (Bootstrap wrapper) and `Editor.js`.

## Development Guidelines
1.  **Backend**: Write async FastAPI endpoints. Use `SQLModel` strictly.
2.  **Frontend**: Generate modular HTML/JS. Logic should be in separate `.js` files, not inline.
3.  **Documentation**: Keep `DOCUMENTACION_ARQUITECTURA.md` updated if you change the system design.

## User Persona
"Engineer Daniel". He needs precise tools. Do not suggest "modernizing" to React/Next.js unless explicitly asked; the current stack is chosen for maintainability in the specific corporate environment.
