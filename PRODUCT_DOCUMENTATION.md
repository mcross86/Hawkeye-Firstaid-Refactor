# Hawkeye Fire & Safety — Product Documentation

**Document type:** Technical product specification for the *Hawkeye Fire Firstaid / Service Operations* codebase as implemented today.  
**Audience:** Product leadership, engineering leads, operations owners, and onboarding developers.  
**Scope:** End-user and admin capabilities, supporting systems, configuration, and known limitations.

---

## 1. Executive summary

### 1.1 What this product is

This repository delivers a **browser-based internal operations tool** for Hawkeye Fire & Safety–style field service work. The current release focuses on:

- **Field capture of customer replenishment / purchase orders** (SKU lines, customer, site, location, service date, driver identity).
- **Central persistence** of those orders in a **SQLite** database via a small **Express API**.
- **Operational configuration** of customers, physical sites, sub-locations, item catalog, drivers, and **how product categories appear on the driver UI**.
- **Office-side views:** purchase order list with export, and **driver performance analytics** derived from submitted orders and item list prices.
- **Optional Google Sheets export** of purchase order line items for parallel spreadsheet workflows.

### 1.2 Product intent (north star)

Aligning with the broader program vision documented at repository level: move credibly along the chain **job intake → dispatch → completion → billing ticket**. The **implemented** slice today is strongest on **structured field order capture**, **master customer/site data**, and **retrospective analytics**; scheduling is **prototype-level** (static configuration, not a dispatch system).

---

## 2. Personas

| Persona | Primary goals in this app | Primary surfaces |
|--------|----------------------------|------------------|
| **Field driver** | Sign in, see today’s allowed customers (when scheduled), select site/location, enter line items by category, submit order, get confirmation (PO number). | Customer Replen Order (default route) |
| **Back-office / clerk** | Review submitted orders as line-level detail, filter, export CSV, deep-link to a PO. | Purchase Order List |
| **Operations / manager** | Inspect driver productivity and order economics over a date range. | Driver performance |
| **Configurator (admin)** | Maintain users, item master, category display rules, and corporate customer/site/location hierarchy. | User Configuration, Items, UI Category Config, Customer Configuration |

*Note:* There is **no role-based UI gating** in the client today; all menu destinations are available to anyone who can open the web app. Authentication is limited to a **driver PIN-style check** on the main order flow only.

---

## 3. System overview

### 3.1 Components

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| **Web app** | React 18, MUI, Vite | SPA with hash-based routing, all user-facing features. |
| **API** | Node.js, Express | REST JSON API, CORS to configured web origin. |
| **Database** | SQLite (`sqlite` + `sqlite3`) | Purchase orders, master data, site service history. |
| **Spreadsheets (optional)** | Google Sheets API (Application Default Credentials) | Append rows for each submitted order’s line items. |

### 3.2 Default local URLs

- Web: `http://localhost:5173`
- API: `http://localhost:3001`

### 3.3 Data authority split (important for operators)

| Domain | Source of truth today | Persistence |
|--------|----------------------|-------------|
| Customers, sites, site locations, PO-backed service history rows | API + SQLite | Durable |
| Purchase orders and line items | API + SQLite | Durable |
| **Users** (incl. drivers, credentials for field sign-in) | In-memory store seeded from frontend code | **Session only** — lost on full page refresh / not shared across devices |
| **Item catalog** (SKUs, categories, prices for analytics) | In-memory store seeded from frontend code | **Session only** |
| **Category display configuration** (default + per-driver overrides) | In-memory config in frontend service | **Session only** |
| **Driver ↔ customer schedule for a given date** | Static array in frontend | **Prototype** — must be edited in code for real routes |

This split is a deliberate evolution: master **geographic/customer** data and **orders** are production-credible on SQLite; **directory and merchandising** config are still prototype-grade.

---

## 4. Navigation and information architecture

The app uses **`window.location.hash`** paths (not React Router). Equivalent hash examples:

| Product name in UI | Hash path (primary) | Internal page key |
|--------------------|---------------------|-------------------|
| Customer Replen Order | `#/` | `driver-app` |
| Product Category Display Configuration | `#/ui-configuration` | `ui-config` |
| User Configuration | `#/user-configuration` | `users` |
| Customer Configuration | `#/customer-configuration` | `customers` |
| Items Configuration | `#/items-configuration` | `items` |
| Driver performance | `#/analytics/driver-performance` | `analytics-driver-performance` |
| Purchase Order List | `#/orders/purchase-list` | `orders-purchase-list` |

