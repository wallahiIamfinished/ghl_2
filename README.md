# JN Client 360 — Worker UI

Interactive, GHL-direct unified client view. Live client list → 360 detail view.
Health pulls real data from the Insurance Workflow pipeline; the remaining service
lines are the vision layer until those workflows are built.

## Structure (keep these paths exactly)
```
jn-worker-ui/
├─ index.html
├─ package.json
├─ vite.config.js
├─ netlify.toml
├─ .env.example
├─ netlify/
│  └─ functions/
│     ├─ ghl-contact.mjs     # GET /api/ghl/:locationId/contact/:id  (detail)
│     └─ ghl-contacts.mjs    # GET /api/ghl/:locationId/contacts     (list)
└─ src/
   ├─ main.jsx
   ├─ App.jsx                # list ↔ detail routing
   ├─ ContactList.jsx        # live client picker
   └─ UnifiedContactView.jsx # the dashboard
```

## Deploy (all in-browser)
1. Push this folder to a GitHub repo (drag the folders into GitHub's upload so
   `src/` and `netlify/` are preserved — do NOT flatten).
2. Netlify → Add new site → Import from Git → pick the repo. Build settings are
   read from `netlify.toml`.
3. Netlify → Site configuration → Environment variables:
   - `GHL_PIT` = sub-account Private Integration Token (read: contacts,
     opportunities, custom fields/locations)
   - `GHL_PIPELINE_ID` = `qT9EmKMANkGoTm8IAuQ4`
4. Deploys → Trigger deploy → **Clear cache and deploy site**.
5. Verify:
   - `https://SITE/api/ghl/5awBlPxYQVQGyd1XudNB/contacts` → JSON list
   - `https://SITE/api/ghl/5awBlPxYQVQGyd1XudNB/contact/<id>` → JSON detail
6. GHL → Settings → Custom Menu Links → Create New → iFrame → link = `https://SITE`.

## Notes
- The PIT lives only in Netlify env, never in the client bundle.
- Sensitive fields (card #, CVV, bank acct, ITIN) are intentionally not surfaced;
  SSN is masked.
- Location id is in the URL path so one deployment can serve multiple sub-accounts.
