# JN Client 360 — Codebase Documentation

A worker-facing client dashboard that embeds inside GoHighLevel (GHL) as an
iframe. It shows a searchable client list, and a per-client "360" view that
pulls real data from GHL and presents it on one screen.

This document is written for a **collaborator picking up the codebase**. It
covers: what the system is, how data flows, what every file does, where to make
common changes, what's real vs. demo, and how to deploy a new location.

> **Audience note:** you do not need deep React experience to maintain this.
> The app is plain React with no router and no state library. All styling is
> inline `<style>` blocks (no Tailwind, no CSS framework). Each component is a
> single file.

---

## 1. What this is, in one paragraph

The browser app is **static React built by Vite** and hosted on **Netlify**.
The React code never talks to GHL directly — it calls **Netlify Functions**
(small serverless endpoints in `netlify/functions/`) which hold the GHL API
token server-side and return clean, pre-shaped JSON. The app is embedded in
GHL via a **Custom Menu Link (iFrame)**. One deployment serves one GHL
sub-account ("location"); the location ID is baked into `src/App.jsx`.

```
Browser (React, in GHL iframe)
        │  fetch /api/ghl/:locationId/...
        ▼
Netlify Functions  (hold GHL token, shape data)   ← netlify/functions/*.mjs
        │  Bearer token (server-side only)
        ▼
GoHighLevel API   (services.leadconnectorhq.com)
```

**Why this shape:** the GHL token (a "Private Integration Token" / PIT) must
never be exposed in browser code, and GHL's API can't be called from a browser
anyway (no CORS). The Functions are the secure middle layer.

---

## 2. Tech + accounts at a glance

| Thing | Value |
|---|---|
| Framework | React 18 + Vite 5 (build tool) |
| Hosting | Netlify (static site + Functions) |
| Source repo | GitHub `wallahiIamfinished/ghl_2`, branch `main` |
| Backend | Netlify Functions (Node 20), in `netlify/functions/` |
| External API | GoHighLevel v2 — `https://services.leadconnectorhq.com` |
| GHL sub-account (location) | `5awBlPxYQVQGyd1XudNB` |
| GHL pipeline used | "Insurance Workflow" — `qT9EmKMANkGoTm8IAuQ4` |
| Icons | `lucide-react` |
| State / routing | React `useState` only; no router, no Redux |

**Netlify environment variables** (set in Netlify UI, never in code):
- `GHL_PIT` — the GHL Private Integration Token (the API credential)
- `GHL_PIPELINE_ID` — `qT9EmKMANkGoTm8IAuQ4`

The location ID is **not** an env var — it lives in `src/App.jsx` as a constant
and is passed through the URL path to the Functions.

---

## 3. File-by-file reference

```
jn-worker-ui/
├── index.html              — HTML shell; loads /src/main.jsx
├── package.json            — dependencies + build scripts
├── vite.config.js          — Vite + React plugin config
├── netlify.toml            — Netlify build config (build cmd, functions dir, Node 20)
├── .env.example            — documents which env vars to set (no real values)
├── src/
│   ├── main.jsx            — React entry point; mounts <App/>
│   ├── App.jsx             — top-level: list ↔ detail switching; holds LOCATION_ID
│   ├── ContactList.jsx     — the client list page (search, filters, rollup header)
│   └── UnifiedContactView.jsx — the per-client 360 detail view (the big file)
└── netlify/functions/
    ├── ghl-contacts.mjs    — GET list of contacts        → /api/ghl/:loc/contacts
    ├── ghl-contact.mjs     — GET one contact's full record→ /api/ghl/:loc/contact/:id
    └── ghl-email.mjs       — GET email thread / POST send → /api/ghl/:loc/contact/:id/email
```

### 3.1 `index.html`
The page shell. Contains `<div id="root">` (where React mounts) and a script
tag loading `/src/main.jsx`. Rarely edited. The page `<title>` lives here.

### 3.2 `src/main.jsx`
Five lines. Imports React and `App`, and mounts `<App/>` into `#root`. You will
basically never touch this.

### 3.3 `src/App.jsx`  *(top-level controller)*
The traffic cop between the two screens. Key contents:
- **`const LOCATION_ID = "5awBlPxYQVQGyd1XudNB";`** — the GHL sub-account this
  build serves. **This is the single line you change to point the app at a
  different franchise location.**
- Reads `?contactId=` from the URL for deep-linking straight to one client.
- Holds `selected` state: if nothing is selected → render `<ContactList>`; if a
  client is selected → render the "← All clients" back button + `<UnifiedContactView>`.