Legacy aliases are accepted for some admin paths (e.g. `#/users`, `#/customer-config`).

**Global chrome:** A top **AppBar** with a **menu** lists all major areas grouped under Analytics, Orders, and Driver Apps Configuration.

---

## 5. Feature catalog

### 5.1 Customer Replen Order (field driver application)

**Purpose:** Capture a **purchase order** at a customer location with enough structure for reporting and optional Sheets export.

**Entry / gating:**

- Opening the driver app shows a **non-dismissible** “Driver sign-in” dialog until verification succeeds.
- Driver selects their name from **active users with role Driver** (sourced from User Configuration).
- They enter **User ID #**, which must **exactly match** the configured value for that user record.
- On success, the dialog closes and **`driverName`** on the order is set from the verified profile.

**Service date:**

- Defaults to today (browser local date).
- Changing the date **reloads the list of scheduled customers** for that driver + date (see Scheduling, §5.8).

**Customer → site → location:**

- Customer dropdown lists **scheduled customers only** that are **active** in Customer Configuration data.
- After customer selection, **sites** load for that customer (`activeOnly` for field flow).
- After site selection, **site locations** load for that site (active only in field flow).
- Clearing or changing the schedule may reset dependent selections to avoid orphaned choices.

**Line items:**

- Items are grouped by **product categories** resolved through **Product Category Display Configuration**: only **enabled** categories appear, in **configured order**.
- Within each category, the driver adds one or more lines: **SKU** (typically chosen from catalog), **description** (auto-filled when SKU matches catalog), **quantity**.
- SKU picker options come from **active items** in the item catalog filtered by category.
- Submission requires **at least one line** with SKU and quantity &gt; 0 across all categories.

**Review step:**

- A **Review** step validates completeness (customer, site, location, date, catalog lines) before exposing final submit.

**Submit behavior:**

- Submits **`POST /api/driver/purchase-orders`** with customer name, combined site/location label, date, driver, notes, optional structured IDs (`customerId`, `siteId`, `locationId`), and line items.
- API assigns **`PO-{id}`** (`id` is database primary key).
- UI shows success with PO label; warns if Google Sheets sync failed but DB commit succeeded.

**Post-submit:**

- Form resets customer/site/location/notes/lines while retaining driver name and refreshed category grids.

---

### 5.2 Product Category Display Configuration

**Purpose:** Control **which item categories appear** on the driver order screen and **in what sequence**, optionally **per driver**.

**Scopes:**

- **Default:** baseline ordering/visibility for all drivers.
- **Driver-specific:** override for a chosen driver ID (matched to User Configuration user id).

**Mechanics:**

- Drag-style reordering UX (grab handle) updates **sequence**.
- Rows can be **enabled/disabled**.
- Saves update an **in-memory configuration store** in the browser process (not persisted to API).
- Saving notifies the shell app so the driver flow **reloads configured categories** immediately.

**Category catalog merge logic (product implication):**

- Categories come from master category list **plus any category IDs** referenced by active items (“discovered” categories). This avoids breaking the driver UI when new SKUs introduce a category string before admins add it to the canonical list.

---

### 5.3 User Configuration

**Purpose:** CRUD directory of people who interact with Hawkeye tooling.

**User fields:**

- Name, email, **User ID #** (unique, case-insensitive), **Role** (`admin`, `driver`, `clerk`), active flag.

**Role semantics in the product:**

- **Driver:** Eligible for field sign-in list; schedule entries reference **`driverId`** as user id for prototype scheduling.
- **Clerk:** Product concept for back-office roles; clerk-specific UI gates are **not** implemented—labeling is for organizational clarity only.
- **Admin:** Organizational label only in current UI.

**Operational warning:** Changes exist only until reload; duplicate **User ID #** are rejected across the directory.

---

### 5.4 Customer Configuration (master data)

**Purpose:** Maintain **customers**, their **sites** (addresses, POCs, logistics notes, cadence metadata), **per-site locations**, and narrative **service history** used in admin views.

**Persistence:** **SQLite via API** — durable and shared across all clients pointing at the same API/database file.

**Customer capabilities:**

- List/search customers, create/update/delete (soft notions of active/inactive exposed as **`isActive`**).
- Tabs or flows for drilling into sites attached to each customer.

**Site record (conceptual attributes):**

- Identity: customer linkage, site name.
- Location: street, city, state, postal code.
- **Point of contact:** name, title, phone.
- **Field operations notes:** gate instructions, hours, preferred time of day, service frequency text.
- **Scheduled services:** structured JSON persisted with the site (edited in admin UI; consumed as data for future dispatch — not driving the prototype driver dropdown by itself today).
- **Service history:**
  - **Manual / office-entered history** normalized for display summaries.
  - **Full history log** including rows written automatically when POs submit for that site (**source** distinguishes manual vs purchase order linkage).

