# Overview

Sistema de Nutrición Carolina Ibáñez is a comprehensive nutrition management platform for nutritionists. It facilitates patient data tracking, anthropometric measurement management, diet assignment, and report generation. The application features a modern full-stack architecture with a React frontend and an Express backend, leveraging a PostgreSQL database via Neon serverless. Key capabilities include ISAK 2 anthropometric measurement support with automatic BMI calculation, real-time data synchronization via WebSockets, Excel import/export, AI-powered diet generation, and automated PDF report generation for professional assessments.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework & Routing**: React 18 with Wouter for a lightweight Single Page Application (SPA) experience.
**State Management**: TanStack Query (React Query) handles server state with aggressive caching, avoiding a global state management library.
**UI Component System**: Radix UI primitives are used with custom shadcn/ui components in the "New York" style, styled with Tailwind CSS following a custom design system inspired by Linear and Vercel.
**Design System**: Features the Inter font, an HSL-based color system with CSS variables for light/dark themes, and consistent spacing units.
**Real-time Updates**: A WebSocket client invalidates React Query cache on server broadcasts, ensuring UI synchronization.
**Form Handling**: React Hook Form with Zod validation is used for type-safe forms, implementing optimistic locking with version fields.

## Backend Architecture

**Framework**: Express.js with TypeScript, serving API endpoints and static frontend files.
**API Design**: RESTful endpoints under `/api/*` with consistent JSON responses and error handling.
**Database Layer**: Drizzle ORM integrates with Neon serverless PostgreSQL, abstracted by the `DbStorage` class.
**Optimistic Locking**: Core entities include a `version` field to prevent concurrent update conflicts.
**WebSocket Layer**: A custom WebSocket manager broadcasts entity changes for real-time synchronization.

## Data Model

**Core Entities**: Patients (demographics, objectives, preferences, medical conditions, exercise), Patient Groups, Group Memberships, Measurements (ISAK 2 with BMI), Measurement Calculations, Diets, Diet Assignments, Diet Templates, Diet Generations, Reports, Weekly Diet Plans (template-based), Weekly Plan Assignments, Weekly Plan Meals, Meal Catalog (with categories, images, nutritional data), and Meal Tags.
**Schema Organization**: All database schemas are defined in `shared/schema.ts` using Drizzle with Zod for shared client/server validation.
**Weekly Planner Architecture**: Employs a template+assignment pattern for bulk deployment and efficient management of meal plans.

## AI Integration

**LangChain + LangGraph**: Implements a state machine for diet generation using Azure OpenAI, allowing for patient context gathering, analysis, template selection, structured diet plan generation, and a validation workflow.
**Structured Output**: Zod schemas are converted to JSON Schema to enforce structured LLM outputs.
**Service Architecture**: Includes `diet-ai-service.ts` for the full LangGraph workflow and `diet-ai-service-simple.ts` for simplified direct LLM calls.

## Build & Deployment

**Development**: `npm run dev` starts Vite dev server with HMR and Express API proxy.
**Production Build**: `vite build` for the frontend and `esbuild` for the Express server.
**Start**: `npm start` runs the bundled Express server.
**Environment Variables**: `DATABASE_URL` (Neon PostgreSQL) and `AZURE_OPENAI_*` (optional for AI features) are critical.

# External Dependencies

## Database

**Neon Serverless PostgreSQL**: The primary data store, using `@neondatabase/serverless` for connection pooling.
**Migration Strategy**: Drizzle Kit is used for schema synchronization (`npm run db:push`), with manual SQL migrations for complex changes.

## AI Services

**Azure OpenAI**: Optional integration for AI-powered diet generation, utilizing GPT models via `@langchain/openai`.
**LangChain Ecosystem**: `@langchain/langgraph` for state graph orchestration and `@langchain/openai` for Azure OpenAI adaptation.

## Third-Party UI Libraries

**Radix UI**: Headless components for accessibility and composability.
**Tremor React**: Data visualization components for dashboards.
**Recharts**: Chart rendering library for graphs and analytics.
**XLSX (SheetJS)**: For Excel import/export functionality.

## Development Tools

**Vite Plugins**: Includes `@vitejs/plugin-react` for HMR, and Replit-specific plugins for error overlays, cartography, and dev banners.
**Validation**: Zod is used for runtime type validation, integrated with `drizzle-zod`.