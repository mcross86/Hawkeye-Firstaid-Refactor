# Ten refactor priorities — Hawkeye Fire Firstaid

Prioritized architectural and cleanup work if restarting or hardening the project. Companion to `PRODUCT_DOCUMENTATION.md` for the refactor folder snapshot.

---

## 1. Unify persistence boundaries

Customers, sites, locations, purchase orders, and service history live in **SQLite via the API**. Items, users, category display rules, and the driver/day schedule remain **in-memory or static frontend data**.

**Refactor:** Make the rule explicit — either migrate items, users, and UI category config behind the API with durable storage or document—and enforce—which domains are intentionally offline-first. Prefer one authoritative store per entity.

---

## 2. Delete or reconcile orphaned static datasets

Static modules under `apps/web` (for example unused customer/site seed files) duplicate data that seeding logic now fills in the API (`seedMasterData`).

**Refactor:** Remove dead imports/files and keep **one seed path** per entity to avoid divergence.

---

## 3. Normalize API response shapes

Master routes map DB rows to **camelCase**. Clerk purchase-order list responses retain **snake_case** aligned with SQLite column names (`customer_name`, `is_add_on`, etc.).

**Refactor:** Add a thin DTO layer so every externally consumed JSON shape follows one naming convention end-to-end, reducing branching in the SPA.

---

## 4. Finish the “purchase order” rename in code vocabulary

Historical **replenishment sheet** terminology remains in migrations, analytics variables (`sheets`), and scattered comments.

**Refactor:** Use **purchase order** in application and UI code consistently; reserve legacy names inside a dedicated migration or compatibility shim only.

---

## 5. Replace inline DB bootstrap with migrations

`initDb` combines table creation with one-off ALTERs and table renames in a single function.

**Refactor:** Use versioned migration files (or a small migrator) so schema changes are reviewable, repeatable, and safe for shared environments.

---

## 6. Single HTTP client and simpler local dev networking

`masterDataApi` and `purchaseOrderApi` each define base URL and fetch behavior; the app relies on **full URL + CORS** rather than a dev proxy.

**Refactor:** Centralize `fetch` (errors, JSON, base path) and consider Vite `server.proxy` so the default can be relative `/api` with environment only setting the host when needed.

---

## 7. Clarify driver analytics data source defaults

In development, when `VITE_USE_MOCK_DRIVER_ANALYTICS` is unset, analytics **defaults to mock** orders so the page works without the API.

**Refactor:** Choose a default that matches operator expectations (or make the current mode obvious in the UI) to avoid “wrong numbers” confusion.

---

## 8. Decompose the driver shell (`App.jsx`)

The main app file is very large: hash routing, menu, driver sign-in, schedule loading, catalog layout, submit flow, and cross-page version bumping.

**Refactor:** Extract layout, driver flow, and navigation into focused modules (or adopt a router) before adding more surface area.

---

## 9. Shared contracts across apps

The monorepo has **CommonJS** on the API and **ESM** on the web; constant strings and payload shapes are duplicated.

**Refactor:** Add a small **shared package** (or OpenAPI-generated types) for route paths, env keys, and request/response types so client and server stay aligned.

---

## 10. Authentication and authorization as a product boundary

Driver sign-in is a **local PIN check** against in-memory users. Clerk and driver API routes are **not authenticated** at the HTTP layer.

**Refactor:** Plan for real auth (session or token), role-based access for admin vs field vs clerk, and migration of user directory to the backend before non-demo deployment.

---

*Derived from a senior engineering review of the Hawkeye Fire Firstaid codebase; May 2026.*