- Builds the data adapter with `makeGhlAdapter(LOCATION_ID)` and passes
  `locationId={LOCATION_ID}` to the detail view (the detail view needs it to
  call the email endpoint).

### 3.4 `src/ContactList.jsx`  *(the list page)*
The first screen: a searchable directory of clients plus the owner-facing
header. Structure:
- **`CSS`** — a template string of all styles for this page (class prefix `.cl`).
- **`FILTERS`** — the cross-line filter view chips ("Health · no Tax", etc.).
  These are **demo** (see §5); each non-"all" filter is marked `demo: true`.
- **`NOTIFICATIONS`** — the static strings shown when the bell is clicked. **Demo.**
- **`hashId(id)`** — a small deterministic hash used only to pick a stable,
  consistent subset of clients for each demo filter (so a filter always shows
  the same slice, not random ones).
- **`ContactList({ locationId, onSelect })`** — the component:
  - On mount, fetches `/api/ghl/{locationId}/contacts` and stores `rows`. **Real.**
  - `filtered` — applies the text search (real) and then the active filter view
    (demo subset). 
  - Renders: top bar (title, **entity toggle**, **notification bell**), the
    **rollup stat header** (4 tiles), the search box, the **filter chips**, then
    the client list. Clicking a row calls `onSelect(id)` which switches App to
    the detail view.

**Real vs. demo on this page:** the client list and text search are real. The
entity toggle, notification bell, filter views, and the dollar/percentage rollup
tiles are demo (the client *count* tile is real).

### 3.5 `src/UnifiedContactView.jsx`  *(the 360 detail view — the large file)*
The per-client screen. It is a **pure renderer**: it receives data from an
"adapter" and draws it. It does not itself know how to talk to GHL.

Top-of-file pieces:
- **`makeGhlAdapter(locationId)`** — returns an object with `getContact(id)` that
  fetches `/api/ghl/{locationId}/contact/{id}`. On *any* failure it returns the
  built-in `MOCK` record, so the screen never renders blank. **This fallback is
  intentional — it makes the demo bulletproof in front of a client.**
- **`mockAdapter`** — always returns `MOCK`; used when there's no location.
- **`MOCK`** — a complete sample record (Maria Gonzalez) matching the live data
  shape. This is what shows if the API call fails.
- **`CSS`** — all styles for this view (class prefix `.ucv`).
- **Vision data constants** (all demo): `VISION_RAILS` (stage tracks for the 7
  non-Health lines), `VISION_RAIL_AT`, `VISION_POLICY` (coverage detail per
  line), `CROSS_SELL_RULES` (the 16-rule engine table), `COMPLIANCE` (consent
  strip), `OCR_FIELDS` (fake extracted fields for the doc-preview modal),
  `chaseSteps` (the document-chase animation steps).
- **`UnifiedContactView({ contactId, adapter, locationId, onAction })`** — the
  component. Holds state for which card/activity is expanded, the email compose
  panel, the doc-preview modal, the transcript modal, and the chase animation.

What it renders, top to bottom:
1. **Header** — name, DOB/location/language, "Client of", and the action buttons
   (Call = `tel:` link, Email = opens compose panel, WApp = disabled, New
   Opportunity = calls `onAction`).
2. **AI summary** blurb (demo; composed from real fields).
3. **Compliance strip** (demo).
4. **Next best action** card (demo).
5. **Identity (Block A/B)** + **Household (Block C)** — **real** (incl. the
   immigration sub-panel and the computed ACA subsidy estimate).
6. **Service Line State (Block D)** — 8 cards. Health is **real** (reflects the
   live Insurance Workflow stage, with a real expandable stage rail). The other
   7 are **demo** cards with vision rails + policy detail when expanded.
7. **Cross-sell Engine (Block E)** — the 16 rules. **Demo.**
8. **Recent Activity** — **real** timeline (emails, form submissions, notes,
   tasks pulled from GHL). Calls open a demo transcript modal.
9. **Document Checklist** — tabbed Health / Tax / Life. Health is **real**
   (driven by file-upload fields); Tax & Life are **demo** lists. Includes the
   "Request missing documents" button (demo chase animation).
