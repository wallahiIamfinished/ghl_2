/* ============================================================================
   Netlify Function · /api/ghl/contact/:id
   ----------------------------------------------------------------------------
   GHL-direct proxy for the Unified Contact View (demo).
   - Holds the Private Integration Token SERVER-SIDE (env GHL_PIT). The browser
     never sees it; GHL has no browser CORS anyway.
   - Resolves custom-field id<->fieldKey from your field definitions, so
     GHL_FIELD_MAP below stays readable (keyed by fieldKey, not opaque ids).
   - Returns the already-normalized UnifiedContact the React adapter expects.

   ENV (set in Netlify → Site config → Environment variables):
     GHL_PIT          Private Integration Token (read scopes). See note below.
     GHL_PIPELINE_ID  the single pipeline id (optional; filters opps)

   locationId is taken from the URL path (/api/ghl/:locationId/contact/:id) so
   one deployment serves multiple sub-accounts. NOTE on token blast radius:
   a path-based location implies either (a) an AGENCY PIT that can reach every
   location — broad blast radius, guard it hard — or (b) a per-location PIT
   looked up by locationId. For this demo a sub-account PIT whose location
   matches the path is fine.
   ========================================================================== */

const GHL_BASE = "https://services.leadconnectorhq.com";
const VERSION  = "2021-07-28";

/* Real field map for location 5awBlPxYQVQGyd1XudNB (built from /customFields).
   Sensitive fields (card #, CVV, bank acct/routing, ITIN) are intentionally
   NOT mapped — they must not render in the UI. SSN is mapped but masked. */
const GHL_FIELD_MAP = {
  // identity
  middle_name:      "contact.middle_name",
  sex:              "contact.sex",
  ssn:              "contact.social_security_numberssn",   // masked in normalize()
  drivers_license:  "contact.drivers_license",             // TEXTBOX_LIST: State/Number/Issued/Expired
  language_primary: "contact.language",
  referred_by:      "contact.referred_by",
  // citizenship / immigration
  is_us_citizen:    "contact.are_you_a_us_citizen",
  citizenship_path: "contact.how_did_you_obtain_citizenship",
  years_in_us:      "contact.years_in_us",
  immigration_status:"contact.immigration_status_number",
  visa_type:        "contact.visa_type",
  // household
  marital_status:   "contact.marital_status",
  annual_income:    "contact.annual_income",
  spouse_name:      "contact.spouse_name",
  spouse_age:       "contact.spouse_age",
  spouse_income:    "contact.spouse_yearly_income",
  has_dependents:   "contact.dependents",                  // Y / N
  dependent_name:   "contact.dependent_name",
  dependent_age:    "contact.dependent_age",
  dependent_income: "contact.dependent_yearly_income",
  // engagement — no per-line status fields exist in this env; coarse stand-in
  services_selected:"contact.services_selected",           // Insurance / Taxes / Credit Repair
  payment_method:   "contact.payment_method",
};

// Sub-option ids inside the drivers_license TEXTBOX_LIST (for composite parse).
const DL_OPT = {
  state: "e0a1bfce-2d60-46c1-af0e-9fdc8cf88d30",
  number:"97696a92-ea9f-4fb7-9825-d55018c6bc3c",
  issued:"ec9b4bad-5f0d-4c49-b07b-5351aae61b14",
  exp:   "35414f41-c04c-492b-982b-dea0964b4525",
};

const _defsCache = {}; // idToKey maps cached per location (warm instance)

async function ghl(path) {
  const r = await fetch(`${GHL_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.GHL_PIT}`,
      Version: VERSION,
      Accept: "application/json",
    },
  });
  if (!r.ok) throw new Error(`GHL ${r.status} on ${path}`);
  return r.json();
}

async function idToKey(loc) {
  if (_defsCache[loc]) return _defsCache[loc];
  const data = await ghl(`/locations/${loc}/customFields`);
  const map = {};
  for (const f of data.customFields || []) map[f.id] = f.fieldKey;
  _defsCache[loc] = map;
  return map;
}

function mask(v) { return v ? `***-**-${String(v).slice(-4)}` : "—"; }
function arr(v) { return Array.isArray(v) ? v : v ? [v] : []; }

// TEXTBOX_LIST values can come back keyed by sub-option id OR label. Pull by
// trying the known id first, then a label substring.
function composite(val, optId, labelRe) {
  if (val == null) return undefined;
  if (typeof val === "object" && !Array.isArray(val)) {
    if (val[optId] != null) return val[optId];
    const k = Object.keys(val).find((kk) => labelRe.test(kk));
    if (k) return val[k];
  }
  if (Array.isArray(val)) {
    const hit = val.find((x) => x?.id === optId || labelRe.test(x?.label || ""));
    if (hit) return hit.value ?? hit.fieldValue;
  }
  return undefined;
}

// Insurance Workflow (qT9EmKMANkGoTm8IAuQ4) — stage id → name, and name → card state.
const HEALTH_STAGES = {
  "31b7a48e-3996-4f51-8740-d45de7d6649b": "Document Collection",
  "ef01de2c-edf6-4944-8371-284637c2a91c": "Documents Complete",
  "4dbeca01-0e50-4117-99bd-a640245eed56": "Enrollment",
  "80e42234-52b3-48f3-8e8f-a7ba2e6431f1": "Closed",
};
const HEALTH_STATE = { // green when done, ochre while in-flight
  "document collection": "pending", "documents complete": "pending",
  "enrollment": "pending", "closed": "active",
};

