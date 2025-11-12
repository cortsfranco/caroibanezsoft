# Overview

Sistema de Nutrición Carolina Ibáñez is a comprehensive nutrition management platform designed for nutritionists to track patient data, manage anthropometric measurements, assign diets, and generate reports. The application uses a modern full-stack architecture with React frontend and Express backend, connected to a PostgreSQL database via Neon serverless.

The system implements the ISAK 2 anthropometric measurement standard (5 components - D. Kerr 1988) and provides real-time data synchronization via WebSockets, Excel import/export capabilities, and AI-powered diet generation using Azure OpenAI integration.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework & Routing**: React 18 with Wouter for client-side routing, providing a lightweight SPA experience.

**State Management**: TanStack Query (React Query) for server state management with aggressive caching strategies (`staleTime: Infinity`). No global state management library - relies on React Query's built-in cache and URL-based state for navigation.

**UI Component System**: Radix UI primitives with custom shadcn/ui components following the "New York" style variant. Uses Tailwind CSS with a custom design system defined in `design_guidelines.md` inspired by Linear and Vercel aesthetics.

**Design System**: 
- Typography: Inter font family via Google Fonts CDN
- Color System: HSL-based with CSS variables for light/dark theme support
- Spacing: Tailwind units (2, 4, 6, 8, 12, 16) for consistent rhythm
- Elevation: Custom `hover-elevate` and `active-elevate` utilities for interactive feedback

**Real-time Updates**: WebSocket client (`lib/websocket.ts`) automatically invalidates React Query cache when server broadcasts entity changes, ensuring UI stays synchronized across tabs/users.

**Form Handling**: React Hook Form with Zod validation for type-safe form schemas. Implements optimistic locking pattern with version fields to prevent concurrent update conflicts.

## Backend Architecture

**Framework**: Express.js with TypeScript, serving both API endpoints and static frontend files in production.

**API Design**: RESTful endpoints under `/api/*` namespace with consistent error handling and JSON responses. All routes defined in `server/routes.ts`.

**Database Layer**: Drizzle ORM with Neon serverless PostgreSQL driver. The `DbStorage` class (`server/db-storage.ts`) implements the `IStorage` interface, providing a clean abstraction over database operations.

**Optimistic Locking**: All core entities (patients, groups, measurements, diets) include a `version` integer field. Update operations check version and increment it, throwing `VersionConflictError` if concurrent modifications detected.

**WebSocket Layer**: Custom WebSocket manager (`server/websocket.ts`) broadcasts entity changes (create/update/delete events) to all connected clients for real-time synchronization.

**Development Tools**: Vite dev server with HMR in development mode, automatic error overlay, and Replit-specific plugins for cartographer and dev banner when running in Replit environment.

## Data Model

**Core Entities**:
- **Patients**: Comprehensive profile including demographics, health objectives, dietary preferences (vegetarian/vegan), allergies, medical conditions, exercise habits (sport type, training days/schedule)
- **Patient Groups**: Organization system for categorizing patients (e.g., "Gimnasia", "Consultorio")
- **Group Memberships**: Many-to-many relationship between patients and groups
- **Measurements**: ISAK 2 anthropometric data (weight, height, skinfolds, circumferences, breadths) with automatic BMI calculation
- **Measurement Calculations**: Derived metrics (body composition, somatotypes) stored separately for historical tracking
- **Diets**: Macronutrient profiles with meal plans
- **Diet Assignments**: Links diets to patients with date ranges and custom notes
- **Diet Templates**: Reusable diet blueprints for AI generation
- **Diet Generations**: AI-generated diet plans with approval workflow (draft/approved/rejected states)
- **Reports**: Generated nutrition reports (currently placeholder for future implementation)
- **Weekly Diet Plans**: Template-based weekly meal plans with `isTemplate` flag. Templates are reusable blueprints that can be assigned to multiple groups/patients without duplication
- **Weekly Plan Assignments**: Links weekly plan templates to patient groups or individual patients with date ranges and assignment notes. Enforces exactly one of `groupId` or `patientId` via Zod validation for clean assignment semantics
- **Weekly Plan Meals**: Individual meal slots within weekly plans, supporting multiple meals per time slot with individual editable times
- **Meal Catalog**: Centralized meal library with optional categories, image upload/AI generation, nutritional data, and tagging system
- **Meal Tags**: Dynamic, editable tags for categorizing meals (replaces fixed MEAL_CATEGORIES)

