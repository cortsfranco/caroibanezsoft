# Design Guidelines: Sistema de Nutrición Carolina Ibáñez

## Design Approach
**System-Based Approach**: Modern SaaS dashboard aesthetic inspired by Linear, Vercel, and professional health tech platforms. Prioritizes data clarity, clinical precision, and efficient workflows over decorative elements.

## Core Design Principles
1. **Clinical Precision**: Clear data hierarchy, scannable layouts, minimal visual noise
2. **Workflow Efficiency**: Reduce clicks, predictable patterns, keyboard-friendly
3. **Professional Trust**: Clean, modern, medical-grade reliability

---

## Typography System

**Font Stack**: Inter (via Google Fonts CDN)
- Headings: 600-700 weight, tight tracking (-0.02em)
- Body: 400-500 weight, relaxed line-height (1.6)
- Data/Numbers: 500-600 weight, tabular-nums for alignment

**Scale**:
- Page Title: text-3xl (30px)
- Section Headers: text-xl (20px)
- Card Headers: text-lg (18px)
- Body/Forms: text-base (16px)
- Labels/Metadata: text-sm (14px)
- Captions: text-xs (12px)

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16
- Micro spacing (cards, buttons): 2, 4
- Component spacing: 6, 8
- Section spacing: 12, 16

**Grid Structure**:
- Dashboard: Sidebar (280px fixed) + Main content (flex-1 with max-w-7xl)
- Forms: Single column max-w-2xl with consistent field spacing (space-y-6)
- Tables: Full width with horizontal scroll on mobile
- Cards: Grid responsive (grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6)

---

## Component Library

### Navigation
**Sidebar Navigation** (Fixed left):
- Logo/branding top (h-16)
- Main nav items with icons (py-3 px-4)
- Active state: subtle background, medium font weight
- Grouped sections with subtle dividers
- User profile/settings at bottom

**Top Bar**:
- Breadcrumbs for context
- Quick actions (search, notifications)
- Patient selector dropdown when applicable

### Forms & Data Entry
**Anthropometric Forms**:
- Grouped fieldsets with clear labels
- 2-column layout on desktop (grid-cols-2 gap-x-6)
- Inline validation with instant feedback
- Unit indicators (kg, cm, mm) positioned right
- "Guardar" primary button, "Cancelar" secondary

**Input Fields**:
- Clear labels above inputs (text-sm font-medium mb-2)
- Input height: h-10 with rounded-md borders
- Focus states: prominent outline
- Error states: red border with error message below

### Data Display
**Patient Cards**:
- Clean card design (rounded-lg border shadow-sm)
- Header: Patient name + age
- Key metrics in grid (2x2 or 3x3)
- Action buttons bottom-right
- Hover state: subtle shadow lift

**Measurement Tables**:
- Striped rows for readability (even:bg-muted)
- Fixed header on scroll
- Right-aligned numeric columns
- Color-coded indicators (Score-Z ranges)

**Dashboard Charts** (Tremor):
- Line charts for temporal evolution
- Bar charts for group comparisons
- Donut charts for body composition
- Consistent color palette across all charts
- Clear axis labels and legends

### Informes (Reports)
**PDF Preview Component**:
- Full-width preview with zoom controls
- Download/Print buttons top-right
- Metadata sidebar (patient, date, measurements)

### Biblioteca de Dietas
**Diet Cards Grid**:
- Visual thumbnail (if image available) or icon
- Diet name, calories, macro split
- Tags for categorization
- Edit/Duplicate/Delete actions on hover

---

## Page-Specific Layouts

### Dashboard (Home)
- Top: KPI cards (4-column grid showing total patients, pending measurements, etc.)
- Middle: Recent activity timeline + Upcoming appointments
- Bottom: Quick charts (patient distribution, average metrics)

### Gestión de Pacientes
- Left: Patient list with search/filter (sidebar pattern)
- Right: Patient detail with tabs (Datos, Mediciones, Planes, Historial)
- Floating action button for "Nuevo Paciente"

### Medición Antropométrica
- Stepper navigation (Datos Básicos → Diámetros → Perímetros → Pliegues)
- Form sections clearly separated
- Real-time calculation preview sidebar
- Sticky footer with navigation buttons

### Biblioteca de Dietas
- Header with search and "Nueva Dieta" button
- Grid of diet cards
- Modal for diet editor with rich text + macro calculator

---

## Interactive States
- Buttons: Subtle scale on hover (scale-[0.98]), instant press feedback
- Cards: Shadow lift on hover (hover:shadow-md transition)
- Tables: Row highlight on hover (hover:bg-muted/50)
- Inputs: Focus ring (ring-2 ring-primary ring-offset-2)

## Accessibility
- Semantic HTML throughout
- ARIA labels on interactive elements
- Keyboard navigation with visible focus states
- Form fields with associated labels and error messages
- Sufficient contrast ratios (WCAG AA minimum)

---

## Images
**Not applicable** - This is a data-focused utility application. Use icons (Lucide React via Shadcn) for visual hierarchy, not decorative imagery.