10. **Opportunities** — **real** (the client's GHL opportunities).
11. **Email modal**, **doc-preview modal**, **transcript modal** — overlays.

### 3.6 `netlify/functions/ghl-contacts.mjs`  *(list endpoint)*
- **Route:** `GET /api/ghl/:locationId/contacts`
- Calls GHL `GET /contacts/?locationId=...&limit=100`, maps each contact down to
  `{ id, name, email, phone, tags }`, returns `{ contacts: [...] }`.
- Used by `ContactList.jsx`. All real.

### 3.7 `netlify/functions/ghl-contact.mjs`  *(detail endpoint — the core backend)*
- **Route:** `GET /api/ghl/:locationId/contact/:id`
- This is where **real and vision data are assembled into one record**. Key
  internal pieces:
  - **`F`** — the field map: maps friendly names → the real GHL custom-field
    keys for this location (e.g. `ssn → contact.social_security_numberssn`).
    **This is the table you edit if custom-field keys change or you add a
    location with different fields.**
  - **`HEALTH_DOCS`** — the real document checklist; each entry maps a label to
    a file-upload field key. Presence of a value = document collected.
  - **`TAX_DOCS_DUMMY` / `LIFE_DOCS_DUMMY`** — hardcoded demo checklists.
  - **`HEALTH_STAGES` / `HEALTH_STAGE_NAMES`** — the Insurance Workflow pipeline
    stage IDs → names (Document Collection → Documents Complete → Enrollment →
    Closed).
  - **`VISION_CARDS` / `VISION_CROSSSELL`** — demo content for the 7 non-Health
    service lines and the cross-sell panel seed.
  - **`activityTimeline()`** — pulls **real** activity: emails (Conversations
    API), form submissions, notes, tasks. Each source is independently
    try/caught so one failing doesn't break the rest.
  - **`subsidy()`** — computes the ACA FPL% estimate from real income + size.
  - The handler fetches the contact, its custom fields, opportunities, and the
    activity timeline, then returns one combined JSON object.
- **Env used:** `GHL_PIT`, `GHL_PIPELINE_ID`.

### 3.8 `netlify/functions/ghl-email.mjs`  *(email endpoint)*
- **Route:** `GET` (fetch thread) and `POST` (send) on
  `/api/ghl/:locationId/contact/:id/email`
- **`FROM_ADDRESSES`** — the list shown in the compose dropdown. **You must edit
  this** to your real verified sending addresses (GHL has no API to list them).
- `GET` returns the contact's email thread + the from-address options.
- `POST` sends via GHL `POST /conversations/messages/outbound` (type `Email`),
  then returns the refreshed thread. The email lands in the contact's GHL
  conversation thread. **Real**, but requires the PIT to have conversations
  *write* scope.

---

## 4. Data flow walkthroughs

**Opening the app:**
`index.html` → `main.jsx` mounts `App` → no `contactId` selected → `App` renders
`ContactList` → `ContactList` calls `/api/ghl/{loc}/contacts` → `ghl-contacts.mjs`
calls GHL → returns slim list → list renders.

**Clicking a client:**
`ContactList` calls `onSelect(id)` → `App` sets `selected` → renders
`UnifiedContactView` with `makeGhlAdapter` → adapter calls
`/api/ghl/{loc}/contact/{id}` → `ghl-contact.mjs` gathers contact + custom
fields + opportunities + activity, assembles real + vision → returns one object →
the view renders it. If that fetch fails, the adapter returns `MOCK` instead.

**Sending an email:**
User clicks **Email** → compose panel opens, does `GET …/email` to load the
thread + from-addresses → user writes + confirms → `POST …/email` →
`ghl-email.mjs` sends via GHL → thread refreshes with the new message.

---

## 5. Real vs. demo ("Potemkin") — the honesty ledger

The build deliberately mixes live data with demo content so the screen looks
complete while only some lines are wired. **Keep this straight when presenting.**

**Real (live GHL data):**
- Client list + search
- Identity, immigration/citizenship panel, household, spouse/dependent
- ACA subsidy estimate (computed from real income + household size)
- Health/ACA card + its pipeline stage + expandable rail (from Insurance Workflow)
- Health document checklist (from real file-upload fields)
- Recent activity timeline (emails, form submissions, notes, tasks)
- Opportunities rollup
- Email send + thread (once `FROM_ADDRESSES` and write scope are set)
- Call (`tel:`) and Email buttons

**Demo (hardcoded / vision — not wired to data):**
- The other 7 service-line cards (Medicare, Life, Group, Tax, Bookkeeping,
  Advisory, P&C) and their stage rails + policy detail
- Cross-sell 16-rule engine panel
- AI summary blurb, compliance strip, next best action card
- Document preview (fake OCR), call transcript modal
- "Request missing documents" chase animation
- Tax & Life document checklists
- List page: entity toggle, notification bell, cross-line filter views, and the
  dollar/percentage rollup tiles (client count is real)
- WhatsApp button (disabled placeholder)

Anything demo on the list page carries a small **"demo"** badge in the UI.

---

## 6. "Where do I change X?" index

| I want to… | Edit | Notes |
|---|---|---|
| Point the app at a different GHL location | `src/App.jsx` → `LOCATION_ID` | One line. Also set that location's PIT in Netlify env. |
| Update a custom-field mapping | `netlify/functions/ghl-contact.mjs` → `F` | Keys must match GHL's `fieldKey` exactly. |
| Change which docs are in the Health checklist | `ghl-contact.mjs` → `HEALTH_DOCS` | Each is `[label, fileUploadFieldKey]`. |
| Change Tax/Life demo checklists | `ghl-contact.mjs` → `TAX_DOCS_DUMMY` / `LIFE_DOCS_DUMMY` | `[label, present]`. |
| Change the email "from" options | `netlify/functions/ghl-email.mjs` → `FROM_ADDRESSES` | Must be verified sending addresses. |
| Change the pipeline / its stages | `ghl-contact.mjs` → `HEALTH_STAGES`, `HEALTH_STAGE_NAMES` + Netlify `GHL_PIPELINE_ID` | Stage IDs come from GHL. |
| Edit the 16 cross-sell rules text | `UnifiedContactView.jsx` → `CROSS_SELL_RULES` | Demo display only. |
| Edit vision stage rails / policy detail | `UnifiedContactView.jsx` → `VISION_RAILS`, `VISION_POLICY` | Demo. |
| Edit the demo filter views / notifications | `ContactList.jsx` → `FILTERS`, `NOTIFICATIONS` | Demo. |
| Change colors / styling | the `CSS` string at the top of each component | Inline; no external stylesheet. |
| Change the AI summary wording | `UnifiedContactView.jsx` → the `aiSummary` line | Composed from real fields. |

---

## 7. Deploying / running

**Local dev** (optional; needs Node 18+):
```
npm install
npm run dev        # UI only
# or, to run Functions locally too:
npx netlify dev
```

**Deploy** (normal flow): push to `main` on GitHub → Netlify auto-builds from
`netlify.toml` (`npm run build`, publish `dist`, Functions from
`netlify/functions/`). After changing env vars, trigger **Clear cache and deploy**.

**Verify the backend** by hitting these URLs in a browser after deploy:
- `https://SITE/api/ghl/5awBlPxYQVQGyd1XudNB/contacts` → JSON list
- `https://SITE/api/ghl/5awBlPxYQVQGyd1XudNB/contact/<id>` → JSON detail

**Embed in GHL:** agency view → Settings → Custom Menu Links → Create New →
iFrame → link = the Netlify site URL.

---

## 8. Replicating to a new franchise location

1. Copy the repo (or use the same one with a build per location).
2. In `src/App.jsx`, set `LOCATION_ID` to the new sub-account's ID.
3. Confirm the new location's custom-field keys match the `F` map in
   `ghl-contact.mjs`; update if they differ.
4. Set that location's `GHL_PIT` (and `GHL_PIPELINE_ID`) in Netlify env.
5. Update `FROM_ADDRESSES` in `ghl-email.mjs` to that location's verified
   sending addresses.
6. Deploy and embed as a Custom Menu Link in that GHL sub-account.

> The Functions take `locationId` from the URL path, so the architecture already
> supports multiple locations from one codebase — the per-location work is the
> field-map check, the token, and the from-addresses.

---

## 9. Gotchas a collaborator should know

- **GHL token is server-side only.** Never put the PIT in any `src/` file or in
  the browser. It lives in Netlify env and is read only by the Functions.
- **PIT scopes matter.** Read scopes: contacts, opportunities, custom fields,
  conversations, forms, notes, tasks. The email *send* needs conversations
  **write**. A missing scope shows up as a 401/403 from a Function.
- **The app falls back to `MOCK`** on any detail-fetch failure, so a blank-ish or
  "Maria Gonzalez" screen in production usually means the API call failed
  (token/scope/field issue) — check the Function logs in Netlify and the
  `/api/...` URLs directly.
- **Folder structure must be preserved** in the repo (`src/`, `netlify/functions/`).
  The most common deploy failure here has been files uploaded flat instead of in
  their folders. Use github.dev or "Create new file" with the full slash path.
- **GHL has no public "contact timeline" or "list verified emails" endpoint** —
  that's why the activity feed is assembled from several endpoints and the email
  from-list is a hardcoded config.
- **No router.** Navigation is just `App`'s `selected` state. Deep links use the
  `?contactId=` query param.