**Site locations:**

- Named sub-locations under a site; carry **customer id** redundancy for relational integrity.

**Deletes:** Implemented as hard deletes via API semantics; cascading behavior relies on SQLite foreign keys — operators should assume child records can be removed with parents per schema.

---

### 5.5 Items Configuration (item master)

**Purpose:** Maintain **SKU master**: identifier, commercial description, category, active flag, unit of measure, internal notes.

**SKU list pricing:**

- **`listPriceUsd`** on items powers **analytics revenue-style rollups** on Driver Performance when present and numeric.

**Import/export:**

- Download CSV **template**.
- Bulk **import CSV** text into catalog (validated columns: SKU, Description, CategoryId, Active, UOM, Notes).
- Export full catalog CSV for backups or spreadsheet edits.

**Persistence:** **In-browser store** — operational teams should treat edits as prototype unless export discipline is used.

---

### 5.6 Purchase Order List (clerk view)

**Purpose:** Operational **browse and extract** submitted orders.

**Data source:** **`GET /api/clerk/purchase-orders`** — returns orders with nested line items (`sku`, descriptions, quantities, booleans expressed as SQLite integers on wire).

**Presentation model:**

- Table is **line-granular** (one row per SKU line per order), with synthetic **`PO-{orderId}`** numbering and PO line numbering.

**Filters and tools:**

- Free-text search across PO, customer, location, SKU, description, notes, status.
- Date range on **creation timestamp** (`created_at`).
- Dropdown filters for composite customer+location and SKU.
- Column sort.

**CSV export:** Downloads flattened visible rows matching current filters/sort.

**Deep linking:**

- Supports hash query **`?po=...`** pre-filling search (case-insensitive substring match typical).

---

### 5.7 Driver performance (analytics)

**Purpose:** Team-level KPIs inferred from submitted purchase orders and optional unit economics from SKU list prices.

**Data sourcing policy:**

Controlled by **`VITE_USE_MOCK_DRIVER_ANALYTICS`** and environment (see §7):

- Explicit `true`: always synthetic orders.
- Explicit `false`: always API orders.
- **Unset in development:** synthetic orders (*so KPIs demo without API*).
- **Production builds without override:** API orders.

**Inputs:**

1. Purchase orders (same logical shape whether live or mock) including **`customer_name`, `site_name`, `driver_name`, `service_date`, `created_at`, `items`**.
2. **`listPriceUsd`** from Items Configuration keyed by SKU (case tolerant).

**KPI semantics (Chicago business window):**

- **Date filtering** uses **`service_date`** string (yyyy-mm-dd lexical compare).
- **Average stops per active day:** mean of per-day order counts for that driver in range.
- **Average order value (USD):** uses **per-location per-day aggregation** (`customer_name + site_name`): multiple orders same day/location consolidate to one valuation bucket when averaging “order values.”
- **Average minutes between consecutive orders**: computed only among orders whose **`created_at`** falls between **08:00–17:00 America/Chicago** on the calendar day bucket.
- Fleet summary aggregates averages across filtered driver rows where applicable.

---

### 5.8 Scheduling prototype (driver day sheet)

**Purpose:** Restrict which customers appear as selectable on **Customer Replen Order** for `(driverId, serviceDate)` pairs — simulating a route without building dispatch services.

**Implementation:** Static table `driverCustomerSchedule` keyed by **`driverId`** (User Configuration id) and **`serviceDate`** (ISO date).

**Hydration:**

- Loads **customers from API**, filters to **`customerIds` in scope** AND **`isActive`**.

**Product expectation:** Operators must extend this structure (or delegate to roadmap dispatch) before production route fidelity is claimed.

---

## 6. Backend capabilities (product-facing)

### 6.1 Health

- **`GET /api/health`** — liveness probe JSON (`ok`, service name).

### 6.2 Purchase orders

**`POST /api/driver/purchase-orders`**

- Validates payload: customer identity text, driver, service date, non-empty SKU lines.
- If `customerId` / `siteId` / `locationId` present, validates referential correctness (customer matches site’s customer; location belongs to site).
- Inserts **`purchase_orders`** + **`purchase_order_items`** transactionally (`status` defaulted to **`submitted`**).
- Computes **`po_number`** internally as **`PO-{id}`** (`id` numeric).
- If `site_id` present, inserts correlated **`site_service_history`** pointing at `purchase_orders.id` (**source**: `purchase_order`).
- Optionally appends **Google Sheets** rows (see §7); failure is **non-blocking** for DB — response includes **`sheetSync`** struct.

