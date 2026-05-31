/* ============================================================================
   Netlify Function · /api/ghl/:locationId/contact/:id
   ----------------------------------------------------------------------------
   Assembles ONE rich record for the detail view:
     REAL   → identity, immigration, household, ACA-subsidy estimate, document
              checklist, the Health card + Insurance Workflow stage rail, real
              opportunities, and real EMAIL activity (Conversations API).
     VISION → the other seven service lines, cross-sell signals, and a few
              demo activity events — clearly the Potemkin layer.
   Every real call is best-effort; a failure falls back to vision so the screen
   never comes up empty. PIT stays server-side (env GHL_PIT).
   ENV: GHL_PIT, GHL_PIPELINE_ID (qT9EmKMANkGoTm8IAuQ4). locationId from path.
   ========================================================================== */

const GHL_BASE = "https://services.leadconnectorhq.com";
const VERSION  = "2021-07-28";

/* ---- field map (real keys for location 5awBlPxYQVQGyd1XudNB) ---- */
const F = {
  middle_name: "contact.middle_name", sex: "contact.sex",
  ssn: "contact.social_security_numberssn", drivers_license: "contact.drivers_license",
  language: "contact.language", referred_by: "contact.referred_by",
  is_citizen: "contact.are_you_a_us_citizen", citizenship_path: "contact.how_did_you_obtain_citizenship",
  years_in_us: "contact.years_in_us", immigration_status: "contact.immigration_status_number",
  visa_type: "contact.visa_type", visa_exp: "contact.visa_expiration",
  alien_number: "contact.alien_number", ead: "contact.ead_category_0", asylee: "contact.asylee_status",
  marital: "contact.marital_status", income: "contact.annual_income",
  spouse_name: "contact.spouse_name", spouse_age: "contact.spouse_age",
  has_deps: "contact.dependents", dep_name: "contact.dependent_name", dep_age: "contact.dependent_age",
  services: "contact.services_selected",
};
const DL_OPT = { state: "e0a1bfce-2d60-46c1-af0e-9fdc8cf88d30", exp: "35414f41-c04c-492b-982b-dea0964b4525" };

/* Document checklists, per service line.
   HEALTH_DOCS are REAL — each maps to a file-upload field; present = has value.
   TAX_DOCS and LIFE_DOCS are STATIC DUMMY (no API) — distinct lists so the demo
   shows three different gates without implying they're wired. */
const HEALTH_DOCS = [
  ["Driver's License",            "contact.contactsample_document_k8i_copy"],
  ["Passport photo",              "contact.american_passport_photo"],
  ["Foreign passport",            "contact.foreign_passport_photo"],
  ["Immigration card (I-551/766)","contact.front__back_immigration_card_i551__i766_image_upload"],
  ["I-94 arrival record",         "contact.i94_arrival_record"],
  ["I-797 notice of action",      "contact.i797_notice_of_action_if_available"],
  ["Naturalization certificate",  "contact.naturalization_certificate_n550n570"],
  ["Consular ID",                 "contact.front_consular_id_image_upload"],
];
// dummy = [label, present] — hardcoded demo state, no lookup
const TAX_DOCS_DUMMY = [
  ["W-2 (all employers)", true], ["1099 forms", true], ["Prior-year 1040", true],
  ["1098 mortgage interest", false], ["Dependent SSNs", true], ["IDs for all filers", false],
];
const LIFE_DOCS_DUMMY = [
  ["Completed application", true], ["Medical exam (paramed)", false],
  ["Attending Physician Statement (APS)", false], ["Prior policy (if replacement)", false],
  ["Beneficiary designation", true],
];

/* Insurance Workflow (qT9EmKMANkGoTm8IAuQ4) */
const HEALTH_STAGE_NAMES = ["Document Collection", "Documents Complete", "Enrollment", "Closed"];
const HEALTH_STAGES = {
  "31b7a48e-3996-4f51-8740-d45de7d6649b": "Document Collection",
  "ef01de2c-edf6-4944-8371-284637c2a91c": "Documents Complete",
  "4dbeca01-0e50-4117-99bd-a640245eed56": "Enrollment",
  "80e42234-52b3-48f3-8e8f-a7ba2e6431f1": "Closed",
};

