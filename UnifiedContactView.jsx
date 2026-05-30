import React, { useState, useEffect } from "react";
import {
  Phone, MessageSquare, MessageCircle, Mail, Plus, Play, FileText,
  PenLine, Zap, StickyNote, Flag, Search, ChevronDown, ExternalLink,
} from "lucide-react";

/* ============================================================================
   UNIFIED CONTACT VIEW  —  JN Insurance Worker UI
   ----------------------------------------------------------------------------
   One client, one screen. Renders Blocks A–F + activity/docs/opps for a single
   contact selected on the prior (client-list) page.

   DATA SOURCE
   -----------
   This component reads from an `adapter` prop. It ships with `mockAdapter`
   (the Maria Gonzalez record) so it renders immediately. To go live, pass
   `adapter={makeGhlAdapter(locationId)}` — that hits YOUR backend proxy, never
   the GHL API directly from the browser (token never touches client code).

   FIELD MAPPING
   -------------
   GHL_FIELD_MAP is the single place you wire your custom-field keys/IDs to the
   UI. Fill in the right-hand strings with your GHL field keys, and the
   normalizer does the rest. Block D/E are stage enums + computed bools.
   ========================================================================== */


/* ----------------------------------------------------------------------------
   1. GHL FIELD MAP  ◀──────────────  PLUG YOUR FIELD KEYS / IDS HERE
   GHL v2 returns customFields as [{ id, key, value }]. Map by `key` (stable)
   or `id`. Left = our model path; right = your GHL field key.
---------------------------------------------------------------------------- */
export const GHL_FIELD_MAP = {
  // Block A · identity
  ssn:                "contact.ssn",
  drivers_license:    "contact.drivers_license_num",
  dl_state:           "contact.dl_state",
  dl_exp:             "contact.dl_exp",
  // Block B · immigration
  citizenship:        "contact.citizenship_status",
  in_us_since:        "contact.in_us_since_year",
  language_primary:   "contact.language_primary",
  // Block C · household
  marital_status:     "contact.marital_status",
  spouse_name:        "contact.spouse_name",
  spouse_age:         "contact.spouse_age",
  household_size:     "contact.household_size",
  household_income:   "contact.annual_household_income",   // synced from Toro
  income_basis:       "contact.income_basis",
  employment:         "contact.employment_desc",
  dependents_json:    "contact.dependents_json",            // [{name,age,note,flag}]
  // Block D · service-line state (stage enums)
  health_status:      "contact.health_status",
  health_carrier:     "contact.health_carrier",
  health_effective:   "contact.health_effective_date",
  health_plan:        "contact.health_plan_id",
  medicare_status:    "contact.medicare_status",
  life_status:        "contact.life_status",
  life_carrier:       "contact.life_carrier",
  group_status:       "contact.group_status",
  tax_status:         "contact.tax_status",
  tax_ref:            "contact.tax_toro_ref",
  bookkeeping_status: "contact.bookkeeping_status",
  advisory_status:    "contact.advisory_status",
  pc_status:          "contact.pc_status",
  // Block E · computed cross-sell signals
  medicare_eligible_date: "contact.medicare_eligible_date",
  life_gap_flag:          "contact.life_gap_flag",
  advisory_eligible_flag: "contact.advisory_eligible_flag",
  tax_cross_sell_flag:    "contact.tax_cross_sell_flag",
  group_eligible_flag:    "contact.group_eligible_flag",
  // Block F · source/consent
  referred_by:        "contact.referred_by",
};

/* ----------------------------------------------------------------------------
   2. NORMALIZER  — GHL payload → UnifiedContact model the UI consumes.
   Adjust the picks if your service-line state lives on Opportunities/stages
   rather than rolled-up contact fields (flag this — see the note I sent).
---------------------------------------------------------------------------- */
function pick(fields, key) {
  if (!fields) return undefined;
  const f = fields.find((x) => x.key === key || x.id === key);
  return f ? f.value : undefined;
}

