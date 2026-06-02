# JN Client 360 — Codebase Documentation

A worker-facing client dashboard that embeds inside GoHighLevel (GHL) as an
iframe. It gives Julio's team a searchable client list, a per-client "360" view
that pulls real data from GHL, and a portfolio-level **Growth Intelligence**
view for running the book by value and cost-to-serve.

Written for a **collaborator picking up the codebase**: what the system is, how
data flows, what every file does, where to change things, and the exact real-vs-
demo split so nothing gets misrepresented in front of a client.

> **Maintainer note:** you do not need deep React experience. Plain React, no
> router, no state library — just `useState`. All styling is inline `<style>`
> blocks per component (no Tailwind). Each screen is one file.

---

## 1. What this is, in one paragraph

The browser app is **static React built by Vite**, hosted on **Netlify**. React
never calls GHL directly — it calls **Netlify Functions** (serverless endpoints
in `netlify/functions/`) that hold the GHL token server-side and return clean,
pre-shaped JSON. The app is embedded in GHL via a **Custom Menu Link (iFrame)**.
One deployment serves one GHL sub-account ("location"), set in `src/App.jsx`.

```
Browser (React, in GHL iframe)
        │  fetch /api/ghl/:locationId/...
        ▼
Netlify Functions  (hold GHL token, shape data)   ← netlify/functions/*.mjs
        │  Bearer token (server-side only)
        ▼
GoHighLevel API   (services.leadconnectorhq.com)
```

**Why this shape:** the GHL Private Integration Token (PIT) must never be in
browser code, and GHL's API can't be called from a browser (no CORS). The
Functions are the secure middle layer.

---

## 2. Tech + accounts at a glance

| Thing | Value |
|---|---|
| Framework | React 18 + Vite 5 |
| Hosting | Netlify (static site + Functions, Node 20) |
| Source repo | GitHub `wallahiIamfinished/ghl_2`, branch `main` |
| External API | GoHighLevel v2 — `https://services.leadconnectorhq.com` |
| GHL sub-account (location) | `5awBlPxYQVQGyd1XudNB` |
| GHL pipeline ("Insurance Workflow") | `qT9EmKMANkGoTm8IAuQ4` |
| Icons | `lucide-react` |
| State / routing | React `useState` only |

**Netlify environment variables** (set in Netlify UI, never in code):
- `GHL_PIT` — the GHL Private Integration Token
- `GHL_PIPELINE_ID` — `qT9EmKMANkGoTm8IAuQ4`

Location ID is **not** an env var — it's a constant in `src/App.jsx`, passed to
the Functions through the URL path.

---

## 3. File-by-file reference

```
jn-worker-ui/
├── index.html              — HTML shell; loads /src/main.jsx
├── package.json            — dependencies + build scripts
├── vite.config.js          — Vite + React plugin config
├── netlify.toml            — Netlify build config (build cmd, functions dir, Node 20)
├── .env.example            — documents env vars (no real values)
├── src/
│   ├── main.jsx            — React entry; mounts <App/>
│   ├── App.jsx             — top-level: list ↔ detail switching; holds LOCATION_ID
│   ├── ContactList.jsx     — list page: Clients|Growth tabs, search, rollup, filters, custom views
│   ├── UnifiedContactView.jsx — per-client 360 detail view (the big file)
│   ├── Growth.jsx          — portfolio Growth Intelligence view
│   └── demoData.js         — explicit DEMO seed households (shared by list + Growth)
└── netlify/functions/
    ├── ghl-contacts.mjs    — GET list           → /api/ghl/:loc/contacts
    ├── ghl-contact.mjs     — GET one record     → /api/ghl/:loc/contact/:id
    └── ghl-email.mjs       — GET thread / POST send → /api/ghl/:loc/contact/:id/email
```

### 3.1 `index.html` / `src/main.jsx`
The shell (`<div id="root">`) and the mount. Rarely touched.

