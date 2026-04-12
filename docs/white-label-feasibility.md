# White-Labeling Feasibility Report: Argos-V2

## Executive Summary
White-labeling **Argos-V2** is **highly feasible** and would be considered an **Easy to Medium effort** (Level 2/5). The application already possesses a robust multi-tenant foundation in its database schema, and the frontend is structured in a way that branding elements are centralized.

---

## Current Readiness

### 1. Database Schema (Ready)
The database already has a first-class `organizations` table. Most critical entities (`users`, `teams`, `calls`, `training_modules`) are already linked to an `org_id`.
- **Status:** **Production-ready** for multi-tenancy.

### 2. Frontend Shell (Centralized)
Branding is primarily handled within `apps/web/components/app-shell.tsx`. It currently displays the organization's name dynamically.
- **Status:** **Centralized**, but needs migration from text-based logo to dynamic assets.

### 3. Styling Framework (Modern)
The project uses **Tailwind CSS 4** with a set of CSS variables in `globals.css`.
- **Status:** **Foundational support exists**, but some components still use hardcoded hex values.

---

## Required Changes

### Phase 1: Database Enhancements
Add branding columns to the `organizations` table:
- `logo_url` (text)
- `primary_color` (text/hex)
- `favicon_url` (text)
- `custom_domain` (text - optional)

### Phase 2: Styling Refactor
- Convert hardcoded hex values (e.g., `bg-[#0b0e14]`) in `app-shell.tsx` and other UI components to use CSS variables defined in `:root`.
- Implement a `ThemeServer` or similar utility to inject these variables into the HTML head based on the user's organization.

### Phase 3: Component Customization
- Update `AuthenticatedAppShell` to render an `<img>` tag for the logo if `logo_url` exists, falling back to the "Argos" text.
- Update `layout.tsx` to pull the organization's metadata (title, favicon) dynamically.

---

## Estimated Effort
- **Backend/DB updates:** ~2-4 hours
- **Styling refactor (hex to vars):** ~4-6 hours
- **Dynamic asset injection:** ~2-4 hours
- **Testing across tenants:** ~4 hours
- **Total:** **~12-18 total coding hours**.