export function normalizeFromGHL({ contact, opportunities = [] }) {
  const cf = contact.customFields || contact.customField || [];
  const g = (k) => pick(cf, GHL_FIELD_MAP[k]);
  const maskSSN = (v) => (v ? `***-**-${String(v).slice(-4)}` : "—");

  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    dob: contact.dateOfBirth || g("dob"),
    city: contact.city,
    state: contact.state,
    languagePrimary: g("language_primary"),
    clientOf: (contact.tags || []).filter((t) => /JN /.test(t)),
    source: g("referred_by"),
    identity: {
      phone: contact.phone,
      email: contact.email,
      ssnMasked: maskSSN(g("ssn")),
      dlState: g("dl_state"),
      dlExp: g("dl_exp"),
      address: contact.address1,
      citizenship: g("citizenship"),
      inUsSince: g("in_us_since"),
    },
    household: {
      maritalStatus: g("marital_status"),
      spouse: g("spouse_name") ? { name: g("spouse_name"), age: g("spouse_age") } : null,
      size: g("household_size"),
      income: g("household_income"),
      incomeBasis: g("income_basis"),
      employment: g("employment"),
      dependents: safeJSON(g("dependents_json")) || [],
    },
    serviceLines: buildServiceLines(g),
    crossSell: [],     // populated by Block E mapper / workflow engine
    activity: [],      // from Conversations + workflow audit log
    documents: [],     // SharePoint pointers (search index)
    opportunities: opportunities.map((o) => ({
      line: o.pipelineName, stage: o.stageName, status: o.status,
    })),
  };
}
function safeJSON(v) { try { return JSON.parse(v); } catch { return null; } }
function buildServiceLines(g) { /* map each *_status enum → a card; see mock */ return []; }


/* ----------------------------------------------------------------------------
   3. ADAPTERS
   - mockAdapter: ships the demo record, renders with zero config.
   - ghlAdapter:  hits YOUR backend. The GHL Private-Integration token / OAuth
     access token lives server-side only. The browser never sees it, GHL's API
     has no browser CORS, and this keeps you inside IRS 4557 / GLBA access
     control. Your proxy does: GET contact + custom field defs + opportunities,
     run normalizeFromGHL, return the shaped object.
---------------------------------------------------------------------------- */
// locationId is in the path so one deployment can serve multiple sub-accounts
// (franchise replication).  Usage:  adapter={makeGhlAdapter(locationId)}
export const makeGhlAdapter = (locationId) => ({
  async getContact(contactId) {
    const res = await fetch(
      `/api/ghl/${encodeURIComponent(locationId)}/contact/${encodeURIComponent(contactId)}`,
      { headers: { Accept: "application/json" }, credentials: "include" }
    );
    if (!res.ok) throw new Error(`Proxy ${res.status}`);
    return res.json(); // already normalized server-side
  },
});

export const mockAdapter = { async getContact() { return MARIA; } };

// HYBRID — for the vision demo. Pulls the real contact, overlays real identity
// + the one genuinely-live service card (default "health") onto the polished
// mock so the rest of the screen still reads complete. ANY failure (network,
// empty fields, bad id) silently falls back to the full mock — the screen can
// never break in front of the client.   Usage:
//   adapter={makeHybridAdapter(locationId, { realCard: "health" })}
const dropEmpty = (o) =>
  Object.fromEntries(Object.entries(o || {}).filter(([, v]) =>
    v !== undefined && v !== null && v !== ""));

export const makeHybridAdapter = (locationId, { realCard = "health" } = {}) => ({
  async getContact(contactId) {
    try {
      const res = await fetch(
        `/api/ghl/${encodeURIComponent(locationId)}/contact/${encodeURIComponent(contactId)}`,
        { headers: { Accept: "application/json" }, credentials: "include" }
      );
      if (!res.ok) throw new Error(`Proxy ${res.status}`);
      const real = await res.json();
      const liveCard = (real.serviceLines || []).find((c) => c.key === realCard);
      return {
        ...MARIA,
        id: real.id || MARIA.id,
        firstName: real.firstName || MARIA.firstName,
        lastName: real.lastName || MARIA.lastName,
        initials: real.initials || MARIA.initials,
        source: real.source || MARIA.source,
        identity:  { ...MARIA.identity,  ...dropEmpty(real.identity) },
        household: { ...MARIA.household, ...dropEmpty(real.household) },
        // real card replaces its mock twin; every other card stays Potemkin
        serviceLines: MARIA.serviceLines.map((c) =>
          c.key === realCard && liveCard ? liveCard : c),
      };
    } catch {
      return MARIA; // bulletproof demo
    }
  },
});


