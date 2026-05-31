import React, { useEffect, useState } from "react";
import {
  Phone, MessageCircle, Mail, Plus, Play, FileText, PenLine, Zap,
  Flag, Search, ChevronDown, ChevronRight, Check, X, Globe,
  ClipboardList, StickyNote, CheckSquare, MessageSquare,
} from "lucide-react";

/* ============================================================================
   UNIFIED CONTACT VIEW — detail dashboard (pure renderer).
   The function assembles real + vision; this component renders + adds the
   interactions. Pass adapter={makeGhlAdapter(locationId)}.
   ========================================================================== */

/* ---------- adapters ---------- */
export const makeGhlAdapter = (locationId) => ({
  async getContact(contactId) {
    try {
      const r = await fetch(
        `/api/ghl/${encodeURIComponent(locationId)}/contact/${encodeURIComponent(contactId)}`,
        { headers: { Accept: "application/json" }, credentials: "include" }
      );
      if (!r.ok) throw new Error(`Proxy ${r.status}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      return d;
    } catch {
      return MOCK; // bulletproof demo: never an empty screen
    }
  },
});
export const mockAdapter = { async getContact() { return MOCK; } };

/* ---------- fallback mock (matches the live shape) ---------- */
const MOCK = {
  id: "demo", firstName: "Maria", lastName: "Gonzalez", initials: "MG",
  dob: "1962-03-15", city: "Hackensack", state: "NJ", languagePrimary: "Spanish",
  clientOf: ["JN Insurance", "JN Consulting"], source: "BNI referral via L. Saavedra",
  identity: {
    phone: "(201) 555-0142", email: "m.gonzalez@email.com", ssnMasked: "***-**-1234",
    dlState: "NJ", dlExp: "2028", address: "412 Anderson St, Hackensack NJ 07601",
    citizenship: "US Citizen (naturalized)", inUsSince: "28 yrs",
    immigration: { status: "Naturalized", path: "Naturalized Citizen", years: "28" },
  },
  household: {
    maritalStatus: "Married", spouse: { name: "Roberto", age: "61" }, size: "4 (incl. 2 dependents)",
    income: "$94,500", dependents: [{ name: "Sofia", age: "17" }],
    subsidyHint: "~218% FPL · subsidy-eligible (est.)",
  },
  documentsByLine: {
    health: [
      { label: "Driver's License", present: true }, { label: "Passport photo", present: true },
      { label: "Immigration card (I-551/766)", present: false }, { label: "I-94 arrival record", present: false },
      { label: "Naturalization certificate", present: true }, { label: "Consular ID", present: false },
    ],
    tax: [
      { label: "W-2 (all employers)", present: true, dummy: true }, { label: "1099 forms", present: true, dummy: true },
      { label: "Prior-year 1040", present: true, dummy: true }, { label: "1098 mortgage interest", present: false, dummy: true },
      { label: "Dependent SSNs", present: true, dummy: true }, { label: "IDs for all filers", present: false, dummy: true },
    ],
    life: [
      { label: "Completed application", present: true, dummy: true }, { label: "Medical exam (paramed)", present: false, dummy: true },
      { label: "Attending Physician Statement (APS)", present: false, dummy: true }, { label: "Prior policy (if replacement)", present: false, dummy: true },
      { label: "Beneficiary designation", present: true, dummy: true },
    ],
  },
  serviceLines: [
    { key: "health", label: "Health / ACA", state: "pending", detail: "Enrollment", sub: "Insurance Workflow",
      pipeline: { oppName: "Insurance Workflow", currentIndex: 2,
        stages: [{ name: "Document Collection", done: true }, { name: "Documents Complete", done: true },
                 { name: "Enrollment", current: true }, { name: "Closed" }] } },
    { key: "medicare", label: "Medicare", state: "crosssell", detail: "Cross-sell triggered", sub: "Eligible 2026-12 · opp open" },
    { key: "life", label: "Life Insurance", state: "none", detail: "Not engaged", sub: "life_gap flag set" },
    { key: "group", label: "Group / Ancillary", state: "na", detail: "N/A — self-employed", sub: "(employees = 0)" },
    { key: "tax", label: "Tax", state: "active", detail: "Active · 2024 filed", sub: "Toro #TR-8842 · refund $2.1k" },
    { key: "bookkeeping", label: "Bookkeeping", state: "active", detail: "Active · monthly", sub: "QBO · 2025-04 closed" },
    { key: "advisory", label: "Advisory", state: "crosssell", detail: "Cross-sell triggered", sub: "income > threshold · opp open" },
    { key: "pc", label: "P&C", state: "pending", detail: "Pending P&C launch", sub: "Eligible · has property + biz" },
  ],
  crossSell: [
    { sev: "open", title: "Medicare-eligible 2026-12 (turns 64y9m)", detail: "Opportunity auto-created · assigned to Julio · stage 01" },
    { sev: "open", title: "Advisory cross-sell · AGI > threshold", detail: "Opportunity auto-created · stage 01 · pending outreach" },
    { sev: "queued", title: "Life gap flag set", detail: "queued behind Advisory · cluster prevents firing twice" },
  ],
  activity: [
    { icon: "email", title: "Email sent to client", meta: "Today", body: "Re: 2025 enrollment — plan options attached", expandable: true },
    { icon: "form", title: "Form submitted · Health Enrollment", meta: "Yesterday", body: "Captured to contact record" },
    { icon: "note", title: "Note added", meta: "3 days ago", body: "Client prefers Spanish; spouse Roberto interested in life" },
    { icon: "task", title: "Task · Follow up on income docs", meta: "4 days ago", body: "Open" },
  ],
  activityCount: 4,
  opportunities: [{ line: "Insurance Workflow", stage: "Enrollment", meta: "open" }],
};

/* ---------- styles ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap');
.ucv{--cream:#F4F1E8;--paper:#fff;--teal:#1F4D4A;--ink:#1A1A1A;--ink2:#4A4A48;--muted:#7A7A75;
  --olive:#4A5D2C;--ochre:#8B6914;--rust:#A8442F;--line:rgba(26,26,26,.1);
  --serif:'Newsreader',Georgia,serif;--sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;
  font-family:var(--sans);color:var(--ink);background:var(--cream);min-height:100%;padding:22px;box-sizing:border-box;font-size:13px;line-height:1.45;}
.ucv *{box-sizing:border-box;}
.ucv .shell{max-width:1180px;margin:0 auto;background:var(--cream);border:1px solid var(--line);border-radius:8px;overflow:hidden;}
.ucv .nav{background:var(--teal);color:#F4F1E8;display:flex;align-items:center;gap:26px;padding:13px 24px;font-size:12.5px;}
.ucv .nav .brand{font-weight:600;}.ucv .nav a{color:#F4F1E8;opacity:.82;cursor:pointer;}.ucv .nav .user{margin-left:auto;display:flex;align-items:center;gap:5px;}
.ucv .head{background:#EDE8DA;padding:22px 28px;display:flex;align-items:flex-start;gap:18px;}
.ucv .avatar{width:54px;height:54px;border-radius:50%;background:var(--teal);color:#F4F1E8;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:17px;flex:0 0 auto;}
.ucv .name{font-family:var(--serif);font-size:25px;font-weight:500;line-height:1.1;}
.ucv .sub{color:var(--ink2);font-size:12.5px;margin-top:5px;}.ucv .sub b{color:var(--ink);}
.ucv .src{color:var(--muted);font-size:11.5px;margin-top:3px;}
.ucv .actions{margin-left:auto;display:flex;flex-wrap:wrap;gap:8px;max-width:330px;justify-content:flex-end;}
.ucv .btn{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:5px;border:1px solid var(--line);background:var(--paper);font-size:12px;cursor:pointer;color:var(--ink);transition:.12s;font-family:var(--sans);text-decoration:none;}
.ucv .btn:hover{border-color:var(--teal);}.ucv .btn.primary{background:var(--teal);color:#F4F1E8;border-color:var(--teal);}.ucv .btn.call{color:var(--rust);}
.ucv .btn.dead{opacity:.5;cursor:not-allowed;}
.ucv .body{background:var(--paper);padding:24px 28px 30px;}
.ucv .sec-label{font-size:10px;font-weight:500;color:var(--muted);letter-spacing:1.2px;margin:0 0 9px;text-transform:uppercase;}
.ucv .grid2{display:grid;grid-template-columns:1fr 1fr;gap:22px;}
.ucv .card{background:var(--paper);border:1px solid var(--line);border-radius:5px;padding:15px 17px;}
.ucv .kv{display:grid;grid-template-columns:1fr 1fr;gap:11px 16px;}
.ucv .k{font-size:10px;color:var(--muted);}.ucv .v{font-size:12.5px;margin-top:1px;}.ucv .v .tag{font-size:10px;color:var(--muted);}
.ucv .hint{color:var(--teal);font-style:italic;font-size:11.5px;margin-top:12px;}
.ucv .imm{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px 16px;margin-top:13px;padding-top:13px;border-top:1px solid var(--line);}
.ucv .sl-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;}
.ucv .sl{border-radius:4px;padding:11px 13px;border:1px solid transparent;text-align:left;width:100%;font-family:var(--sans);cursor:default;background:transparent;}
.ucv .sl.click{cursor:pointer;}.ucv .sl.click:hover{box-shadow:0 0 0 1px var(--teal) inset;}
.ucv .sl .dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:7px;vertical-align:middle;}
.ucv .sl .t{font-size:11px;font-weight:600;vertical-align:middle;}.ucv .sl .chev{float:right;color:var(--muted);}
.ucv .sl .d{font-size:11px;color:var(--ink2);margin-top:5px;}.ucv .sl .s{font-size:9.5px;color:var(--muted);margin-top:3px;}
.ucv .sl.active{background:rgba(31,77,74,.07);}.ucv .sl.crosssell{background:rgba(139,105,20,.10);}.ucv .sl.pending{background:rgba(139,105,20,.06);}
.ucv .sl.none,.ucv .sl.na{background:rgba(26,26,26,.025);}
.ucv .rail{margin-top:13px;padding:16px 14px 6px;border-top:1px solid var(--line);display:flex;align-items:flex-start;}
.ucv .step{flex:1;text-align:center;position:relative;}
.ucv .step .node{width:18px;height:18px;border-radius:50%;margin:0 auto 6px;border:2px solid var(--line);background:var(--paper);display:flex;align-items:center;justify-content:center;color:#fff;}
.ucv .step.done .node{background:var(--olive);border-color:var(--olive);}
.ucv .step.current .node{border-color:var(--teal);box-shadow:0 0 0 3px rgba(31,77,74,.15);}
.ucv .step .lbl{font-size:10px;color:var(--ink2);}.ucv .step.current .lbl{color:var(--teal);font-weight:600;}
.ucv .step .bar{position:absolute;top:9px;left:50%;width:100%;height:2px;background:var(--line);z-index:0;}
.ucv .step.done .bar{background:var(--olive);}
.ucv .xs{border:1px solid var(--line);border-radius:5px;}
.ucv .xs-row{padding:11px 16px;border-bottom:1px solid var(--line);display:flex;gap:11px;}.ucv .xs-row:last-child{border-bottom:none;}
.ucv .xs-row .ic{color:var(--rust);flex:0 0 auto;margin-top:1px;}.ucv .xs-row .ti{font-size:12px;font-weight:600;}.ucv .xs-row .de{font-size:11px;color:var(--ink2);margin-top:2px;}
.ucv .act{padding:12px 0;border-bottom:1px solid var(--line);display:flex;gap:12px;}.ucv .act:last-child{border-bottom:none;}
.ucv .act-ic{width:24px;height:24px;border-radius:5px;background:rgba(31,77,74,.08);color:var(--teal);display:flex;align-items:center;justify-content:center;flex:0 0 auto;}
.ucv .act-ic.email{background:rgba(168,68,47,.10);color:var(--rust);}
.ucv .act-ti{font-size:12px;font-weight:600;}.ucv .act-meta{font-size:10.5px;color:var(--muted);margin-left:7px;font-weight:400;}
.ucv .act-body{font-size:11.5px;color:var(--ink2);margin-top:3px;}
.ucv .act-row-head{cursor:pointer;display:flex;align-items:center;gap:5px;}
.ucv .doc{display:flex;align-items:center;gap:9px;padding:6px 0;font-size:12px;}
.ucv .doc .mk{width:18px;height:18px;border-radius:4px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;}
.ucv .doc .mk.y{background:rgba(74,93,44,.15);color:var(--olive);}.ucv .doc .mk.n{background:rgba(168,68,47,.12);color:var(--rust);}
.ucv .doc.miss{color:var(--muted);}
.ucv .opp{padding:9px 0;border-bottom:1px solid var(--line);}.ucv .opp:last-child{border-bottom:none;}
.ucv .opp .ol{font-size:12px;font-weight:600;}.ucv .opp .ol .st{font-weight:400;color:var(--ink2);}.ucv .opp .om{font-size:10.5px;color:var(--muted);margin-top:2px;}
.ucv .foot-note{font-size:10.5px;color:var(--muted);font-style:italic;margin-top:8px;}
.ucv .doctabs{display:flex;gap:6px;margin-bottom:10px;}
.ucv .doctab{font-size:11px;padding:4px 11px;border-radius:20px;border:1px solid var(--line);background:var(--paper);color:var(--ink2);cursor:pointer;font-family:var(--sans);}
.ucv .doctab.on{background:var(--teal);color:#F4F1E8;border-color:var(--teal);}
.ucv .doctab .demo{font-size:8.5px;opacity:.7;margin-left:4px;text-transform:uppercase;letter-spacing:.05em;}
.ucv .fade{opacity:0;transform:translateY(6px);animation:ucvUp .4s ease forwards;}
@keyframes ucvUp{to{opacity:1;transform:none;}}
@media(max-width:760px){.ucv .grid2{grid-template-columns:1fr;}.ucv .sl-grid{grid-template-columns:repeat(2,1fr);}.ucv .imm{grid-template-columns:1fr 1fr;}.ucv .actions{max-width:none;}.ucv .head{flex-wrap:wrap;}}
`;

const dotColor = { active: "var(--olive)", crosssell: "var(--ochre)", pending: "var(--ochre)", none: "var(--muted)", na: "var(--muted)" };
const ACT_ICON = {
  email: Mail, call: Phone, sms: MessageSquare, wapp: MessageCircle,
  form: ClipboardList, note: StickyNote, task: CheckSquare, sign: PenLine, flow: Zap,
};
const DOC_TABS = [["health", "Health / ACA"], ["tax", "Tax"], ["life", "Life"]];

function Section({ label, i, children }) {
  return (
    <div className="fade" style={{ animationDelay: `${i * 60}ms`, marginBottom: 26 }}>
      <div className="sec-label">{label}</div>
      {children}
    </div>
  );
}

export default function UnifiedContactView({ contactId = "demo", adapter = mockAdapter, onAction }) {
  const [c, setC] = useState(null);
  const [openCard, setOpenCard] = useState("health");
  const [openAct, setOpenAct] = useState(null);
  const [docLine, setDocLine] = useState("health");

  useEffect(() => {
    let live = true;
    adapter.getContact(contactId).then((d) => live && setC(d));
    return () => { live = false; };
  }, [contactId, adapter]);

  if (!c) return <div className="ucv"><style>{CSS}</style><div className="shell" style={{ padding: 30 }}>Loading…</div></div>;
  const id = c.identity, h = c.household, imm = id.immigration || {};
  const health = c.serviceLines.find((s) => s.pipeline);

  return (
    <div className="ucv">
      <style>{CSS}</style>
      <div className="shell">
        <div className="nav">
          <span className="brand">JN Insurance</span>
          <a>Contacts</a><a>Conversations</a><a>Opportunities</a><a>Calendars</a>
          <span className="user">Yubinka <ChevronDown size={13} /></span>
        </div>

        <div className="head">
          <div className="avatar">{c.initials || (c.firstName?.[0] + c.lastName?.[0])}</div>
          <div>
            <div className="name">{c.firstName} {c.lastName}</div>
            <div className="sub">{[c.dob && `DOB ${c.dob}`, [c.city, c.state].filter(Boolean).join(" "), c.languagePrimary && `${c.languagePrimary} primary`].filter(Boolean).join(" · ")}</div>
            <div className="src">{c.clientOf?.length ? <>Client of: <b>{c.clientOf.join(" + ")}</b> · </> : null}{c.source ? `Source: ${c.source}` : null}</div>
          </div>
          <div className="actions">
            <a className="btn call" href={id.phone ? `tel:${id.phone.replace(/[^0-9+]/g, "")}` : undefined}><Phone size={14} /> Call</a>
            <a className="btn" href={id.email ? `mailto:${id.email}` : undefined}><Mail size={14} /> Email</a>
            <button className="btn dead" title="WhatsApp integration coming soon"><MessageCircle size={14} /> WApp</button>
            <button className="btn primary" onClick={() => onAction?.("new_opportunity", c)}><Plus size={14} /> New Opportunity</button>
          </div>
        </div>

        <div className="body">
          {/* IDENTITY + HOUSEHOLD */}
          <div className="fade" style={{ animationDelay: "0ms" }}>
            <div className="grid2" style={{ marginBottom: 26 }}>
              <div>
                <div className="sec-label">Identity · Block A + B</div>
                <div className="card">
                  <div className="kv">
                    <div><div className="k">Phone</div><div className="v">{id.phone || "—"}</div></div>
                    <div><div className="k">Email</div><div className="v">{id.email || "—"}</div></div>
                    <div><div className="k">SSN</div><div className="v">{id.ssnMasked} <span className="tag">(masked)</span></div></div>
                    <div><div className="k">Driver's License</div><div className="v">{[id.dlState, id.dlExp && `exp ${id.dlExp}`].filter(Boolean).join(" · ") || "—"}</div></div>
                    <div style={{ gridColumn: "1 / -1" }}><div className="k">Address</div><div className="v">{id.address || "—"}</div></div>
                    <div><div className="k">Citizenship</div><div className="v">{id.citizenship || "—"}</div></div>
                    <div><div className="k">In US since</div><div className="v">{id.inUsSince || "—"}</div></div>
                  </div>
                  {(imm.status || imm.visaType || imm.alien) && (
                    <div className="imm">
                      {imm.status && <div><div className="k">Immigration status</div><div className="v">{imm.status}</div></div>}
                      {imm.visaType && <div><div className="k">Visa</div><div className="v">{[imm.visaType, imm.visaExp].filter(Boolean).join(" · ")}</div></div>}
                      {imm.alien && <div><div className="k">Alien #</div><div className="v">{imm.alien}</div></div>}
                      {imm.ead && <div><div className="k">EAD category</div><div className="v">{imm.ead}</div></div>}
                      {imm.asylee && <div><div className="k">Asylee</div><div className="v">{imm.asylee}</div></div>}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="sec-label">Household · Block C</div>
                <div className="card">
                  <div className="kv">
                    <div><div className="k">Marital status</div><div className="v">{h.maritalStatus || "—"}{h.spouse ? ` · spouse ${h.spouse.name}${h.spouse.age ? ` (${h.spouse.age})` : ""}` : ""}</div></div>
                    <div><div className="k">Household size</div><div className="v">{h.size || "—"}</div></div>
                    <div><div className="k">Annual income</div><div className="v">{h.income || "—"}</div></div>
                    <div><div className="k">Dependents</div><div className="v">{h.dependents?.length ? h.dependents.map((d) => `${d.name}${d.age ? ` (${d.age})` : ""}`).join(", ") : "—"}</div></div>
                  </div>
                  {h.subsidyHint && <div className="hint">↳ ACA subsidy: {h.subsidyHint}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* SERVICE LINES + expandable rail */}
          <Section label="Service Line State · Block D" i={1}>
            <div className="card">
              <div className="sl-grid">
                {c.serviceLines.map((s) => {
                  const clickable = !!s.pipeline;
                  return (
                    <button key={s.key} className={`sl ${s.state} ${clickable ? "click" : ""}`}
                      onClick={clickable ? () => setOpenCard(openCard === s.key ? null : s.key) : undefined}>
                      <span className="dot" style={{ background: dotColor[s.state] }} />
                      <span className="t">{s.label}</span>
                      {clickable && <ChevronRight size={13} className="chev" style={{ transform: openCard === s.key ? "rotate(90deg)" : "none" }} />}
                      <div className="d">{s.detail}</div>
                      <div className="s">{s.sub}</div>
                    </button>
                  );
                })}
              </div>
              {health && openCard === health.key && (
                <div className="rail">
                  {health.pipeline.stages.map((st, i) => (
                    <div key={i} className={`step ${st.done ? "done" : ""} ${st.current ? "current" : ""}`}>
                      {i < health.pipeline.stages.length - 1 && <div className="bar" />}
                      <div className="node">{st.done ? <Check size={11} /> : null}</div>
                      <div className="lbl">{st.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* CROSS-SELL */}
          <Section label="Cross-sell Signals · Block E (computed)" i={2}>
            <div className="xs">
              {c.crossSell.map((x, i) => (
                <div className="xs-row" key={i}>
                  <Flag size={14} className="ic" />
                  <div><div className="ti">{x.title}</div><div className="de">{x.detail}</div></div>
                </div>
              ))}
            </div>
          </Section>

          {/* RECENT ACTIVITY — real timeline: emails, forms, notes, tasks */}
          <Section label={`Recent Activity${c.activityCount ? ` · ${c.activityCount} event${c.activityCount > 1 ? "s" : ""}` : ""}`} i={3}>
            <div className="card">
              {c.activity.length === 0 && <div className="foot-note">No recorded activity for this contact yet.</div>}
              {c.activity.map((a, i) => {
                const Ic = ACT_ICON[a.icon] || FileText;
                const open = openAct === i;
                return (
                  <div className="act" key={i}>
                    <div className={`act-ic ${a.icon === "email" ? "email" : ""}`}><Ic size={13} /></div>
                    <div style={{ flex: 1 }}>
                      <div className={a.expandable ? "act-row-head" : ""} onClick={a.expandable ? () => setOpenAct(open ? null : i) : undefined}>
                        {a.expandable && <ChevronRight size={12} style={{ transform: open ? "rotate(90deg)" : "none", color: "var(--muted)" }} />}
                        <span className="act-ti">{a.title}</span><span className="act-meta">{fmt(a.meta)}</span>
                      </div>
                      {(open || !a.expandable) && a.body && <div className="act-body">{a.body}</div>}
                      {open && a.icon === "email" && <div className="act-body" style={{ marginTop: 4 }}><Play size={10} style={{ verticalAlign: "middle" }} /> open in GHL conversations</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* DOCUMENTS + OPPORTUNITIES */}
          <div className="fade" style={{ animationDelay: "240ms" }}>
            <div className="grid2">
              <div>
                <div className="sec-label">Document Checklist</div>
                <div className="card">
                  <div className="doctabs">
                    {DOC_TABS.map(([key, label]) => (
                      <button key={key} className={`doctab ${docLine === key ? "on" : ""}`} onClick={() => setDocLine(key)}>
                        {label}{key !== "health" && <span className="demo">demo</span>}
                      </button>
                    ))}
                  </div>
                  {(c.documentsByLine?.[docLine] || []).map((d, i) => (
                    <div className={`doc ${d.present ? "" : "miss"}`} key={i}>
                      <span className={`mk ${d.present ? "y" : "n"}`}>{d.present ? <Check size={12} /> : <X size={12} />}</span>
                      {d.label}
                    </div>
                  ))}
                  <div className="foot-note">
                    {docLine === "health"
                      ? "Live from uploaded files · feeds the Document Collection gate"
                      : "Sample checklist · not yet wired to uploads"}
                  </div>
                </div>
              </div>
              <div>
                <div className="sec-label">Opportunities</div>
                <div className="card">
                  {c.opportunities.length ? c.opportunities.map((o, i) => (
                    <div className="opp" key={i}>
                      <div className="ol">{o.line} · <span className="st">{o.stage}</span></div>
                      {o.meta && <div className="om">{o.meta}</div>}
                    </div>
                  )) : <div className="foot-note">No open opportunities for this contact.</div>}
                  <div className="foot-note">All opportunities roll up here · click → source pipeline</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(v) {
  if (!v) return "";
  const t = Date.parse(v);
  if (!isNaN(t)) {
    const d = new Date(t), now = Date.now();
    const days = Math.floor((now - t) / 86400000);
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 14) return `${days} days ago`;
    return d.toLocaleDateString();
  }
  return v;
}