### 3.2 `src/App.jsx` *(top-level controller)*
- **`const LOCATION_ID = "5awBlPxYQVQGyd1XudNB";`** — the one line to change per
  franchise location.
- Reads `?contactId=` for deep links.
- Holds `selected` state: none → `<ContactList>`; a client → back button +
  `<UnifiedContactView>` with `locationId` passed in (the email feature needs it).

### 3.3 `src/ContactList.jsx` *(the list page)*
The first screen. Contains:
- **`CSS`** — all styles for this page (`.cl` prefix).
- **`LINES`** — the 8 service lines.
- **`PRESETS`** — built-in filter views as condition lists (All, Health·no Tax,
  Medicare·no Life, Tax·no Advisory, P&C eligible).
- **`NOTIFICATIONS`** — static bell items (demo).
- **`clientLines(id)`** — MODELED per-client line membership (deterministic from
  id); stand-in until real per-line status fields exist in GHL.
- **`matchesConds(id, conds)`** — the filter engine; a client matches when all
  conditions hold.
- **Component** state: search, entity toggle, active filter/view, bell, Clients|
  Growth `tab`, `customViews`, the view `builder`, and the rollup `drill`.
  - On mount, seeds the list with `demoIndividuals()` (labeled DEMO) **then**
    appends real `/contacts`; if the API fails it still shows the demo book.
  - Renders: top bar (title, entity toggle, bell), **Clients|Growth tabs**, and
    on the Clients tab: notifications, **rollup header (4 drillable tiles)**,
    search, **filter chips + "New view" builder**, and the client list. The
    Growth tab renders `<Growth rows={rows} />`.
  - **Custom view builder** — name + Has/Doesn't-have line conditions, a live
    match count, and Save (adds a session-only custom chip).
  - **Rollup drill-down** — clicking a tile expands a split (pipeline by line,
    conversion by stage, etc.). Splits are demo.

### 3.4 `src/UnifiedContactView.jsx` *(the 360 detail view)*
A **pure renderer** fed by an adapter. Top-of-file:
- **`makeGhlAdapter(locationId)`** — `getContact(id)` fetches
  `/api/ghl/{loc}/contact/{id}`; on any failure returns the built-in `MOCK`, so
  the screen never renders blank.
- **`MOCK`** — a complete sample record (Maria Gonzalez) matching live shape.
- **Vision constants (demo):** `VISION_RAILS` / `VISION_RAIL_AT` / `VISION_POLICY`
  (stage tracks + coverage detail for the 7 non-Health lines), `STAGE_STEPS`
  (per-stage "steps to complete"), `CROSS_SELL_RULES` (reference list),
  **`AUTO_FLAGS`** (Tier-1 automated cross-sell), **`SUGGESTED_FLAGS`** (Tier-2
  human-verified), `COMPLIANCE`, `OCR_FIELDS`, `chaseSteps`, `QUICK_FIELDS`
  (friendly-label → real GHL key map for the Quick Update panel).

Render, top to bottom:
1. **Header** — name, DOB/location/language, "Client of", actions (Call `tel:`,
   Email → compose panel, WApp disabled, **Quick update**, New Opportunity).
2. **AI summary** (demo, composed from real fields).
3. **Compliance strip** (demo).
4. **Next best action** (demo).
5. **Identity (Block A/B)** — REAL. Now includes business name, ITIN, middle
   name, sex, plus the immigration sub-panel.
6. **Household (Block C)** — REAL. Income breakdown (primary/spouse/dependent/
   total), employment, payment method, structured dependents w/ ages, ACA
   subsidy estimate, and **last-verified date**.
7. **Service Line State (Block D)** — 8 cards. Health REAL (live pipeline stage +
   expandable rail + **steps to complete** + **Health/ACA detail panel**). Other
   7 are demo (vision rail + policy detail + steps when expanded).