**`GET /api/clerk/purchase-orders`**

- Full list with nested items (note: wire format retains **snake_case** field names from persistence layer).

### 6.3 Master data (`/api/master/...`)

JSON responses use **camelCase** for client ergonomics.

| Concern | Operations |
|---------|------------|
| Customers | List, create, patch, delete |
| Sites | Create, patch, delete; list by customer (`activeOnly` query) |
| Site locations | Create, patch, delete; list by site (`activeOnly`) |
| Service history (read) | List detailed history rows for a site |

---

## 7. Integrations and configuration

### 7.1 Web environment (`apps/web/.env`)

| Variable | Meaning |
|---------|---------|
| **`VITE_API_BASE_URL`** | Base URL for API (default `http://localhost:3001`). No trailing slash. |
| **`VITE_USE_MOCK_DRIVER_ANALYTICS`** | Overrides analytics data source (`true` / `false`; see §5.7). |

### 7.2 API environment (`apps/api/.env`)

| Variable | Meaning |
|---------|---------|
| **`PORT`** | Listen port (`3001` default). |
| **`WEB_ORIGIN`** | CORS allowed browser origin (`http://localhost:5173` default). |
| **`HAWKEYE_SQLITE_PATH`** | Overrides SQLite absolute path — required for ephemeral containers Cloud Run-style. Default path under **`database/local/`** in workspace. |
| **`GOOGLE_SHEETS_SPREADSHEET_ID`** | Enables Sheets append path when populated. |
| **`GOOGLE_SHEETS_PO_TAB_NAME`** | Destination tab (defaults `Sheet1`). |

Google auth uses **Application Default Credentials** (Cloud Run SA or local ADC). Sheet must permit the identity **`Editor`**. Appendix detail is in `apps/api/.env.example` and `apps/api/CLOUD_RUN.md`.

---

## 8. Data model (conceptual)

**Purchase order:** Customer & site textual snapshot, relational ids (optional), notes, lifecycle status (`submitted`), created timestamp.

**Purchase order item:** SKU, description, qty, **`is_add_on`** flag persisted in SQLite (current driver UI does not surface add-on toggles; API-ready).

**Customer / Site / Site location:** Hierarchy with foreign keys.** Site** includes JSON blob for scheduled services metadata.

**Site service history:** Timeline of office manual entries and purchase-order derived visits; links optional `purchase_order_id`, `site_location_id`.

**Legacy migration behavior:** On first init after renames, older **`replenishment_*`** table names may be upgraded in place automatically.

---

## 9. Operational limitations and risks

1. **No server-side authentication** on admin or clerk routes — rely on network posture until IdP/RBAC arrives.
2. **User and item catalogs** are browser-memory only — refreshes revert to seed unless code or future API migration changes.
3. **Driver sign-in** is a **single shared-secret style check** tied to numeric **User ID #** — not multi-factor identity.
4. **Schedule truth** for “who is routed where today” is **static config** unless external systems integrate.
5. **Clock & timezone assumptions:** KPI business window **hard-codes Chicago**; `service_date` is a **date string** without embedded timezone semantics.
6. **Sheets sync** can fail independently of DB persistence — operations should monitor `sheetSync` user feedback or logs.

---

## 10. Glossary

| Term | Meaning |
|------|---------|
| **Customer Replen Order** | Primary field UI for capturing purchase orders (menu label retains “replen” language). |
| **Purchase order (PO)** | Canonical persisted order entity; **`PO-{id}`** displayed to users. |
| **Site location** | Sub-area within a customer site (building, dock, wing). |
| **User ID #** | Operator-facing credential field for drivers; uniqueness enforced in local user store. |
| **sheetSync** | API response payload fragment describing Google Sheets append success/skip/failure. |

---

## 11. Related documents

- `README.md` — run instructions and repo layout (some paths are forward-looking vs current code).
- `docs/architecture.md` — broader multi-phase architecture vision (jobs/dispatch/tickets).
- `apps/api/README.md` — minimal endpoint listing.
- `apps/api/CLOUD_RUN.md` — deployment & Sheets identity notes.

---

## 12. Document maintenance

When adding user-visible features, update: **§5 Feature catalog**, **§3 data authority table** if persistence moves, **§6/§7** for new endpoints or env vars, and **§9** if security posture changes.

*Last reviewed against repository implementation: May 2026.*
