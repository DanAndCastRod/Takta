# Gemini Context for Takta

You are working on **Takta (OAC-SEO)**, a system for Industrial Engineering standardization.

## 🔑 Key Files
*   `PLAN_MAESTRO_COMPLETE.md`: The single source of truth for requirements and architecture.
*   `DOCUMENTACION_ARQUITECTURA.md`: Visual diagrams (ERD, Architecture Map).
*   `backend/app/models.py`: Deep Data Model (SQLModel).
*   `run_local.ps1`: Script to run the backend.

## 🚀 Current Status
*   Backend initialized (FastAPI).
*   Data Models implemented (Deep Model including Kanban/Audits).
*   API Routers created (`/assets`, `/engineering`, etc.).
*   Frontend pending implementation.

## 💡 Behavior
*   When asked to implement code, follow the **Deep Data Model**.
*   Prioritize **performance** (SQL Server queries) and **usability** (Engineer UX).
*   If modifyng DB schema, remember to update `models.py`.