8. **Cross-sell (Block E)** — two tiers:
   - **Suggested · needs review** (Tier 2) — inferred flags with confidence
     badges and Follow up / Dismiss / Confirm controls (+ undo).
   - **Running automatically** (Tier 1) — birthdays, renewals, expiry,
     effectuation; shown as background/no-review, with next-run times.
9. **Recent Activity** — REAL timeline (emails, form submissions, notes, tasks)
   + a prepended demo call-summary row; calls open a demo transcript modal.
10. **Document Checklist** — tabbed Health/Tax/Life. Health REAL (file-upload
    fields); Tax/Life demo. Rows open a demo OCR preview; **Add misc** adds
    checkable edge-case document rows; "Request missing documents" runs a demo
    chase animation.
11. **Modals** — email compose/send/thread, doc preview, call transcript, Quick
    Update.

**The Health/ACA detail panel** (inside the expanded Health card) is the
Insurance-tab home for: subsidy/FPL, CSR tier, net premium (gross/APTC/net) —
all COMPUTED/real from income+size — plus carrier, metal tier, deductible/MOOP,
effectuation, enrollment window/SEP countdown, APTC reconciliation, covered
members, last life event, application/confirmation #, GetCoveredNJ status, and
plan expiry — all agent-entered / GetCoveredNJ-sourced (demo, no API).