/* ---- VISION layer (Potemkin) ---- */
const VISION_CARDS = [
  { key: "medicare", label: "Medicare", state: "crosssell", detail: "Cross-sell triggered", sub: "Eligible 2026-12 · opp open" },
  { key: "life", label: "Life Insurance", state: "none", detail: "Not engaged", sub: "life_gap flag set" },
  { key: "group", label: "Group / Ancillary", state: "na", detail: "N/A — self-employed", sub: "(employees = 0)" },
  { key: "tax", label: "Tax", state: "active", detail: "Active · 2024 filed", sub: "Toro #TR-8842 · refund $2.1k" },
  { key: "bookkeeping", label: "Bookkeeping", state: "active", detail: "Active · monthly", sub: "QBO · 2025-04 closed" },
  { key: "advisory", label: "Advisory", state: "crosssell", detail: "Cross-sell triggered", sub: "income > threshold · opp open" },
  { key: "pc", label: "P&C", state: "pending", detail: "Pending P&C launch", sub: "Eligible · has property + biz" },
];
const VISION_CROSSSELL = [
  { sev: "open", title: "Medicare-eligible 2026-12 (turns 64y9m)", detail: "Opportunity auto-created in Medicare pipeline · assigned to Julio · stage 01" },
  { sev: "open", title: "Advisory cross-sell · AGI > threshold AND advisory_status=none", detail: "Opportunity auto-created · assigned to Julio · stage 01 · pending outreach" },
  { sev: "queued", title: "Life gap flag set", detail: "(high income, no Life) · queued behind Advisory · cluster prevents firing twice" },
];

