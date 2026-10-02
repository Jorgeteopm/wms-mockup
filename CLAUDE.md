# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Vue 3 frontend for a WMS (transmittals/warehouse) app, built to compile into **one self-contained HTML file** (`WMS-demo.html`) for offline sales/demo presentations — no server, no Node, opens via `file://`. There is no real backend here: `src/mock/api.js` intercepts every `fetch('/api/*')` call and serves it from an in-memory store backed by `localStorage`.

This repo is a fork/subset of a real app (`../new_transmittals/frontend`, not present here). See "Differences from the source repo" in README.md for the exact deltas (mock API, hash routing, placeholder Rose Garden view, singlefile build).

## Commands

```bash
npm install          # once
npm run dev           # vite dev server (localhost:5173), proxies /api to localhost:3000
npm run build          # vite build -> dist/
npm run standalone      # vite build && node build-standalone.mjs -> WMS-demo.html (the deliverable)
npm run preview          # preview the vite build
npm test                  # node --test 'test/*.test.js'
```

The system `node` (pacman package) on this machine can break after a rolling-release update (`libsimdjson` ABI bump) — if `node --version` errors with a missing `libsimdjson.so.*`, use the nvm.fish-managed v24 instead: `fish -c "nvm use v24.15.0; and <command>"`.

After editing anything under `src/`, regenerate the deliverable with `npm run standalone` — `WMS-demo.html` is a committed build artifact, not hand-edited.

## Architecture

- **Entry**: `src/main.js` imports `./mock/api.js` **first** (installs the fetch interceptor) before mounting the Vue app — order matters, since components fetch on mount.
- **Mock backend**: `src/mock/api.js` (~950 lines) owns all sample data, the full transmittal state machine, and localStorage persistence. This is the source of truth for demo behavior — edit here to change what the mockup does/shows, then rebuild.
- **Routing**: `src/router.js` uses `createWebHashHistory` (required for `file://`). Route guards check `user.value` (from `useAuth.js`) and per-route `meta` flags: `requiresUserManager`, `requiresAdmin`, `requiresReporting`, `requiresWarehouse`. `/kb` is an intentionally hidden, unauthenticated explainer route not in the nav.
- **Auth/roles**: `src/composables/useAuth.js` holds a module-level singleton `user` ref populated from `/api/auth/me` (served by the mock). `src/utils/roles.js`'s `effectiveRole()` maps the `testing` role to `owner`(admin) — a real account used to redirect email distribution to a test inbox, not a real role tier.
- **Access scoping**: beyond login, screens filter by **system** (UPW, Water, CDS, WCCS, SDS, Barcode, TMAH, CCTV) — admins see all systems, system users see only their own. This scoping lives in the views/mock data, not centrally.
- **Standalone build pipeline**: `vite.config.js` sets `base: './'` + `vite-plugin-singlefile` to inline all JS/CSS into `dist/index.html`. `build-standalone.mjs` then replaces the remaining external asset references (the WMS logo PNGs in `public/`, e.g. `wms-wordmark-white.png`, `wms-icon-color.png`) with embedded base64 data URIs and writes the final `WMS-demo.html`; it exits non-zero if any referenced asset survives unembedded.
- **Persistence model** (relevant when touching `mock/api.js`): state lives in the browser's `localStorage` (survives reloads, offline). The UI's "● Demo" button exposes Export/Import JSON and an optional File System Access "Save to folder" — `file://` pages can't write to disk silently, so this is opt-in.

## Key screens / routes

See the route table in README.md for the full list. Nav is organized as `#/dashboards` (Transmittals/Materials/Equipment tabs), `#/reports` (Report Builder/Log Report tabs, its own top-level entry next to Dashboards), `#/admin/users` (Admin Portal), `#/inbound-hub`, `#/outbound` (Transmittals/Material/Equipment/Internal Team Transfers segments — the last filtered out for Warehouse users), `#/inventory` (each split Material/Equipment, mirroring the real app's structure). Old standalone paths (`/admin/transmittals`, `/materials-hub`, `/inbound`, `/transfers`, etc.) are kept as redirects for bookmarks. The transmittal lifecycle state machine (`signatureStatus` progression Requester → Approver → Warehouse → Recipient → Completed, `transmittalStatus` Open/Closed/Declined/No-Show) is implemented in `src/mock/api.js` and mirrors the real backend's semantics.