### 3.5 `src/Growth.jsx` *(Growth Intelligence — portfolio view)*
Rendered as the **Growth tab** on the list page. Reframes the book around value
and cost-to-serve. Contains:
- **`clientLinesFromId(id)`** — modeled line membership for real contacts
  (mirrors the list's `clientLines`).
- **Controls:** Households ↔ Individuals toggle, and a line-of-business filter
  (All lines + a chip per line). Every module re-computes when these change.
- **Modules:** KPI strip (book value, recurring mix, avg lines, churn-risk
  revenue), the ★ Value/Effort matrix (4 quadrants + scatter), auto-tiered book
  (A/B/C/D), recurring & churn radar, most-valuable units, book-wide cross-sell
  depth gauge, and marketing plays (lookalike, lifecycle, referral, attribution).
- Data comes from `demoData.js` (seed households) merged with any real contacts;
  all dollar/effort/tier values are MODELED.

### 3.6 `src/demoData.js` *(shared demo seed)*
- **`DEMO_HOUSEHOLDS`** — six labeled "DEMO" households built only from fields
  the two intake forms capture (name, spouse, dependents w/ ages, income,
  services/lines, language, source).
- **`demoIndividuals()`** — flattens households to individual rows (tagged DEMO).
- **`buildUnits(individuals, mode, lineFilter)`** — builds economic units per
  Individual or Household, applies a line filter, computes value/effort/tier/
  quadrant. Used by Growth.
- **`linesRevenue`, `ALL_LINES`** — modeled revenue per line + the line list.

### 3.7 `netlify/functions/ghl-contacts.mjs` *(list endpoint)*
`GET /api/ghl/:locationId/contacts` → maps GHL contacts to `{id,name,email,
phone,tags}`. All real.

### 3.8 `netlify/functions/ghl-contact.mjs` *(detail endpoint — core backend)*
`GET /api/ghl/:locationId/contact/:id`. Assembles the full record. Key pieces:
- **`F`** — friendly-name → real GHL custom-field key map. Includes ssn, **itin**,
  drivers_license, **business_name** (⚠ no confirmed key in the GHL export — set
  it once the field exists, else blank), income, **spouse_income**, **dep_income**,
  **employment**, **payment_method**, immigration fields, etc.
- **`HEALTH_DOCS`** — real checklist (label → file-upload field key).
- **`TAX_DOCS_DUMMY` / `LIFE_DOCS_DUMMY`** — demo checklists.
- **`HEALTH_STAGE_NAMES` / `HEALTH_STAGES`** — pipeline stages: **Document
  Verification → Quoting → Enrollment → Closed**. The function reads GHL's live
  stage name first; the ID map is a fallback.
- **Computed helpers (real):** `subsidy`/`fplPct` (ACA FPL %), `csrTier` (CSR
  band), `netPremium` (gross/APTC/net).
- **`activityTimeline()`** — real: emails (Conversations), form submissions,
  notes, tasks; each source independently try/caught.
- **Return shape:** `identity`, `household` (with `incomeBreakdown`, `dependents`,
  `lastVerified`), `serviceLines` (Health card carries `healthDetail`),
  `documentsByLine`, `activity`, `opportunities`.
- Env: `GHL_PIT`, `GHL_PIPELINE_ID`.

### 3.9 `netlify/functions/ghl-email.mjs` *(email endpoint)*
`GET` (thread + from-addresses) / `POST` (send). **`FROM_ADDRESSES`** populates
the compose dropdown — **edit to your verified sending addresses** (GHL has no
API to list them). Send uses `POST /conversations/messages/outbound`; needs the
PIT to have conversations **write** scope. Email lands in the contact's GHL
thread. Real.

---

## 4. Data flow (quick)

- **Open app:** `App` → no selection → `ContactList` seeds DEMO rows + fetches
  `/contacts`.
- **Click client:** `App` sets `selected` → `UnifiedContactView` → adapter calls
  `/contact/:id` → renders real + vision; on failure falls back to `MOCK`.
- **Growth tab:** `ContactList` renders `<Growth rows={rows}/>`, which merges
  seed + real and models the book.
- **Send email:** Email button → `GET …/email` loads thread + from-list → write
  + confirm → `POST …/email` → thread refreshes.

---

## 5. Real vs. demo ("Potemkin") ledger

**Real (live GHL data or computed from it):**
- Client list + search; opportunities
- Identity (incl. business name/ITIN/middle name/sex/immigration)
- Household (income breakdown, structured dependents, employment, payment,
  last-verified)
- ACA subsidy %, CSR tier, net-premium-after-APTC (computed from income + size)
- Health/ACA card: live pipeline stage + expandable rail
- Health document checklist (file-upload fields)
- Recent activity timeline (emails, forms, notes, tasks)
- Email send + thread (once FROM_ADDRESSES + write scope are set)

**Demo / vision (not wired):**
- Health detail panel's plan/carrier/effectuation/SEP/app#/GetCoveredNJ status
  (GetCoveredNJ has no API)
- The 7 non-Health service-line cards, their rails, policy detail, and steps
- Cross-sell Tier 1 (auto flags) + Tier 2 (suggested review queue)
- AI summary, compliance strip, next best action, OCR preview, call transcript,
  call-summary activity row, "request missing docs" chase, Add-misc docs
- List page: entity toggle, bell, filter views + custom view builder, rollup
  tiles' dollar/percentage values and drill-down splits (client count is real)
- Growth tab: entire dollar/effort/tier layer is MODELED; the roster/counts are
  real, and the household grouping is modeled from real form fields
- The six DEMO seed households in `demoData.js` (explicitly labeled)
- WhatsApp button (disabled)

Demo items carry visible "demo"/"modeled" labels in the UI.

---

## 6. "Where do I change X?" index

| I want to… | Edit | Notes |
|---|---|---|
| Point at a different GHL location | `src/App.jsx` → `LOCATION_ID` | One line; also set that PIT in Netlify env. |
| Update a custom-field mapping | `ghl-contact.mjs` → `F` | Keys must match GHL `fieldKey` exactly. |
| Set the business-name field key | `ghl-contact.mjs` → `F.business_name` | No confirmed key yet — create field in GHL, then set it. |
| Change the Health doc checklist | `ghl-contact.mjs` → `HEALTH_DOCS` | `[label, fileUploadFieldKey]`. |
| Change Tax/Life demo checklists | `ghl-contact.mjs` → `TAX_DOCS_DUMMY` / `LIFE_DOCS_DUMMY` | `[label, present]`. |
| Change pipeline stage names | `ghl-contact.mjs` → `HEALTH_STAGE_NAMES` / `HEALTH_STAGES` | Function reads live name first; ID map is fallback. |
| Change Health-stage subtasks | `UnifiedContactView.jsx` → `STAGE_STEPS.health` | Placeholder steps. |
| Edit the Health detail panel values | `ghl-contact.mjs` → `healthDetail` block | Computed = real; rest = demo placeholders. |
| Edit Tier-1 auto flags / Tier-2 suggestions | `UnifiedContactView.jsx` → `AUTO_FLAGS` / `SUGGESTED_FLAGS` | Demo. |
| Edit the Quick Update field list | `UnifiedContactView.jsx` → `QUICK_FIELDS` | Friendly label → real key. |
| Edit email from-addresses | `ghl-email.mjs` → `FROM_ADDRESSES` | Must be verified sending addresses. |
| Edit demo seed clients | `src/demoData.js` → `DEMO_HOUSEHOLDS` | Form-capturable fields only. |
| Edit the modeled revenue per line | `demoData.js` → `LINE_REV` / `RECURRING` | Drives Growth dollar values. |
| Edit preset filter views | `ContactList.jsx` → `PRESETS` | Condition lists. |
| Edit rollup tiles / drill splits | `ContactList.jsx` → `stats` | Counts real; values/splits demo. |
| Change colors / styling | the `CSS` string at the top of each component | Inline; no external stylesheet. |

---

## 7. Deploy / run

**Local dev** (Node 18+): `npm install` then `npm run dev` (UI), or
`npx netlify dev` (UI + Functions).

**Deploy:** push to `main` → Netlify auto-builds from `netlify.toml`
(`npm run build`, publish `dist`, Functions from `netlify/functions/`). After
env changes use **Clear cache and deploy**.

**Verify backend** in a browser after deploy:
- `https://SITE/api/ghl/5awBlPxYQVQGyd1XudNB/contacts`
- `https://SITE/api/ghl/5awBlPxYQVQGyd1XudNB/contact/<id>`

**Embed in GHL:** Settings → Custom Menu Links → Create New → iFrame → the
Netlify site URL.

**Folder structure matters:** GitHub web upload flattens folders and breaks the
build. Use github.dev (press `.`) or "Create new file" with the full slash path,
and commit to `main`.

---

## 8. Replicating to a new franchise location

1. Set `LOCATION_ID` in `src/App.jsx`.
2. Confirm the new location's custom-field keys match `F` in `ghl-contact.mjs`.
3. Set `GHL_PIT` (+ `GHL_PIPELINE_ID`) in Netlify env.
4. Set `FROM_ADDRESSES` in `ghl-email.mjs` to that location's verified addresses.
5. Deploy and embed as a Custom Menu Link.

---

## 9. Gotchas

- **Token is server-side only** — PIT lives in Netlify env, read only by the
  Functions. Never in `src/`.
- **PIT scopes:** read — contacts, opportunities, custom fields, conversations,
  forms, notes, tasks; **write** — conversations (for email send). A missing
  scope shows as a 401/403 from a Function.
- **MOCK fallback:** a "Maria Gonzalez" screen in production means the detail
  fetch failed — check Netlify Function logs and the `/api/...` URLs.
- **business_name** has no confirmed GHL field key yet — blank on live until the
  field is created and `F.business_name` is set.
- **Per-line status is modeled** — the filter views, custom views, and Growth
  line membership run on a deterministic model until real per-line status fields
  exist in GHL. Creating those fields makes all of it live with no code change.
- **No public "contact timeline" or "list verified emails" endpoint** in GHL —
  the activity feed is assembled from several endpoints; the email from-list is
  hardcoded config.
- **No router** — navigation is `App`'s `selected` state + `?contactId=` deep
  links.