/* ----------------------------------------------------------------------------
   4. MOCK RECORD  (matches the spec exactly)
---------------------------------------------------------------------------- */
const MARIA = {
  id: "C12345", firstName: "Maria", lastName: "Gonzalez", initials: "MG",
  dob: "1962-03-15", age: 63, city: "Hackensack", state: "NJ",
  languagePrimary: "Spanish",
  clientOf: ["JN Insurance", "JN Consulting"],
  source: "BNI referral via L. Saavedra",
  identity: {
    phone: "(201) 555-0142", email: "m.gonzalez@email.com",
    ssnMasked: "***-**-1234", dlState: "NJ", dlExp: "2028",
    address: "412 Anderson St, Hackensack NJ 07601",
    citizenship: "US Citizen (naturalized)", inUsSince: "1998 · 28 years",
  },
  household: {
    maritalStatus: "Married", spouse: { name: "Roberto", age: 61 },
    size: "4 (incl. 2 dependents)", income: "$94,500", incomeBasis: "self-employed",
    employment: "Owner · Gonzalez Cleaning LLC",
    dependents: [
      { name: "Sofia", age: 17, note: "college planning", flag: "529 trigger" },
      { name: "Luis", age: 14 },
    ],
    feeds: "Block C feeds ACA subsidy calc + Life UW + Advisory triggers",
  },
  serviceLines: [
    { key: "health", label: "Health / ACA", state: "active", detail: "Active · Horizon BCBS", sub: "Effective 2025-01-01 · plan #4Z" },
    { key: "medicare", label: "Medicare", state: "crosssell", detail: "Cross-sell triggered", sub: "Eligible 2026-12 · opp open" },
    { key: "life", label: "Life Insurance", state: "none", detail: "Not engaged", sub: "life_gap flag set" },
    { key: "group", label: "Group / Ancillary", state: "na", detail: "N/A — self-employed", sub: "(employees = 0)" },
    { key: "tax", label: "Tax", state: "active", detail: "Active · 2024 filed", sub: "Toro #TR-8842 · refund $2.1k" },
    { key: "bookkeeping", label: "Bookkeeping", state: "active", detail: "Active · monthly", sub: "QBO · 2025-04 closed" },
    { key: "advisory", label: "Advisory", state: "crosssell", detail: "Cross-sell triggered", sub: "income > threshold · opp open" },
    { key: "pc", label: "P&C", state: "pending", detail: "Pending P&C launch", sub: "Eligible · has property + biz" },
  ],
  serviceSummary: "4 active service lines · 2 cross-sell opportunities triggered · 1 P&C-eligible (waiting on activation)",
  crossSell: [
    { sev: "open", title: "Medicare-eligible 2026-12 (turns 64y9m)", detail: "Opportunity #M-1284 auto-created in Medicare pipeline · assigned to Julio · stage 01" },
    { sev: "open", title: "Advisory cross-sell · Tax AGI $94,500 > threshold AND advisory_status=none", detail: "Opportunity #A-0476 auto-created · assigned to Julio · stage 01 · pending outreach" },
    { sev: "queued", title: "Life gap flag set", detail: "(Tax client, high income, no Life) · queued behind Advisory · cluster prevents firing twice" },
  ],
  activity: [
    { icon: "call", title: "Call from Julio", meta: "14m 22s · Today 10:32 AM", body: "“Discussed Sofia's college plans, Maria interested in 529 strategy and life insurance for Roberto”", action: "play · view transcript" },
    { icon: "wapp", title: "WhatsApp from Maria", meta: "Yesterday 6:14 PM", body: "“Hola Julio, te mando el W-2 de Roberto para el tax. Gracias!” [paystub.jpg attached]" },
    { icon: "note", title: "Document filed · Julio's handwritten note (scanned)", meta: "2 days ago", body: "Auto-matched to contact (confidence 98%) · filed to /Health/Notes/2025-05/" },
    { icon: "sign", title: "Adobe Sign envelope completed · Tax 2024 engagement letter", meta: "5 days ago", body: "Filed to /Tax/2024/01-Engagement/ · GHL field tax_engagement_signed_date updated" },
    { icon: "flow", title: "Workflow fired · Medicare cross-sell trigger", meta: "8 days ago", body: "dob + 64y9m within 18 months · created opp · scheduled outreach for 2026-09" },
  ],
  documents: [
    "/Health/01-Intake/2025-Enrollment.pdf", "/Health/02-Identity/DL_scan.jpg",
    "/Health/03-Income/2024-W2-Roberto.pdf", "/Tax/2024/01-Source/W2-Maria.pdf",
    "/Tax/2024/03-Return/1040.pdf", "/Tax/2024/04-Filed/IRS-ack.pdf",
    "/Bookkeeping/2025-04/close.xlsx",
  ],
  documentsMore: 12,
  opportunities: [
    { line: "Health", stage: "stage 09 Active", meta: "opened 2024-11 · effectuated 2025-01" },
    { line: "Tax 2024", stage: "stage 07 Confirmed", meta: "opened 2025-02 · filed 2025-04" },
    { line: "Bookkeeping", stage: "stage 04 Monthly", meta: "active since 2024-08 · recurring" },
    { line: "Medicare", stage: "stage 01 Cross-sell", meta: "opened 8 days ago by workflow · Julio", flag: true },
    { line: "Advisory", stage: "stage 01 Cross-sell", meta: "", flag: true },
  ],
};