/* ---- helpers ---- */
const ghl = async (path) => {
  const r = await fetch(`${GHL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${process.env.GHL_PIT}`, Version: VERSION, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`GHL ${r.status} on ${path}`);
  return r.json();
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
const mask = (v) => (v ? `***-**-${String(v).slice(-4)}` : "—");
const num = (v) => Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;

function composite(val, optId, labelRe) {
  if (val == null) return undefined;
  if (typeof val === "object" && !Array.isArray(val)) {
    if (val[optId] != null) return val[optId];
    const k = Object.keys(val).find((kk) => labelRe.test(kk));
    return k ? val[k] : undefined;
  }
  if (Array.isArray(val)) {
    const hit = val.find((x) => x?.id === optId || labelRe.test(x?.label || ""));
    return hit ? (hit.value ?? hit.fieldValue) : undefined;
  }
  return undefined;
}

// 2025 FPL (48 states): $15,060 + $5,380 per extra person. ACA subsidy band 100–400%.
function subsidy(income, size) {
  if (!income || !size) return undefined;
  const fpl = 15060 + (size - 1) * 5380;
  const pct = Math.round((income / fpl) * 100);
  const band = pct >= 100 && pct <= 400 ? "subsidy-eligible" : pct < 100 ? "below 100% FPL" : "above 400% FPL";
  return `~${pct}% FPL · ${band} (est.)`;
}

async function idToKey(loc) {
  const data = await ghl(`/locations/${loc}/customFields`);
  const m = {};
  for (const f of data.customFields || []) m[f.id] = f.fieldKey;
  return m;
}

// REAL activity timeline — mirrors the GHL contact record as closely as the
// public API allows: emails (Conversations), form submissions, notes, tasks.
// Each source is best-effort and independently try/caught. Site visits/page
// views are NOT in the public API, so they are not faked here.
async function activityTimeline(loc, contactId) {
  const items = [];
  const push = (icon, title, body, ts, extra = {}) =>
    items.push({ icon, title, body, meta: ts || "", _ts: Date.parse(ts || 0) || 0, ...extra });

  // 1. Emails (+ calls/SMS/WhatsApp if present) from Conversations
  try {
    const s = await ghl(`/conversations/search?locationId=${loc}&contactId=${contactId}`);
    for (const c of (s.conversations || []).slice(0, 3)) {
      try {
        const m = await ghl(`/conversations/${c.id}/messages`);
        const msgs = m.messages?.messages || m.messages || [];
        for (const msg of msgs) {
          const t = String(msg.messageType || msg.type || "").toUpperCase();
          const out = String(msg.direction || "").toLowerCase() === "outbound";
          const ts = msg.dateAdded || msg.dateUpdated;
          if (t.includes("EMAIL"))
            push("email", out ? "Email sent to client" : "Email from client",
              msg.subject || msg.meta?.email?.subject || (msg.body || "").toString().slice(0, 160) || "(email)", ts, { expandable: true });
          else if (t.includes("SMS"))
            push("sms", out ? "SMS sent" : "SMS received", (msg.body || "").toString().slice(0, 160), ts);
          else if (t.includes("CALL"))
            push("call", out ? "Outbound call" : "Inbound call", "Call logged", ts, { expandable: true });
          else if (t.includes("WHATS"))
            push("wapp", "WhatsApp message", (msg.body || "").toString().slice(0, 160), ts);
        }
      } catch (_) {}
    }
  } catch (_) {}

  // 2. Form submissions (needs the "View Forms" PIT scope)
  try {
    const fs = await ghl(`/forms/submissions?locationId=${loc}&contactId=${contactId}&limit=20`);
    for (const sub of fs.submissions || []) {
      push("form", `Form submitted · ${sub.formName || sub.name || "intake form"}`,
        "Captured to contact record", sub.createdAt || sub.dateAdded);
    }
  } catch (_) {}

  // 3. Notes
  try {
    const n = await ghl(`/contacts/${contactId}/notes`);
    for (const note of n.notes || []) {
      push("note", "Note added", (note.body || "").toString().slice(0, 160), note.dateAdded || note.createdAt);
    }
  } catch (_) {}

  // 4. Tasks
  try {
    const tk = await ghl(`/contacts/${contactId}/tasks`);
    for (const t of tk.tasks || []) {
      push("task", `Task · ${t.title || "follow-up"}`,
        t.completed ? "Completed" : (t.dueDate ? `Due ${String(t.dueDate).slice(0, 10)}` : "Open"),
        t.dateAdded || t.dateUpdated || t.dueDate);
    }
  } catch (_) {}

  items.sort((a, b) => b._ts - a._ts);
  return items.slice(0, 12);
}

const oppStage = (o) =>
  o.pipelineStageName || o.stageName || HEALTH_STAGES[o.pipelineStageId] || HEALTH_STAGES[o.stageId] || "";

export default async (req, context) => {
  const id = context.params?.id, loc = context.params?.locationId;
  if (!id || !loc) return json({ error: "missing locationId or contact id" }, 400);

  try {
    const idKey = await idToKey(loc);
    const cRes = await ghl(`/contacts/${id}`);
    const contact = cRes.contact || cRes;
    const byKey = (contact.customFields || []).map((cf) => ({ key: idKey[cf.id], value: cf.value }));
    const gv = (fieldKey) => (byKey.find((x) => x.key === fieldKey) || {}).value;
    const g = (k) => gv(F[k]);

    // opportunities (best-effort)
    let opps = [];
    try {
      const q = new URLSearchParams({ location_id: loc, contact_id: id });
      if (process.env.GHL_PIPELINE_ID) q.set("pipeline_id", process.env.GHL_PIPELINE_ID);
      const oRes = await ghl(`/opportunities/search?${q.toString()}`);
      opps = oRes.opportunities || [];
    } catch (_) {}

    // real activity timeline (emails + form submissions + notes + tasks)
    const activity = await activityTimeline(loc, id);
    // DEMO: prepend a sample call summary to show call-logging is possible.
    // (GHL Voice + AI call summaries are a Phase-C capability; this is a placeholder.)
    activity.unshift({
      icon: "call",
      title: "Call summary · inbound",
      meta: new Date().toISOString(),
      body: "8m 42s · Discussed plan options and document needs. Client confirmed income unchanged; interested in adding a dependent. Action: send enrollment docs, follow up in 3 days.",
      expandable: true,
      demo: true,
    });

    // identity + immigration
    const dl = g("drivers_license");
    const isCitizen = String(g("is_citizen") || "").toLowerCase() === "yes";
    const path = g("citizenship_path");
    const citizenship = isCitizen
      ? `US Citizen (${/natural/i.test(path || "") ? "naturalized" : "born in USA"})`
      : (g("immigration_status") || g("visa_type") || "Non-citizen");

    // household + subsidy
    const depName = g("dep_name");
    const depCount = String(g("has_deps") || "").toUpperCase() === "Y" ? (depName ? 1 : 1) : 0;
    const spouse = g("spouse_name");
    const size = 1 + (spouse ? 1 : 0) + depCount;
    const income = num(g("income"));

    // Health card from the real Insurance Workflow stage
    const healthOpp = opps[0];
    const stageName = healthOpp ? oppStage(healthOpp) : "";
    const idx = HEALTH_STAGE_NAMES.findIndex((n) => n.toLowerCase() === String(stageName).toLowerCase());
    const healthCard = {
      key: "health", label: "Health / ACA",
      state: stageName ? (idx === 3 ? "active" : "pending") : "none",
      detail: stageName || "Not engaged", sub: stageName ? "Insurance Workflow" : "",
      pipeline: {
        oppName: healthOpp?.name || "Insurance Workflow",
        currentIndex: idx,
        stages: HEALTH_STAGE_NAMES.map((n, i) => ({ name: n, done: idx > i, current: idx === i })),
      },
    };

    return json({
      id: contact.id, firstName: contact.firstName, lastName: contact.lastName,
      initials: (contact.firstName?.[0] || "") + (contact.lastName?.[0] || ""),
      dob: contact.dateOfBirth, city: contact.city, state: contact.state,
      languagePrimary: g("language"),
      clientOf: (contact.tags || []).filter((t) => /JN/i.test(t)),
      source: g("referred_by"),
      identity: {
        phone: contact.phone, email: contact.email, ssnMasked: mask(g("ssn")),
        dlState: composite(dl, DL_OPT.state, /state/i), dlExp: composite(dl, DL_OPT.exp, /expir/i),
        address: contact.address1, citizenship,
        inUsSince: g("years_in_us") ? `${g("years_in_us")} yrs` : undefined,
        immigration: {
          status: g("immigration_status"), visaType: g("visa_type"), visaExp: g("visa_exp"),
          alien: g("alien_number"), ead: g("ead"), asylee: g("asylee"), path,
        },
      },
      household: {
        maritalStatus: g("marital"),
        spouse: spouse ? { name: spouse, age: g("spouse_age") } : null,
        size: `${size}${depCount ? ` (incl. ${depCount} dependent${depCount > 1 ? "s" : ""})` : ""}`,
        income: income ? `$${income.toLocaleString()}` : undefined,
        dependents: depName ? [{ name: depName, age: g("dep_age") }] : [],
        subsidyHint: subsidy(income, size),
      },
      documentsByLine: {
        health: HEALTH_DOCS.map(([label, key]) => ({ label, present: !!gv(key) })),
        tax:  TAX_DOCS_DUMMY.map(([label, present]) => ({ label, present, dummy: true })),
        life: LIFE_DOCS_DUMMY.map(([label, present]) => ({ label, present, dummy: true })),
      },
      serviceLines: [healthCard, ...VISION_CARDS],
      crossSell: VISION_CROSSSELL,
      activity,
      activityCount: activity.length,
      opportunities: opps.map((o) => ({ line: o.name || "Insurance Workflow", stage: oppStage(o), meta: o.status || "" })),
    });
  } catch (e) {
    return json({ error: String(e.message || e) }, 502);
  }
};

export const config = { path: "/api/ghl/:locationId/contact/:id" };
