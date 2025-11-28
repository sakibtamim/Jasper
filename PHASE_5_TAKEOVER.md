# Phase 5 Takeover: UI Library & Advanced Plugin Features

## 📋 Context
**Phase 4 (Frontend Plugin System)** is complete. The React Dashboard now supports dynamic loading of plugins, which can contribute navigation items, widgets, and full pages.
- **Status**: `PLUGINS_DEV.md` contains the full architecture and status.
- **Documentation**: `PLUGINS.md` contains the developer guide for creating plugins.

## 🎯 Objectives for Phase 5

The goal of Phase 5 is to mature the plugin platform by providing developers with the tools they need to build high-quality, consistent plugins.

### 1. UI Component Library (`@jasper/ui`)
Plugins currently have to use raw Tailwind classes, leading to inconsistency.
- **Task**: Create a shared component library (internal or package) exporting core UI components:
    - `Card`, `Button`, `Input`, `Table`, `Badge`, `Loader`.
- **Requirement**: These components must match the existing dashboard design (Dark/Light mode compatible).
- **Implementation**: Likely a new directory `web/ui` or `src/plugins/lib` that plugins can import from.

### 2. Advanced Slot Features (Context)
Plugins need access to the application state.
- **Task**: Implement **Slot Context** to pass data to injected widgets.
    - **Data**: Current User, Theme (Dark/Light), API Client instance.
- **Implementation**: Update `ExtensionSlot.tsx` to wrap widgets in a Context Provider or pass props.

### 3. Production Hardening
- **Task**: Implement **Error Boundaries** around plugin components.
    - Prevent a single crashing widget from breaking the entire dashboard.
    - Show a "Widget Crashed" fallback UI.

### 4. Mobile Experience
- **Task**: Implement a **Hamburger Menu** for mobile navigation.
    - The current sidebar is hidden on mobile, making navigation impossible.

## 🛠️ Key Files
- `PLUGINS_DEV.md`: **READ THIS FIRST**. It explains the architecture.
- `PLUGINS.md`: The public documentation.
- `web/core/ComponentRegistry.ts`: Where components are registered.
- `web/components/ExtensionSlot.tsx`: Where widgets are rendered.
- `web/context/PluginContext.tsx`: Plugin state management.

## 🚀 Dev Workflow
- `npm run dev:all`: Starts Backend (3000) + Frontend (5173).
- `npm run build:backend`: Compiles everything (including plugins).
- `npm run export-plugin <id>`: Packages a plugin.

## 📝 Immediate Next Step
Start by analyzing `web/components/ExtensionSlot.tsx` and planning the Context injection for widgets.
