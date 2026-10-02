# WMS — Presentation Mockup (standalone HTML)

A **single, self-contained HTML file** of the WMS frontend, for demos. It is the
real Vue app compiled into one file (JS, CSS and logo all embedded), plus a
stateful `fetch()` interceptor that answers every `/api/*` call from an in-memory
store which **persists to the browser** and can be exported/imported as JSON.

## For the presenter — no Node, no server

Open **`WMS-demo.html`** by double-clicking it (or drag it into Chrome/Edge).
Nothing to install. You land already signed in as an **admin**, so every screen is
reachable. "Sign out" shows the login screen.

## Login & system-based access (demo)

The login screen has **one-click demo accounts** (any password works). Access is
scoped by **system** (UPW, Water, CDS, WCCS, SDS, Barcode, TMAH, CCTV):

- **Admins** (David Miller / Sarah Thompson) see **every** system's transmittals,
  materials and reports.
- A **system user** only sees data for their own system — the dashboard, KPIs,
  log report, materials list and catalogue are all filtered to it, and new
  transmittals they create are locked to their system.

Demo personas: David Miller (Admin · all), Jennifer Adams (Approver · UPW),
Robert Johnson (Warehouse · Water), Emily Carter (Approver · CDS),
James Wilson (Warehouse · WCCS). Sign in as an admin, note the row count, then
sign in as a system user to see the list shrink to just their system.

## Full transmittal lifecycle — and it saves

You can run a transmittal all the way through, and every step is saved locally:

1. **Submit** a new transmittal from the form (`#/`) — sign as requester and submit.
2. Open it from the **Dashboard** (`#/admin/transmittals`) → it advances stage by stage:
   **Requester → Approver → Warehouse → Recipient → Completed.**
3. At each stage the form shows the right controls: Approve/Decline, Sign as
   Warehouse (+ Save Progress), recipient pickup / **No-Show**, etc.

State machine matches the real backend: `signatureStatus` is the last stage that
signed, the dashboard shows who we await next, and `transmittalStatus` flips to
**Closed** on completion (or stays **Open** / **Declined** / **No-Show**).

### Where the data lives

- **Automatically in this browser** (`localStorage`) — survives reloads, fully
  offline. Everything you do (new transmittals, signatures, stock adjustments,
  new users, laydown set-units…) is saved.
- Use the **red "● Demo" button** (bottom-right) to:
  - **Export JSON** — download `wms-demo-state.json` (the whole state) to a folder.
  - **Import JSON** — load a state file back.
  - **Save to folder…** — (Chrome/Edge) pick a folder once; the JSON is then
    auto-written there on every change.
  - **Reset demo** — restore the original sample data.

> A file opened by double-click (`file://`) is sandboxed and can't silently write
> to disk — that's why persistence is in the browser, with one-click Export and an
> optional "Save to folder" that asks permission. Both give you a real JSON file.

## Screens (top menu, or hash routes after `WMS-demo.html`)

| Menu | Route |
|---|---|
| New Transmittal form | `#/` |
| Transmittal (awaiting approver) | `#/transmittal/TR-1040` |
| Transmittal (awaiting warehouse) | `#/transmittal/TR-1042` |
| Transmittal (completed) | `#/transmittal/TR-1041` |
| Dashboards — Transmittals / Materials / Equipment | `#/dashboards` |
| Reports — Report Builder / Log Report | `#/reports` |
| Admin Portal (user management) | `#/admin/users` |
| Inbound Forms — Material (Pinnacle) / Equipment (Laydown) | `#/inbound-hub` |
| Outbound Forms — Transmittals / Material (Pinnacle) / Equipment (Laydown) / Internal Team Transfers | `#/outbound` |
| Inventory — Material (Pinnacle) / Equipment (Laydown) | `#/inventory` |

### Report Builder (`Reports`, next to Dashboards)

Build custom reports and export them:

- **Data sources:** Transmittals, Inventory, Inbound Receipts, Users.
- Pick **columns**, apply **filters** (system, status, category, condition,
  date range, free-text search), and optionally **group / summarize**
  (e.g. count and sum per system or category).
- **Export to Excel (.xlsx)** — a real spreadsheet — and **PDF** (opens the
  print dialog → Save as PDF). Both work offline.
- **Quick templates:** Pending Approvals, Late / No-Show Pickups, Throughput by
  System, Low Stock, Inventory by System, Damaged Receipts, Users by System.
- Reports honor system access: an approver only reports on their own system.

*(Camera barcode scanning is the only feature that needs internet; manual entry
works offline. Rose Garden Materials is a "Coming soon" placeholder.)*

## For a developer — regenerating the file

Node is needed only to **build**, never to run:

```bash
npm install         # once
npm run standalone  # → produces WMS-demo.html
```

`npm run dev` / `npm run preview` also work. All sample data and the whole
lifecycle live in [`src/mock/api.js`](src/mock/api.js) — edit it and re-run
`npm run standalone`.

### Differences from the source repo (`../new_transmittals/frontend`)

1. `src/mock/api.js` — stateful mock + localStorage persistence + Export/Import UI;
   imported first in `src/main.js`.
2. Router uses **hash history** so it works from a plain file.
3. Placeholder `src/views/RoseGardenMaterialsView.vue` (missing in source).
4. `vite.config.js`: `base: './'` + `vite-plugin-singlefile`; `build-standalone.mjs`
   embeds the logo as a data URI.