// Block-D: Health reflects the real pipeline stage when an opp exists, else the
// Services Selected checkbox. Other lines are the Potemkin stand-in.
function serviceLines(selected, healthStage) {
  const sel = arr(selected).map((s) => String(s).toLowerCase());
  const has = (re) => sel.some((s) => re.test(s));
  const st = (on) => (on ? "active" : "none");

  const health = healthStage
    ? { key: "health", label: "Health / ACA", state: HEALTH_STATE[String(healthStage).toLowerCase()] || "pending", detail: healthStage, sub: "Insurance Workflow" }
    : { key: "health", label: "Health / ACA", state: st(has(/insurance/)), detail: has(/insurance/) ? "Selected" : "Not engaged", sub: "" };

  return [
    health,
    { key: "medicare", label: "Medicare", state: "none", detail: "Not engaged", sub: "" },
    { key: "life", label: "Life Insurance", state: "none", detail: "Not engaged", sub: "" },
    { key: "group", label: "Group / Ancillary", state: "none", detail: "Not engaged", sub: "" },
    { key: "tax", label: "Tax", state: st(has(/tax/)), detail: has(/tax/) ? "Selected" : "Not engaged", sub: "" },
    { key: "bookkeeping", label: "Bookkeeping", state: "none", detail: "Not engaged", sub: "" },
    { key: "advisory", label: "Advisory", state: "none", detail: "Not engaged", sub: "" },
    { key: "credit", label: "Credit Repair", state: st(has(/credit/)), detail: has(/credit/) ? "Selected" : "Not engaged", sub: "" },
  ];
}
const oppStage = (o) =>
  o.pipelineStageName || o.stageName || HEALTH_STAGES[o.pipelineStageId] || HEALTH_STAGES[o.stageId] || "";

function normalize(contact, opps, idKey) {
  // Contact GET returns customFields as [{ id, value }] keyed by id → remap to fieldKey.
  const byKey = (contact.customFields || []).map((cf) => ({ key: idKey[cf.id], value: cf.value }));
  const g = (k) => {
    const fk = GHL_FIELD_MAP[k];
    const hit = byKey.find((x) => x.key === fk);
    return hit ? hit.value : undefined;
  };

  const dl = g("drivers_license");
  const dlState = composite(dl, DL_OPT.state, /state/i);
  const dlExp   = composite(dl, DL_OPT.exp,   /expir/i);

  const isCitizen = String(g("is_us_citizen") || "").toLowerCase() === "yes";
  const path = g("citizenship_path");
  const citizenship = isCitizen
    ? (path ? `US Citizen (${/natural/i.test(path) ? "naturalized" : "born in USA"})` : "US Citizen")
    : (g("immigration_status") || g("visa_type") || "Non-citizen");
  const yrs = g("years_in_us");

  const depName = g("dependent_name");
  const dependents = depName
    ? [{ name: depName, age: g("dependent_age"), note: g("dependent_income") ? `income ${g("dependent_income")}` : "" }]
    : [];

  return {
    id: contact.id,
    firstName: contact.firstName, lastName: contact.lastName,
    initials: (contact.firstName?.[0] || "") + (contact.lastName?.[0] || ""),
    dob: contact.dateOfBirth, age: undefined,
    city: contact.city, state: contact.state,
    languagePrimary: g("language_primary"),
    clientOf: (contact.tags || []).filter((t) => /JN/i.test(t)),
    source: g("referred_by"),
    identity: {
      phone: contact.phone, email: contact.email, ssnMasked: mask(g("ssn")),
      dlState, dlExp, address: contact.address1,
      citizenship, inUsSince: yrs ? `${yrs} yrs` : undefined,
    },
    household: {
      maritalStatus: g("marital_status"),
      spouse: g("spouse_name") ? { name: g("spouse_name"), age: g("spouse_age") } : null,
      size: undefined, income: g("annual_income"), incomeBasis: undefined,
      employment: undefined,                 // no employment field in this env
      dependents,
    },
    serviceLines: serviceLines(g("services_selected"), opps?.[0] ? oppStage(opps[0]) : undefined),
    crossSell: [],          // no computed cross-sell fields in this env
    activity: [],           // not wired in GHL-direct demo
    documents: [],          // SharePoint = Phase C
    opportunities: (opps || []).map((o) => ({
      line: o.name || "Insurance Workflow", stage: oppStage(o),
      meta: o.status || "", flag: false,
    })),
  };
}

export default async (req, context) => {
  const id  = context.params?.id;
  const loc = context.params?.locationId;
  if (!id || !loc) return json({ error: "missing locationId or contact id" }, 400);
  try {
    const pipe = process.env.GHL_PIPELINE_ID;
    const idKey = await idToKey(loc);

    const cRes = await ghl(`/contacts/${id}`);
    const contact = cRes.contact || cRes;

    // Opportunities are best-effort: if the search param casing is off, the
    // contact + Health-from-services still render. GHL_PIPELINE_ID filters to
    // the Insurance Workflow (qT9EmKMANkGoTm8IAuQ4).
    let opps = [];
    try {
      const q = new URLSearchParams({ location_id: loc, contact_id: id });
      if (pipe) q.set("pipeline_id", pipe);
      const oRes = await ghl(`/opportunities/search?${q.toString()}`);
      opps = oRes.opportunities || [];
    } catch (_) { /* non-fatal */ }

    return json(normalize(contact, opps, idKey));
  } catch (e) {
    return json({ error: String(e.message || e) }, 502);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "content-type": "application/json" },
  });
}

export const config = { path: "/api/ghl/:locationId/contact/:id" };
