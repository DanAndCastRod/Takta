# Project Context: Takta (OAC-SEO)

## 📌 Abstract
Takta is a comprehensive digital platform for **Industrial Engineering** and **Operational Excellence** at Operadora Avícola Colombia. It replaces legacy Excel/Paper formats with a unified database-driven system.

## 🎯 Core Functionality (Modules)
1.  **Assets**: Recursive tree management of Sites > Lines > Machines.
2.  **Engineering (Methods)**: Digital SOPs, Time Studies, Standard Time Calculation.
3.  **Continuous Improvement**: Action Tracker for Kaizen, A3, and Issue Management.
4.  **Audits**: 5S and Quality Checklists with scoring and radar charts.
5.  **Logistics**: Kanban Loop calculator and Heijunka planning.
6.  **Documents**: 60+ Unified formats (DOP, DAP, VSM) using `Editor.js`.

## 💾 Data Model High-Level
*   **The Triad**: `Asset` + `StandardActivity` + `ProductReference` = `ProcessStandard`.
*   **Action Tracking**: Centralized `ImprovementAction` table linked to any source document.

## 📂 Directory Structure
*   `/backend`: FastAPI Application.
*   `/templates/ie_formats`: Markdown templates for the document engine.
*   `/plans`: Archived planning documents.
*   `PLAN_MAESTRO_COMPLETE.md`: **Master Plan**. do not ignore.

## 🔗 Execution
Run backend locally: `.\run_local.ps1` (Port 9003).
Deploy: `.\deploy.ps1`.
