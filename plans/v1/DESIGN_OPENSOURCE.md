# Takta Community Edition - Visual Style Guide

> [!NOTE]
> Esta guía define el estándar visual para **Takta Community (Open Source)**.
> La versión **Enterprise (Grupo BIOS)** utiliza el *Bios Design System* y no está cubierta aquí.

## 🌟 Filosofía de Diseño: "Modern Industrial Glass"

El diseño busca un equilibrio entre la robustez de una herramienta industrial y la estética de una aplicación SaaS moderna.

*   **Paleta**: Slate (Neutros) + Indigo (Acento Primario) + Gradientes sutiles.
*   **Materialidad**: Paneles flotantes con efecto vidrio esmerilado (`backdrop-blur`).
*   **Layout**: Interfaces no-bloqueantes, flotantes sobre el contenido principal (Canvas first).
*   **Iconografía**: SVG Vectorial minimalista de línea fina (Lucide).

---

## 🎨 Design Tokens (TailwindCSS v3.4+)

> [!NOTE]
> Se utiliza **TailwindCSS v3.4+** como estándar. Los tokens definidos aquí son compatibles
> con v4 cuando se migre. La configuración base vive en `frontend/tailwind.config.js`.

### Colores Base
```css
/* Backgrounds */
--bg-main: bg-slate-50;
--bg-panel: bg-white/80 backdrop-blur-md; /* Glass Effect */
--bg-canvas: bg-slate-100;

/* Primary (Indigo) */
--primary-main: bg-indigo-600;
--primary-hover: bg-indigo-700;
--primary-light: bg-indigo-50 text-indigo-700;

/* Text */
--text-primary: text-slate-800;
--text-secondary: text-slate-500;
```

### Sombras y Bordes
*   **Paneles**: `shadow-lg border border-white/50`
*   **Botones**: `rounded-lg shadow-sm border border-slate-200`
*   **Radio de Borde**: `rounded-xl` (12px) para contenedores, `rounded-lg` (8px) para controles.

---

## 🧩 Componentes Core

### 1. Glass Panel
Contenedor principal para barras de herramientas y paneles laterales. Debe flotar sobre el fondo.

```html
<div class="glass-panel rounded-xl shadow-lg border border-white/50 p-4">
  <!-- Content -->
</div>
```

### 2. Floating Toolbar
Barra de navegación o herramientas que flota con margen respecto a los bordes de la ventana.

```html
<!-- Floating Top Bar -->
<div class="h-14 glass-panel m-2 flex items-center justify-between px-4 z-20">
    <!-- Items -->
</div>
```

### 3. Styled Buttons

**Primary Action**:
```html
<button class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-md shadow-indigo-200">
   Guardar
</button>
```

**Tool / Icon Button**:
```html
<button class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-all">
   <!-- SVG Icon -->
</button>
```

---

## 🖌️ Iconografía

Usamos **Lucide Icons** (SVG Inline) para mantener nitidez y escalabilidad.
*   Estilo: `stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`
*   Tamaño estándar: `18px` o `20px`.
*   Color: `currentColor` (hereda del texto).

**Ejemplo (Factory Icon):**
```html
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
  <path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>
</svg>
```

---

## 📐 Patrones UX

### Canvas-First
El área de trabajo (Canvas) debe ocupar el 100% del espacio disponible *detrás* de la UI, no *entre* la UI. Los paneles flotan encima.

### Grid Pattern
Usar un patrón de grid sutil en el fondo del canvas para dar contexto espacial.
```css
.bg-grid-pattern {
    background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
    background-size: 20px 20px;
}
```

### Micro-interacciones
*   **Hover**: Sutil cambio de fondo (`bg-slate-50`) y color (`text-indigo-600`).
*   **Click**: Efecto de escala (`active:scale-95`).
*   **Loading**: Estados de carga con indicadores de pulso (`animate-pulse`).
