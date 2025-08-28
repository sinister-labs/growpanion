# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Commands
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for web deployment
- `npm run build:web` - Build web application
- `npm run build:tauri` - Build for Tauri desktop app (creates static export)
- `npm run lint` - Run ESLint
- `npm run clean` - Clean build artifacts (.next, out directories)
- `npm run tauri` - Run Tauri commands

### Tauri Development
- `npm run tauri build` - Build desktop application
- Tauri config: `src-tauri/tauri.conf.json`
- Desktop builds use static export mode via `.env.tauri`

## Architecture Overview

### Deployment Modes
GrowPanion supports two deployment modes controlled by `NEXT_PUBLIC_DEPLOYMENT_MODE`:
- **Web Mode** (`web`): Dynamic Next.js routing, server-side rendering
- **Tauri Mode** (`tauri`): Static export for desktop application, client-only

Mode switching is handled in `next.config.mjs` with conditional export configuration.

### Data Storage
- **Local-only data storage** using Dexie.js (IndexedDB wrapper)
- Database schema in `lib/db.ts` with versioned migrations
- Core entities: Grows, Plants, FertilizerMixes, Settings
- No external database - all data stored client-side

### Key Libraries & Frameworks
- **Frontend**: Next.js 14.2+ with App Router, React 18, TypeScript
- **UI**: Tailwind CSS, shadcn/ui components (Radix UI primitives)
- **Database**: Dexie.js for IndexedDB operations
- **Desktop**: Tauri 2.0 (Rust-based)
- **External APIs**: Tuya Cloud API for IoT sensor integration
- **State Management**: React hooks with custom hooks in `/hooks`

### Project Structure
- `app/` - Next.js App Router pages and API routes
- `components/` - React components including plant-modal with tabbed interface
- `components/ui/` - Base UI components from shadcn/ui
- `hooks/` - Custom React hooks for data management
- `lib/` - Utility libraries (database, API clients, calculations)
- `src-tauri/` - Tauri desktop application configuration

### Core Features
- Cannabis grow lifecycle management (Clone/Seedling → Vegetative → Flowering → Harvest → Curing)
- Environmental monitoring with VPD calculations
- Tuya IoT sensor integration
- Plant strain tracking and genetics
- Nutrient/fertilizer mix management
- Multi-grow support with phase tracking

### Important Files
- `lib/db.ts` - Database schema and operations
- `lib/tuya-api.ts` - Tuya Cloud API integration
- `lib/vpd-utils.ts` - Vapor Pressure Deficit calculations
- `components/plant-modal/` - Complex tabbed plant management interface
- `next.config.mjs` - Conditional export configuration for web/Tauri modes

### Environment Configuration
- `.env.local` - Web mode configuration
- `.env.tauri` - Tauri mode configuration (static export)
- Environment variables switch between dynamic and static modes

The application is designed as a comprehensive cannabis cultivation management tool with dual deployment capabilities for both web and desktop environments.