**Schema Organization**: All database schemas defined in `shared/schema.ts` using Drizzle's table definitions with Zod schemas for validation. Schemas are shared between client and server via path aliases.

**Weekly Planner Architecture**: Uses template+assignment pattern to enable bulk deployment and prevent data explosion:
- **Templates** (`isTemplate=true`): Created once, contain 7-day meal grids with multiple meals per time slot
- **Assignments** (`weeklyPlanAssignments`): Reference templates and assign to groups/patients with date ranges
- **Benefits**: Create 1 template → assign to 20+ patients in seconds, update template → all assignments reflect changes
- **REST Endpoints**: Full CRUD for plans/assignments plus helper endpoints `/api/weekly-plans/:id/assign-to-group` and `/assign-to-patient`

## AI Integration (In Development)

**LangChain + LangGraph**: Implements a state machine workflow for diet generation using Azure OpenAI (`@langchain/openai`). The graph-based approach allows for:
1. Patient context gathering
2. Measurement analysis
3. Template selection
4. Structured diet plan generation
5. Validation and approval workflow

**Structured Output**: Uses Zod schemas converted to JSON Schema for enforcing structured LLM outputs (meals, ingredients, macros, timing).

**Service Architecture**: Two implementations:
- `diet-ai-service.ts`: Full LangGraph workflow with state management
- `diet-ai-service-simple.ts`: Simplified direct LLM calls for faster iteration

**Note**: Azure OpenAI configuration requires environment variables (`AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`).

## Build & Deployment

**Development**: `npm run dev` starts Vite dev server with Express API proxy
**Production Build**: 
1. `vite build` compiles React app to `dist/public`
2. `esbuild` bundles Express server to `dist/index.js`
**Start**: `npm start` runs bundled Express server serving static files and API

**Environment Variables**:
- `DATABASE_URL`: Required for PostgreSQL connection (Neon serverless)
- `AZURE_OPENAI_*`: Optional for AI diet generation features
- `NODE_ENV`: Controls production vs development behavior

# External Dependencies

## Database

**Neon Serverless PostgreSQL**: Primary data store using WebSocket-based connection pooling via `@neondatabase/serverless`. Connection configured in `server/db.ts` with Drizzle ORM integration.

**Current Status**: Documentation indicates Neon database is currently disabled - system will need database provisioning before use.

**Migration Strategy**: Drizzle Kit for schema migrations (`npm run db:push` to sync schema without migration files).

## AI Services

**Azure OpenAI**: Optional integration for diet generation features using GPT models via `@langchain/openai`. Configured for Azure-specific endpoints and deployments.

**LangChain Ecosystem**:
- `@langchain/langgraph`: State graph orchestration for multi-step AI workflows
- `@langchain/openai`: Azure OpenAI adapter with structured output support

## Third-Party UI Libraries

**Radix UI**: Headless component primitives for accessibility and composability (accordions, dialogs, dropdowns, tooltips, etc.)

**Tremor React**: Data visualization components (charts, metrics) - version 3.18.7 used for dashboard statistics.

**Recharts**: Chart rendering library for measurement history graphs and dashboard analytics.

**XLSX (SheetJS)**: Excel import/export functionality in `components/excel-import-export.tsx`.

## Development Tools

**Vite Plugins**:
- `@vitejs/plugin-react`: React Fast Refresh
- `@replit/vite-plugin-runtime-error-modal`: Development error overlay
- `@replit/vite-plugin-cartographer`: Code navigation (Replit-specific)
- `@replit/vite-plugin-dev-banner`: Dev environment indicator

**Validation**: Zod for runtime type validation with `drizzle-zod` integration for automatic schema generation from database tables.

## Session Management

**connect-pg-simple**: PostgreSQL-backed session store for Express sessions (dependency present but not actively configured in visible code - likely for future authentication implementation).