/* ----------------------------------------------------------------------------
   5. STYLE  (scoped; no Tailwind dependency — portable to any React app)
---------------------------------------------------------------------------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap');
.ucv{--cream:#F4F1E8;--paper:#FFFFFF;--teal:#1F4D4A;--ink:#1A1A1A;--ink2:#4A4A48;
  --muted:#7A7A75;--olive:#4A5D2C;--ochre:#8B6914;--rust:#A8442F;--line:rgba(26,26,26,.1);
  --serif:'Newsreader',Georgia,serif;--sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;
  font-family:var(--sans);color:var(--ink);background:var(--cream);min-height:100%;
  padding:22px;box-sizing:border-box;font-size:13px;line-height:1.45;}
.ucv *{box-sizing:border-box;}
.ucv .shell{max-width:1180px;margin:0 auto;background:var(--cream);border:1px solid var(--line);border-radius:8px;overflow:hidden;}
.ucv .nav{background:var(--teal);color:#F4F1E8;display:flex;align-items:center;gap:26px;padding:13px 24px;font-size:12.5px;}
.ucv .nav .brand{font-weight:600;letter-spacing:.2px;margin-right:6px;}
.ucv .nav a{color:#F4F1E8;opacity:.82;text-decoration:none;cursor:pointer;}
.ucv .nav a:hover{opacity:1;}
.ucv .nav .user{margin-left:auto;opacity:.9;display:flex;align-items:center;gap:5px;cursor:pointer;}
.ucv .head{background:#EDE8DA;padding:22px 28px;display:flex;align-items:flex-start;gap:18px;}
.ucv .avatar{width:54px;height:54px;border-radius:50%;background:var(--teal);color:#F4F1E8;
  display:flex;align-items:center;justify-content:center;font-weight:600;font-size:17px;flex:0 0 auto;}
.ucv .name{font-family:var(--serif);font-size:25px;font-weight:500;line-height:1.1;}
.ucv .sub{color:var(--ink2);font-size:12.5px;margin-top:5px;}
.ucv .sub b{color:var(--ink);font-weight:600;}
.ucv .src{color:var(--muted);font-size:11.5px;margin-top:3px;}
.ucv .actions{margin-left:auto;display:flex;flex-wrap:wrap;gap:8px;max-width:330px;justify-content:flex-end;}
.ucv .btn{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:5px;border:1px solid var(--line);
  background:var(--paper);font-size:12px;cursor:pointer;color:var(--ink);transition:.12s;font-family:var(--sans);}
.ucv .btn:hover{border-color:var(--teal);}
.ucv .btn.primary{background:var(--teal);color:#F4F1E8;border-color:var(--teal);}
.ucv .btn.primary:hover{background:#163b38;}
.ucv .btn.call{color:var(--rust);}
.ucv .body{background:var(--paper);padding:24px 28px 30px;}
.ucv .sec-label{font-size:10px;font-weight:500;color:var(--muted);letter-spacing:1.2px;margin:0 0 9px;text-transform:uppercase;}
.ucv .grid2{display:grid;grid-template-columns:1fr 1fr;gap:22px;}
.ucv .card{background:var(--paper);border:1px solid var(--line);border-radius:5px;padding:15px 17px;}
.ucv .kv{display:grid;grid-template-columns:1fr 1fr;gap:11px 16px;}
.ucv .k{font-size:10px;color:var(--muted);}
.ucv .v{font-size:12.5px;color:var(--ink);margin-top:1px;}
.ucv .v .tag{font-size:10px;color:var(--muted);}
.ucv .feeds{color:var(--teal);font-style:italic;font-size:11.5px;margin-top:12px;}
.ucv .sl-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;}
.ucv .sl{border-radius:4px;padding:11px 13px;border:1px solid transparent;}
.ucv .sl .dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:7px;vertical-align:middle;}
.ucv .sl .t{font-size:11px;font-weight:600;display:inline-block;vertical-align:middle;}
.ucv .sl .d{font-size:11px;color:var(--ink2);margin-top:5px;}
.ucv .sl .s{font-size:9.5px;color:var(--muted);margin-top:3px;}
.ucv .sl.active{background:rgba(31,77,74,.07);}
.ucv .sl.crosssell{background:rgba(139,105,20,.10);}
.ucv .sl.pending{background:rgba(139,105,20,.06);}
.ucv .sl.none,.ucv .sl.na{background:rgba(26,26,26,.025);}
.ucv .sl-sum{font-size:11.5px;color:var(--ink2);font-style:italic;margin-top:13px;}
.ucv .xs{border:1px solid var(--line);border-radius:5px;padding:4px 0;}
.ucv .xs-row{padding:11px 16px;border-bottom:1px solid var(--line);display:flex;gap:11px;}
.ucv .xs-row:last-child{border-bottom:none;}
.ucv .xs-row .ic{color:var(--rust);flex:0 0 auto;margin-top:1px;}
.ucv .xs-row .ti{font-size:12px;font-weight:600;}
.ucv .xs-row .de{font-size:11px;color:var(--ink2);margin-top:2px;}
.ucv .xs-row.queued .ti{font-weight:500;color:var(--ink2);}
.ucv .act-row{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);}
.ucv .act-row:last-child{border-bottom:none;}
.ucv .act-ic{width:24px;height:24px;border-radius:5px;background:rgba(31,77,74,.08);color:var(--teal);
  display:flex;align-items:center;justify-content:center;flex:0 0 auto;}
.ucv .act-ti{font-size:12px;font-weight:600;}
.ucv .act-meta{font-size:10.5px;color:var(--muted);margin-left:7px;font-weight:400;}
.ucv .act-body{font-size:11.5px;color:var(--ink2);margin-top:3px;font-style:italic;}
.ucv .act-do{font-size:10.5px;color:var(--teal);margin-top:4px;cursor:pointer;}
.ucv .doc{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:11.5px;color:var(--ink2);}
.ucv .doc:hover{color:var(--teal);cursor:pointer;}
.ucv .doc .fic{color:var(--muted);flex:0 0 auto;}
.ucv .more{font-size:11px;color:var(--teal);margin-top:8px;cursor:pointer;display:flex;align-items:center;gap:5px;}
.ucv .opp{padding:9px 0;border-bottom:1px solid var(--line);}
.ucv .opp:last-child{border-bottom:none;}
.ucv .opp .ol{font-size:12px;font-weight:600;}
.ucv .opp .ol.flag{color:var(--rust);}
.ucv .opp .ol .st{font-weight:400;color:var(--ink2);}
.ucv .opp .om{font-size:10.5px;color:var(--muted);margin-top:2px;}
.ucv .foot-note{font-size:10.5px;color:var(--muted);font-style:italic;margin-top:8px;}
@media(max-width:760px){.ucv .grid2{grid-template-columns:1fr;}.ucv .sl-grid{grid-template-columns:repeat(2,1fr);}
  .ucv .actions{max-width:none;}.ucv .head{flex-wrap:wrap;}}
`;

const dotColor = { active: "var(--olive)", crosssell: "var(--ochre)", pending: "var(--ochre)", none: "var(--muted)", na: "var(--muted)" };
const ACT_ICON = { call: Phone, wapp: MessageCircle, note: StickyNote, sign: PenLine, flow: Zap };


/* ----------------------------------------------------------------------------
   6. COMPONENT
---------------------------------------------------------------------------- */
export default function UnifiedContactView({ contactId = "demo", adapter = mockAdapter, onAction, onBack }) {
  const [c, setC] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let live = true;
    adapter.getContact(contactId).then((d) => live && setC(d)).catch((e) => live && setErr(e.message));
    return () => { live = false; };
  }, [contactId, adapter]);

  // In a GHL iframe embed, default actions postMessage to the parent (click-to-dial,
  // open conversation, etc.). Override via the onAction prop.
  const act = (type) => onAction ? onAction(type, c)
    : window.parent?.postMessage({ source: "ucv", type, contactId: c?.id }, "*");

  if (err) return <div className="ucv"><div className="shell" style={{ padding: 30 }}>Couldn’t load contact: {err}</div><style>{CSS}</style></div>;
  if (!c) return <div className="ucv"><div className="shell" style={{ padding: 30 }}>Loading…</div><style>{CSS}</style></div>;

  const id = c.identity, h = c.household;

  return (
    <div className="ucv">
      <style>{CSS}</style>
      <div className="shell">

        {/* nav */}
        <div className="nav">
          <span className="brand">JN Insurance</span>
          <a onClick={onBack} style={{ cursor: onBack ? "pointer" : "default" }}>← Contacts</a>
          <a>Conversations</a><a>Opportunities</a><a>Calendars</a><a>Reports</a>
          <span className="user">Yubinka <ChevronDown size={13} /></span>
        </div>

        {/* contact header */}
        <div className="head">
          <div className="avatar">{c.initials || (c.firstName?.[0] + c.lastName?.[0])}</div>
          <div>
            <div className="name">{c.firstName} {c.lastName}</div>
            <div className="sub">
              DOB {c.dob} · Age {c.age} · {c.city} {c.state} · {c.languagePrimary} primary
            </div>
            <div className="src">
              Client of: <b>{c.clientOf.join(" + ")}</b> · Source: {c.source}
            </div>
          </div>
          <div className="actions">
            <button className="btn call" onClick={() => act("call")}><Phone size={14} /> Call</button>
            <button className="btn" onClick={() => act("sms")}><MessageSquare size={14} /> SMS</button>
            <button className="btn" onClick={() => act("whatsapp")}><MessageCircle size={14} /> WApp</button>
            <button className="btn" onClick={() => act("email")}><Mail size={14} /> Email</button>
            <button className="btn primary" onClick={() => act("new_opportunity")}><Plus size={14} /> New Opportunity</button>
          </div>
        </div>

        <div className="body">

          {/* IDENTITY + HOUSEHOLD */}
          <div className="grid2" style={{ marginBottom: 26 }}>
            <div>
              <div className="sec-label">Identity · Block A + B</div>
              <div className="card">
                <div className="kv">
                  <div><div className="k">Phone</div><div className="v">{id.phone}</div></div>
                  <div><div className="k">Email</div><div className="v">{id.email}</div></div>
                  <div><div className="k">SSN</div><div className="v">{id.ssnMasked} <span className="tag">(masked)</span></div></div>
                  <div><div className="k">Driver's License</div><div className="v">{id.dlState} · exp {id.dlExp}</div></div>
                  <div style={{ gridColumn: "1 / -1" }}><div className="k">Address</div><div className="v">{id.address}</div></div>
                  <div><div className="k">Citizenship</div><div className="v">{id.citizenship}</div></div>
                  <div><div className="k">In US since</div><div className="v">{id.inUsSince}</div></div>
                </div>
              </div>
            </div>
            <div>
              <div className="sec-label">Household · Block C</div>
              <div className="card">
                <div className="kv">
                  <div><div className="k">Marital status</div><div className="v">{h.maritalStatus}{h.spouse ? ` · spouse ${h.spouse.name} (${h.spouse.age})` : ""}</div></div>
                  <div><div className="k">Household size</div><div className="v">{h.size}</div></div>
                  <div><div className="k">Annual household income</div><div className="v">{h.income} · {h.incomeBasis}</div></div>
                  <div><div className="k">Employment</div><div className="v">{h.employment}</div></div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div className="k">Dependents</div>
                    {h.dependents.map((d, i) => (
                      <div className="v" key={i}>
                        {d.name} ({d.age}){d.note ? ` · ${d.note}` : ""}{d.flag ? <span> · <Flag size={10} style={{ verticalAlign: "middle", color: "var(--rust)" }} /> {d.flag}</span> : ""}
                      </div>
                    ))}
                  </div>
                </div>
                {h.feeds && <div className="feeds">↳ {h.feeds}</div>}
              </div>
            </div>
          </div>

          {/* SERVICE LINE STATE · BLOCK D */}
          <div className="sec-label">Service Line State · Block D</div>
          <div className="card" style={{ marginBottom: 26 }}>
            <div className="sl-grid">
              {c.serviceLines.map((s) => (
                <div className={`sl ${s.state}`} key={s.key}>
                  <span className="dot" style={{ background: dotColor[s.state] }} />
                  <span className="t">{s.label}</span>
                  <div className="d">{s.detail}</div>
                  <div className="s">{s.sub}</div>
                </div>
              ))}
            </div>
            {c.serviceSummary && <div className="sl-sum">↳ {c.serviceSummary}</div>}
          </div>

          {/* CROSS-SELL SIGNALS · BLOCK E */}
          <div className="sec-label">Cross-sell Signals · Block E (computed)</div>
          <div className="xs" style={{ marginBottom: 26 }}>
            {c.crossSell.map((x, i) => (
              <div className={`xs-row ${x.sev === "queued" ? "queued" : ""}`} key={i}>
                <Flag size={14} className="ic" />
                <div>
                  <div className="ti">{x.title}</div>
                  <div className="de">{x.detail}</div>
                </div>
              </div>
            ))}
          </div>

          {/* RECENT ACTIVITY */}
          <div className="sec-label">Recent Activity · Conversations + Events</div>
          <div className="card" style={{ marginBottom: 26 }}>
            {c.activity.map((a, i) => {
              const Ic = ACT_ICON[a.icon] || FileText;
              return (
                <div className="act-row" key={i}>
                  <div className="act-ic"><Ic size={13} /></div>
                  <div style={{ flex: 1 }}>
                    <span className="act-ti">{a.title}</span><span className="act-meta">{a.meta}</span>
                    {a.body && <div className="act-body">{a.body}</div>}
                    {a.action && <div className="act-do"><Play size={10} style={{ verticalAlign: "middle" }} /> {a.action}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* DOCUMENTS + OPPORTUNITIES */}
          <div className="grid2">
            <div>
              <div className="sec-label">Documents</div>
              <div className="card">
                {c.documents.map((d, i) => (
                  <div className="doc" key={i}><FileText size={13} className="fic" /> {d}</div>
                ))}
                {c.documentsMore ? <div className="more">+ {c.documentsMore} more · <Search size={11} /> search across all docs</div> : null}
                <div className="foot-note">All docs live in SharePoint, linked here</div>
              </div>
            </div>
            <div>
              <div className="sec-label">Opportunities</div>
              <div className="card">
                {c.opportunities.map((o, i) => (
                  <div className="opp" key={i}>
                    <div className={`ol ${o.flag ? "flag" : ""}`}>
                      {o.flag ? <Flag size={11} style={{ verticalAlign: "middle", marginRight: 4 }} /> : null}
                      {o.line} · <span className="st">{o.stage}</span>
                    </div>
                    {o.meta && <div className="om">{o.meta}</div>}
                  </div>
                ))}
                <div className="foot-note">All opportunities across every service line roll up here · click → source pipeline</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
