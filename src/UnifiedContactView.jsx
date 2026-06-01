import React, { useEffect, useState } from "react";
import {
  Phone, MessageCircle, Mail, Plus, Play, FileText, PenLine, Zap,
  Flag, Search, ChevronRight, Check, X,
  ClipboardList, StickyNote, CheckSquare, MessageSquare, Clock, RefreshCw,
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
    itin: "9XX-7X-XXXX", businessName: "Gonzalez Cleaning Services LLC", sex: "F",
    dlState: "NJ", dlExp: "2028", address: "412 Anderson St, Hackensack NJ 07601",
    citizenship: "US Citizen (naturalized)", inUsSince: "28 yrs",
    immigration: { status: "Naturalized", path: "Naturalized Citizen", years: "28" },
  },
  household: {
    maritalStatus: "Married", spouse: { name: "Roberto", age: "61" }, size: "4 (incl. 2 dependents)",
    income: "$94,500", employment: "Self-employed (business owner)", paymentMethod: "Bank Account",
    incomeBreakdown: { primary: "$94,500", spouse: "$38,000", dependent: "$0", total: "$132,500" },
    dependents: [{ name: "Sofia", age: "17", income: "$0" }, { name: "Luis", age: "14" }],
    subsidyHint: "~218% FPL · subsidy-eligible (est.)",
    lastVerified: "2026-05-20",
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
        stages: [{ name: "Document Verification", done: true }, { name: "Quoting", done: true },
                 { name: "Enrollment", current: true }, { name: "Closed" }] },
      healthDetail: {
        computed: { subsidy: "~218% FPL · subsidy-eligible (est.)", csr: "CSR 73% (Silver) — eligible",
          netPremium: { gross: "$472", aptc: "$331", net: "$141" } },
        carrier: "Horizon BCBS NJ", metalTier: "Silver", planName: "Horizon Silver OMNIA",
        deductible: "$3,500 / $7,000 MOOP",
        effectuation: "Enrolled — first premium PAID (effectuated)",
        enrollmentWindow: "Open Enrollment · closes 2026-01-15", sepDaysLeft: 0,
        reconRisk: "Income matches attestation — no 1095-A risk",
        coveredMembers: "Self + 1 dependent on plan; spouse on Medicare",
        lastLifeEvent: "—", applicationId: "GCNJ-APP-44821",
        gcnjStatus: "Effectuated · active 2026 coverage", planExpiry: "2026-12-31",
      } },
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
    { icon: "call", title: "Call summary · inbound", meta: "Today", body: "8m 42s · Discussed plan options and document needs. Client confirmed income unchanged; interested in adding a dependent. Action: send enrollment docs, follow up in 3 days.", expandable: true, demo: true },
    { icon: "email", title: "Email sent to client", meta: "Today", body: "Re: 2025 enrollment — plan options attached", expandable: true },
    { icon: "form", title: "Form submitted · Health Enrollment", meta: "Yesterday", body: "Captured to contact record" },
    { icon: "note", title: "Note added", meta: "3 days ago", body: "Client prefers Spanish; spouse Roberto interested in life" },
    { icon: "task", title: "Task · Follow up on income docs", meta: "4 days ago", body: "Open" },
  ],
  activityCount: 5,
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
.ucv-modal{position:fixed;inset:0;background:rgba(26,26,26,.45);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;}
.ucv-dialog{background:#fff;border-radius:8px;width:520px;max-width:100%;max-height:88vh;overflow:auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;color:#1A1A1A;}
.ucv-dlg-head{display:flex;align-items:center;justify-content:space-between;padding:15px 18px;border-bottom:1px solid rgba(26,26,26,.1);font-family:'Newsreader',Georgia,serif;font-size:17px;}
.ucv-x{background:none;border:none;cursor:pointer;color:#7A7A75;display:flex;}
.ucv-dlg-body{padding:16px 18px;}
.ucv-l{display:block;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#7A7A75;margin:10px 0 4px;}
.ucv-in{width:100%;border:1px solid rgba(26,26,26,.18);border-radius:5px;padding:8px 10px;font-size:13px;font-family:inherit;background:#fff;color:#1A1A1A;}
.ucv-in:disabled{background:rgba(26,26,26,.04);color:#7A7A75;}
.ucv-send{margin-top:14px;width:100%;justify-content:center;}
.ucv-confirm{margin-top:14px;background:rgba(139,105,20,.08);border:1px solid rgba(139,105,20,.3);border-radius:6px;padding:11px 13px;font-size:12.5px;display:flex;flex-direction:column;gap:9px;}
.ucv-confirm > div{display:flex;gap:8px;justify-content:flex-end;}
.ucv-err{background:rgba(168,68,47,.08);border:1px solid rgba(168,68,47,.3);color:#A8442F;border-radius:6px;padding:9px 12px;font-size:12px;margin-bottom:8px;}
.ucv-sent{background:rgba(74,93,44,.10);border:1px solid rgba(74,93,44,.35);color:#4A5D2C;border-radius:6px;padding:10px 12px;font-size:12.5px;display:flex;align-items:center;gap:7px;}
.ucv-thread-h{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#7A7A75;margin:18px 0 8px;padding-top:14px;border-top:1px solid rgba(26,26,26,.1);}
.ucv-msg{border:1px solid rgba(26,26,26,.1);border-radius:6px;padding:9px 11px;margin-bottom:7px;}
.ucv-msg.out{background:rgba(31,77,74,.05);}
.ucv-msg-h{font-size:10px;color:#7A7A75;}
.ucv-msg-s{font-size:12.5px;font-weight:600;margin-top:2px;}
.ucv-msg-b{font-size:11.5px;color:#4A4A48;margin-top:2px;}
.ucv .summary{background:linear-gradient(180deg,rgba(31,77,74,.06),rgba(31,77,74,.02));border:1px solid var(--line);border-radius:6px;padding:13px 15px;margin-bottom:18px;display:flex;gap:11px;}
.ucv .summary .ai{font-size:9px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--teal);background:rgba(31,77,74,.1);border-radius:3px;padding:2px 6px;height:fit-content;}
.ucv .summary p{font-size:13px;color:var(--ink2);margin:0;line-height:1.5;}
.ucv .strip{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;}
.ucv .chip{display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:4px 10px;border-radius:20px;border:1px solid var(--line);}
.ucv .chip.ok{background:rgba(74,93,44,.08);color:var(--olive);}.ucv .chip.no{background:rgba(168,68,47,.08);color:var(--rust);}
.ucv .nba{background:rgba(139,105,20,.07);border:1px solid rgba(139,105,20,.25);border-radius:6px;padding:13px 15px;margin-bottom:18px;display:flex;align-items:center;gap:12px;}
.ucv .nba .t{font-size:12.5px;font-weight:600;}.ucv .nba .d{font-size:11.5px;color:var(--ink2);}
.ucv .rule{padding:9px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px;}
.ucv .rule:last-child{border-bottom:none;}
.ucv .rule .lob{font-size:11px;font-weight:600;white-space:nowrap;}
.ucv .rule .arrow{color:var(--muted);}
.ucv .rule .cond{font-size:11px;color:var(--ink2);font-family:monospace;flex:1;}
.ucv .rule .badge{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;padding:2px 7px;border-radius:3px;white-space:nowrap;}
.ucv .rule .badge.fired{background:rgba(168,68,47,.12);color:var(--rust);}
.ucv .rule .badge.queued{background:rgba(139,105,20,.12);color:var(--ochre);}
.ucv .rule .badge.monitoring{background:rgba(26,26,26,.06);color:var(--muted);}
.ucv .reqdocs{margin-top:11px;}
.ucv .reqdocs .step{font-size:11px;color:var(--ink2);padding:3px 0;display:flex;align-items:center;gap:6px;}
.ucv .reqdocs .step .n{width:15px;height:15px;border-radius:50%;background:rgba(31,77,74,.12);color:var(--teal);font-size:9px;display:flex;align-items:center;justify-content:center;}
.ucv .policy{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line);}
.ucv .steps{margin-top:12px;padding-top:12px;border-top:1px solid var(--line);}
.ucv .steps-h{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:7px;}
.ucv .stepc{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink2);padding:3px 0;}
.ucv .stepc .box{width:13px;height:13px;border-radius:3px;border:1.5px solid var(--line);flex:0 0 auto;}
.ucv .qlist{max-height:300px;overflow:auto;display:flex;flex-direction:column;gap:4px;}
.ucv .qrow{display:flex;align-items:center;justify-content:space-between;width:100%;text-align:left;background:var(--paper);border:1px solid var(--line);border-radius:6px;padding:9px 12px;font-size:12.5px;cursor:pointer;font-family:var(--sans);color:var(--ink);}
.ucv .qrow:hover{border-color:var(--teal);}
.ucv .doc.misc{gap:9px;}
.ucv .misc-in{flex:1;border:0;border-bottom:1px dashed var(--line);background:transparent;font-size:12px;font-family:var(--sans);color:var(--ink);padding:2px 0;outline:none;}
.ucv .misc-in:focus{border-bottom-color:var(--teal);}
.ucv .misc-x{color:var(--muted);cursor:pointer;display:flex;flex:0 0 auto;}
.ucv .misc-x:hover{color:var(--rust);}
.ucv .addmisc{display:inline-flex;align-items:center;gap:5px;background:none;border:1px dashed var(--line);border-radius:5px;padding:5px 10px;margin-top:9px;font-size:11px;color:var(--ink2);cursor:pointer;font-family:var(--sans);}
.ucv .addmisc:hover{border-color:var(--teal);color:var(--teal);}
.ucv .sec-sub{font-size:11px;font-weight:600;color:var(--ink2);margin:0 0 7px;display:flex;align-items:center;gap:6px;}
.ucv .sec-sub .sub-note{font-weight:400;color:var(--muted);font-size:10.5px;}
.ucv .flagrow{display:flex;gap:11px;padding:11px 14px;border-bottom:1px solid var(--line);align-items:flex-start;}
.ucv .flagrow:last-child{border-bottom:none;}
.ucv .flagrow.dismissed{opacity:.55;}
.ucv .flagrow .ic{flex:0 0 auto;margin-top:1px;}
.ucv .flagrow .ti{font-size:12px;font-weight:600;}
.ucv .flagrow .de{font-size:11px;color:var(--ink2);margin-top:2px;}
.ucv .flagrow .basis{font-size:10px;color:var(--muted);margin-top:2px;font-family:monospace;}
.ucv .conf{font-size:8.5px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;padding:1px 6px;border-radius:3px;margin-left:6px;}
.ucv .conf.high{background:rgba(74,93,44,.14);color:var(--olive);}
.ucv .conf.medium{background:rgba(139,105,20,.14);color:var(--ochre);}
.ucv .flagbtns{display:flex;gap:6px;flex:0 0 auto;}
.ucv .xs-btn{padding:4px 9px;font-size:11px;}
.ucv .resolved{font-size:11px;display:flex;align-items:center;gap:4px;flex:0 0 auto;}
.ucv .resolved.ok{color:var(--olive);}.ucv .resolved.no{color:var(--muted);}
.ucv .linklike{background:none;border:0;color:var(--teal);cursor:pointer;font-size:11px;padding:0;text-decoration:underline;font-family:var(--sans);}
.ucv .card.auto{background:rgba(31,77,74,.03);}
.ucv .autorow{display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid var(--line);font-size:12px;}
.ucv .autorow:last-child{border-bottom:none;}
.ucv .autorow .ti{font-weight:600;}.ucv .autorow .de{color:var(--ink2);font-size:11.5px;}
.ucv .autodot{width:7px;height:7px;border-radius:50%;background:var(--olive);flex:0 0 auto;box-shadow:0 0 0 3px rgba(74,93,44,.15);}
.ucv .when{font-size:10px;color:var(--muted);flex:0 0 auto;}
.ucv .lastver{font-size:10.5px;color:var(--muted);margin-top:10px;padding-top:9px;border-top:1px solid var(--line);}
.ucv .hdetail{margin-top:12px;padding-top:12px;border-top:1px solid var(--line);}
.ucv .hd-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px 16px;}
.ucv .hd-grid .k{font-size:10px;color:var(--muted);}
.ucv .hd-grid .v{font-size:12px;margin-top:1px;}
.ucv .hd-alert{grid-column:1 / -1;display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:var(--rust);background:rgba(168,68,47,.08);border:1px solid rgba(168,68,47,.25);border-radius:5px;padding:6px 10px;}
.ucv .docrow{cursor:pointer;}
.ucv .ocr{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:12px;margin-top:10px;}
.ucv .ocr .kk{color:var(--muted);}
.ucv .docview{height:120px;background:repeating-linear-gradient(0deg,rgba(26,26,26,.04),rgba(26,26,26,.04) 8px,transparent 8px,transparent 16px);border:1px dashed var(--line);border-radius:5px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:11px;margin-top:10px;}
.ucv-msg-b{font-size:11.5px;color:#4A4A48;margin-top:2px;}
@keyframes ucvUp{to{opacity:1;transform:none;}}
@media(max-width:760px){.ucv .grid2{grid-template-columns:1fr;}.ucv .sl-grid{grid-template-columns:repeat(2,1fr);}.ucv .imm{grid-template-columns:1fr 1fr;}.ucv .actions{max-width:none;}.ucv .head{flex-wrap:wrap;}}
`;

const dotColor = { active: "var(--olive)", crosssell: "var(--ochre)", pending: "var(--ochre)", none: "var(--muted)", na: "var(--muted)" };
const ACT_ICON = {
  email: Mail, call: Phone, sms: MessageSquare, wapp: MessageCircle,
  form: ClipboardList, note: StickyNote, task: CheckSquare, sign: PenLine, flow: Zap,
};
const DOC_TABS = [["health", "Health / ACA"], ["tax", "Tax"], ["life", "Life"]];

/* ===== POTEMKIN vision data (demo-only) ===== */
// Per-line stage rails (Health uses its real pipeline; these are vision tracks from design §04)
const VISION_RAILS = {
  medicare: ["Intake", "Quotes (Sunfire)", "Scope of Appt", "Application", "Policy active"],
  life: ["Intake", "UW docs", "Application", "Underwriting", "Approved", "Policy issued", "Active"],
  group: ["Employer contact", "Census complete", "Submitted to Savoy", "Proposal", "Plan selected", "Enrollment", "Policy active"],
  tax: ["Intake", "Docs requested", "Docs complete", "Return in progress", "Client review", "Filed", "Confirmed"],
  bookkeeping: ["Intake", "Access granted", "Onboarding cleanup", "Active · monthly", "Quarterly review"],
  advisory: ["Intake", "Fact-find", "Plan drafted", "Plan delivered", "Active"],
  pc: ["Quote request", "Rater run", "Quote presented", "Bound", "Active"],
};
// vision "current stage" index per line, for demo
const VISION_RAIL_AT = { medicare: 0, life: 0, group: 3, tax: 5, bookkeeping: 3, advisory: 0, pc: 0 };
// vision policy/coverage detail per line
const VISION_POLICY = {
  medicare: { Carrier: "—", Premium: "—", Plan: "MAPD (quoting)", Effective: "—" },
  tax: { Preparer: "Toro Taxes", "Return": "2024 · filed", Refund: "$2,100", "Filed": "2025-04-12" },
  bookkeeping: { Platform: "QuickBooks Online", Cadence: "Monthly close", "Last close": "2025-04", Status: "Current" },
  life: { Carrier: "—", Face: "—", Premium: "—", Status: "Not engaged" },
  advisory: { Agreement: "—", "Fact-find": "Pending", AUM: "—", Status: "Cross-sell open" },
  group: { Employees: "0", Wholesaler: "Savoy", Status: "N/A — self-employed" },
  pc: { Rater: "EZLynx (TBD)", Lines: "Home + Auto + Biz", Status: "Pending launch" },
};
// The 16 cross-sell rules from design §07, rendered as a "live engine"
const CROSS_SELL_RULES = [
  { from: "Health", to: "Medicare", cond: "dob + 64y9m = today", owner: "Julio", state: "fired" },
  { from: "Health", to: "Life", cond: "life_event_date changed in last 30d", owner: "Julio", state: "monitoring" },
  { from: "Health", to: "Tax", cond: "Health effectuated AND tax_status = none", owner: "Tax team", state: "monitoring" },
  { from: "Health", to: "Advisory", cond: "Health effectuated AND household_income > $X", owner: "Julio", state: "fired" },
  { from: "Medicare", to: "Life", cond: "Medicare effectuated + 30d", owner: "Julio", state: "monitoring" },
  { from: "Group", to: "Medicare", cond: "employee dob + 64y9m on group plan", owner: "Julio", state: "monitoring" },
  { from: "Group", to: "Life", cond: "employee aging out of group AND no individual Life", owner: "Julio", state: "monitoring" },
  { from: "Tax", to: "Health", cond: "Tax client AND health_status = none AND income in ACA range", owner: "Yubinka", state: "monitoring" },
  { from: "Tax", to: "Advisory", cond: "Tax AGI > threshold AND advisory_status = none", owner: "Julio", state: "fired" },
  { from: "Tax", to: "Life", cond: "Tax client · high income · no Life", owner: "Julio", state: "queued" },
  { from: "Bookkeeping", to: "Tax", cond: "Bookkeeping active AND tax_status = none", owner: "Tax team", state: "monitoring" },
  { from: "Bookkeeping", to: "Group", cond: "business client AND employee_count ≥ 2 AND group_status = none", owner: "Julio", state: "monitoring" },
  { from: "Bookkeeping", to: "Advisory", cond: "business client AND advisory_status = none", owner: "Julio", state: "monitoring" },
  { from: "Advisory", to: "Life", cond: "plan delivered AND life gap flag set", owner: "Julio", state: "monitoring" },
  { from: "Advisory", to: "Medicare", cond: "plan delivered AND dob + 64y9m within 24mo", owner: "Julio", state: "monitoring" },
  { from: "Any line", to: "P&C", cond: "P&C activated AND client has property / vehicle / business", owner: "P&C lead", state: "monitoring" },
];

// TIER 1 — automated, runs in background. 100% accurate, date-driven, no
// confusion risk. Shown as "running automatically" (logged, not an action item).
const AUTO_FLAGS = [
  { label: "Birthday follow-up", detail: "Sends on client birthday · bilingual", when: "next: in 3 weeks" },
  { label: "Plan renewal / AEP reminder", detail: "Fires 45 days before plan year end", when: "next: 2026-11-16" },
  { label: "Policy-expiry nudge", detail: "Health plan expires 2026-12-31", when: "scheduled" },
  { label: "Effectuation confirmation", detail: "Confirms first-premium payment after enrollment", when: "complete" },
];
// TIER 2 — inferred from intake-trait intersections. PROBABILISTIC → must be
// human-verified. Yubinka reviews, follows up, then confirms or dismisses.
const SUGGESTED_FLAGS = [
  { id: "adv", to: "Advisory", reason: "Tax AGI > threshold AND no advisory engagement", basis: "Income + services on file", conf: "high" },
  { id: "med", to: "Medicare", reason: "Approaching age 64¾ within 18 months", basis: "DOB", conf: "high" },
  { id: "life", to: "Life", reason: "High income, dependents, no Life policy", basis: "Income + dependents + lines", conf: "medium" },
  { id: "tax", to: "Tax", reason: "Health effectuated, income collected, no Tax engagement", basis: "Health intake income", conf: "medium" },
];
const COMPLIANCE = [
  { label: "HHS consent", ok: true }, { label: "GLBA privacy notice", ok: true },
  { label: "Engagement letter (e-sign)", ok: true }, { label: "IRS 4557 safeguards", ok: true },
  { label: "ID verification", ok: false },
];
// fake OCR fields for the doc preview modal, keyed loosely by label
const OCR_FIELDS = {
  "Driver's License": [["Name", "Maria Gonzalez"], ["DL #", "G1234-5678-9012"], ["State", "NJ"], ["Expires", "2028-03-15"], ["Confidence", "98%"]],
  default: [["Document type", "auto-classified"], ["Name match", "✓ verified"], ["Captured", "2025-05"], ["Confidence", "97%"]],
};
const chaseSteps = ["Sending SMS + email with secure upload link…", "Reminder scheduled · 48h", "Agent task · 5 days", "Escalation to Julio · 10 days"];

// "Steps to complete" for the CURRENT phase of a pipeline (vision placeholders;
// refine later). Keyed by line, then by stage name. Health keys match the real
// Insurance Workflow stage names.
const STAGE_STEPS = {
  health: {
    "Document Verification": ["Send secure upload link (replaces WhatsApp photos)", "Collect + verify DL / ID", "Verify income proof + citizenship / green card", "Confirm household size + dependents"],
    "Quoting": ["Run subsidy / APTC eligibility from income", "Pull plan options on GetCoveredNJ", "Present plan comparison to client", "Confirm plan selection"],
    "Enrollment": ["Submit application on GetCoveredNJ", "Capture application / confirmation #", "Collect consent + carrier e-sign", "Send welcome + ID card info"],
    "Closed": ["Confirm coverage effectuated", "File final docs to SharePoint", "Set renewal reminder (AEP)", "Flag cross-sell signals (Tax, Life, Advisory)"],
  },
  medicare: { default: ["Confirm eligibility date", "Run Sunfire quote", "Complete Scope of Appointment", "Submit application"] },
  life: { default: ["Fact-find + needs analysis", "Collect UW docs", "Order paramed exam", "Submit application"] },
  tax: { default: ["Send tax-doc checklist", "Collect W-2/1099 + IDs", "Prepare return", "Client review + e-sign", "File + capture IRS ack"] },
  bookkeeping: { default: ["Grant QBO access", "Clean up chart of accounts", "Set monthly close cadence"] },
  advisory: { default: ["Schedule fact-find", "Draft plan", "Deliver plan", "Set review cadence"] },
  group: { default: ["Collect census", "Submit to Savoy", "Present proposal", "Open enrollment"] },
  pc: { default: ["Gather property/vehicle info", "Run rater", "Present quote", "Bind policy"] },
};
function stepsFor(line, stageName) {
  const m = STAGE_STEPS[line];
  if (!m) return [];
  return m[stageName] || m.default || [];
}

// Quick Update panel — friendly labels mapped to real GHL field keys.
// (Demo: save is simulated. The keys are ready to wire to a real PATCH later.)
const QUICK_FIELDS = [
  { label: "Phone", key: "phone", type: "text" },
  { label: "Email", key: "email", type: "text" },
  { label: "Annual income", key: "contact.annual_income", type: "money" },
  { label: "Marital status", key: "contact.marital_status", type: "select", options: ["Married", "Single", "Divorced"] },
  { label: "Spouse name", key: "contact.spouse_name", type: "text" },
  { label: "Spouse age", key: "contact.spouse_age", type: "text" },
  { label: "Dependent name", key: "contact.dependent_name", type: "text" },
  { label: "Dependent age", key: "contact.dependent_age", type: "text" },
  { label: "Has dependents", key: "contact.dependents", type: "select", options: ["Y", "N"] },
  { label: "Primary language", key: "contact.language", type: "select", options: ["English", "Spanish"] },
  { label: "US citizen?", key: "contact.are_you_a_us_citizen", type: "select", options: ["Yes", "No"] },
  { label: "How obtained citizenship", key: "contact.how_did_you_obtain_citizenship", type: "select", options: ["Born in the USA", "Naturalized Citizen"] },
  { label: "Immigration status", key: "contact.immigration_status_number", type: "text" },
  { label: "Visa type", key: "contact.visa_type", type: "text" },
  { label: "Visa expiration", key: "contact.visa_expiration", type: "text" },
  { label: "Alien number", key: "contact.alien_number", type: "text" },
  { label: "Years in US", key: "contact.years_in_us", type: "text" },
  { label: "Driver's license", key: "contact.drivers_license", type: "text" },
  { label: "Referred by", key: "contact.referred_by", type: "text" },
  { label: "Payment method", key: "contact.payment_method", type: "select", options: ["Credit", "Debit", "Bank Account"] },
  { label: "Services selected", key: "contact.services_selected", type: "text" },
];

function Section({ label, i, children }) {
  return (
    <div className="fade" style={{ animationDelay: `${i * 60}ms`, marginBottom: 26 }}>
      <div className="sec-label">{label}</div>
      {children}
    </div>
  );
}

export default function UnifiedContactView({ contactId = "demo", adapter = mockAdapter, locationId, onAction }) {
  const [c, setC] = useState(null);
  const [openCard, setOpenCard] = useState("health");
  const [openAct, setOpenAct] = useState(null);
  const [docLine, setDocLine] = useState("health");
  const [email, setEmail] = useState(null); // null = closed; else compose state
  const [docPreview, setDocPreview] = useState(null);   // {label} for the OCR preview modal
  const [transcript, setTranscript] = useState(null);   // activity item for transcript modal
  const [chase, setChase] = useState(-1);                // -1 idle; 0..n animating chase steps
  const [quick, setQuick] = useState(null);              // null=closed; {q, field, value, saved} for Quick Update
  const [miscDocs, setMiscDocs] = useState({});          // { [line]: [{label, checked}] } edge-case docs
  const [flagState, setFlagState] = useState({});         // { [id]: 'confirmed' | 'dismissed' } cross-sell review

  useEffect(() => {
    let live = true;
    adapter.getContact(contactId).then((d) => live && setC(d));
    return () => { live = false; };
  }, [contactId, adapter]);

  // ---- Email compose / send (real GHL send + thread) ----
  const emailBase = locationId
    ? `/api/ghl/${encodeURIComponent(locationId)}/contact/${encodeURIComponent(contactId)}/email`
    : null;

  async function openEmail() {
    setEmail({ loading: true, from: "", subject: "", body: "", froms: [], thread: [], stage: "compose" });
    if (!emailBase) { // mock/demo mode
      setEmail({ loading: false, stage: "compose", from: "health@jninsure.com", subject: "", body: "",
        froms: ["health@jninsure.com", "tax@jninsure.com", "julio@jninsure.com"],
        thread: (c.activity || []).filter((a) => a.icon === "email").map((a) => ({ direction: "out", subject: a.title, snippet: a.body, date: a.meta })) });
      return;
    }
    try {
      const r = await fetch(emailBase, { headers: { Accept: "application/json" } });
      const d = await r.json();
      setEmail({ loading: false, stage: "compose", from: (d.fromAddresses || [])[0] || "", subject: "", body: "",
        froms: d.fromAddresses || [], thread: d.thread || [] });
    } catch (e) {
      setEmail({ loading: false, stage: "compose", from: "", subject: "", body: "", froms: [], thread: [], error: String(e.message || e) });
    }
  }

  async function sendEmail() {
    if (!emailBase) { // demo: no real send
      setEmail((s) => ({ ...s, stage: "sent", thread: [{ direction: "out", subject: s.subject, snippet: s.body, date: "just now" }, ...s.thread] }));
      return;
    }
    setEmail((s) => ({ ...s, stage: "sending" }));
    try {
      const r = await fetch(emailBase, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailFrom: email.from, emailSubject: email.subject, emailBody: `<div>${(email.body || "").replace(/\n/g, "<br>")}</div>` }),
      });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || `HTTP ${r.status}`);
      setEmail((s) => ({ ...s, stage: "sent", thread: d.thread || s.thread }));
    } catch (e) {
      setEmail((s) => ({ ...s, stage: "compose", error: String(e.message || e) }));
    }
  }

  function runChase() {
    setChase(0);
    chaseSteps.forEach((_, i) => setTimeout(() => setChase(i), i * 900));
    setTimeout(() => setChase(-1), chaseSteps.length * 900 + 1500);
  }

  if (!c) return <div className="ucv"><style>{CSS}</style><div className="shell" style={{ padding: 30 }}>Loading…</div></div>;
  const id = c.identity, h = c.household, imm = id.immigration || {};
  const health = c.serviceLines.find((s) => s.pipeline);

  // vision AI summary + next-best-action, composed from real fields where available
  const active = c.serviceLines.filter((s) => s.state === "active").map((s) => s.label);
  const xsell = c.serviceLines.filter((s) => s.state === "crosssell").map((s) => s.label);
  const aiSummary = `${c.firstName} ${c.lastName} is a ${h.maritalStatus ? h.maritalStatus.toLowerCase() + " " : ""}${id.citizenship || "client"}${h.income ? ` with household income ${h.income}` : ""}${active.length ? `, active across ${active.join(", ")}` : ""}. ${xsell.length ? `Open cross-sell signals: ${xsell.join(" and ")} — worth a touch this cycle.` : "No open cross-sell signals right now."}`;
  const nba = xsell.length
    ? { t: `Reach out re: ${xsell[0]}`, d: "Cross-sell opportunity is open and unworked" }
    : { t: "Confirm document completeness", d: "Move the Health engagement toward enrollment" };

  return (
    <div className="ucv">
      <style>{CSS}</style>
      <div className="shell">
        <div className="nav">
          <span className="brand">JN Insurance · Client 360</span>
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
            <button className="btn" onClick={openEmail}><Mail size={14} /> Email</button>
            <button className="btn dead" title="WhatsApp integration coming soon"><MessageCircle size={14} /> WApp</button>
            <button className="btn" onClick={() => setQuick({ q: "", field: null, value: "", saved: false })}><PenLine size={14} /> Quick update</button>
            <button className="btn primary" onClick={() => onAction?.("new_opportunity", c)}><Plus size={14} /> New Opportunity</button>
          </div>
        </div>

        <div className="body">
          {/* AI SUMMARY (vision) */}
          <div className="summary fade">
            <span className="ai">AI summary</span>
            <p>{aiSummary}</p>
          </div>

          {/* COMPLIANCE STRIP (vision) */}
          <div className="strip fade">
            {COMPLIANCE.map((x, i) => (
              <span className={`chip ${x.ok ? "ok" : "no"}`} key={i}>
                {x.ok ? <Check size={12} /> : <X size={12} />} {x.label}
              </span>
            ))}
          </div>

          {/* NEXT BEST ACTION (vision) */}
          <div className="nba fade">
            <Flag size={16} style={{ color: "var(--ochre)", flex: "0 0 auto" }} />
            <div style={{ flex: 1 }}>
              <div className="t">Next best action · {nba.t}</div>
              <div className="d">{nba.d}</div>
            </div>
            <button className="btn">Act</button>
          </div>

          {/* IDENTITY + HOUSEHOLD */}
          <div className="fade" style={{ animationDelay: "0ms" }}>
            <div className="grid2" style={{ marginBottom: 26 }}>
              <div>
                <div className="sec-label">Identity · Block A + B</div>
                <div className="card">
                  <div className="kv">
                    {id.businessName && <div style={{ gridColumn: "1 / -1" }}><div className="k">Business</div><div className="v">{id.businessName}</div></div>}
                    <div><div className="k">Phone</div><div className="v">{id.phone || "—"}</div></div>
                    <div><div className="k">Email</div><div className="v">{id.email || "—"}</div></div>
                    <div><div className="k">SSN</div><div className="v">{id.ssnMasked} <span className="tag">(masked)</span></div></div>
                    <div><div className="k">ITIN</div><div className="v">{id.itin || "—"}</div></div>
                    <div><div className="k">Driver's License</div><div className="v">{[id.dlState, id.dlExp && `exp ${id.dlExp}`].filter(Boolean).join(" · ") || "—"}</div></div>
                    <div><div className="k">Sex</div><div className="v">{id.sex || "—"}</div></div>
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
                    <div><div className="k">Employment</div><div className="v">{h.employment || "—"}</div></div>
                    <div><div className="k">Payment method</div><div className="v">{h.paymentMethod || "—"}</div></div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div className="k">Income breakdown</div>
                      <div className="v">
                        {h.incomeBreakdown?.primary ? `Primary ${h.incomeBreakdown.primary}` : "—"}
                        {h.incomeBreakdown?.spouse ? ` · Spouse ${h.incomeBreakdown.spouse}` : ""}
                        {h.incomeBreakdown?.dependent ? ` · Dependent ${h.incomeBreakdown.dependent}` : ""}
                        {h.incomeBreakdown?.total ? <span className="tag"> · total {h.incomeBreakdown.total}</span> : ""}
                      </div>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div className="k">Dependents</div>
                      <div className="v">{h.dependents?.length ? h.dependents.map((d) => `${d.name}${d.age ? ` (${d.age})` : ""}${d.income ? ` · ${d.income}` : ""}`).join(", ") : "—"}</div>
                    </div>
                  </div>
                  {h.subsidyHint && <div className="hint">↳ ACA subsidy: {h.subsidyHint}</div>}
                  <div className="lastver">Last verified: {h.lastVerified || "—"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* SERVICE LINES + expandable rail */}
          <Section label="Service Line State · Block D" i={1}>
            <div className="card">
              <div className="sl-grid">
                {c.serviceLines.map((s) => {
                  const clickable = !!s.pipeline || !!VISION_RAILS[s.key];
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
              {/* Health: real rail. Other lines: vision rail + policy detail. */}
              {health && openCard === health.key && (
                <>
                  <div className="rail">
                    {health.pipeline.stages.map((st, i) => (
                      <div key={i} className={`step ${st.done ? "done" : ""} ${st.current ? "current" : ""}`}>
                        {i < health.pipeline.stages.length - 1 && <div className="bar" />}
                        <div className="node">{st.done ? <Check size={11} /> : null}</div>
                        <div className="lbl">{st.name}</div>
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const cur = health.pipeline.stages.find((s) => s.current)?.name
                      || health.pipeline.stages[health.pipeline.currentIndex]?.name;
                    const steps = stepsFor("health", cur);
                    return steps.length ? (
                      <div className="steps">
                        <div className="steps-h">Steps to complete · {cur}</div>
                        {steps.map((s, i) => (
                          <div className="stepc" key={i}><span className="box" />{s}</div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  {health.healthDetail && (() => {
                    const hd = health.healthDetail, cm = hd.computed || {};
                    return (
                      <div className="hdetail">
                        <div className="steps-h">Health / ACA detail</div>
                        <div className="hd-grid">
                          {hd.sepDaysLeft > 0 && <div className="hd-alert"><Clock size={12} /> SEP closes in {hd.sepDaysLeft} days</div>}
                          <div><div className="k">Enrollment window</div><div className="v">{hd.enrollmentWindow || "—"}</div></div>
                          <div><div className="k">Effectuation</div><div className="v">{hd.effectuation || "—"}</div></div>
                          <div><div className="k">Plan</div><div className="v">{[hd.carrier, hd.metalTier].filter(Boolean).join(" · ") || "—"}</div></div>
                          <div><div className="k">Deductible / MOOP</div><div className="v">{hd.deductible || "—"}</div></div>
                          <div><div className="k">Premium (gross / APTC / net)</div><div className="v">{cm.netPremium ? `${cm.netPremium.gross} / −${cm.netPremium.aptc} / ${cm.netPremium.net}` : "—"} <span className="tag">computed</span></div></div>
                          <div><div className="k">CSR eligibility</div><div className="v">{cm.csr || "—"} <span className="tag">computed</span></div></div>
                          <div><div className="k">Subsidy (FPL)</div><div className="v">{cm.subsidy || "—"} <span className="tag">computed</span></div></div>
                          <div><div className="k">APTC reconciliation</div><div className="v">{hd.reconRisk || "—"}</div></div>
                          <div><div className="k">Covered members</div><div className="v">{hd.coveredMembers || "—"}</div></div>
                          <div><div className="k">Last life event</div><div className="v">{hd.lastLifeEvent || "—"}</div></div>
                          <div><div className="k">Application / confirmation #</div><div className="v">{hd.applicationId || "—"}</div></div>
                          <div><div className="k">GetCoveredNJ status</div><div className="v">{hd.gcnjStatus || "—"}</div></div>
                          <div><div className="k">Plan expires</div><div className="v">{hd.planExpiry || "—"}</div></div>
                        </div>
                        <div className="foot-note">Computed fields are real (income + size). Plan, effectuation, SEP, app # and GetCoveredNJ status are agent-entered / GetCoveredNJ-sourced (no API) — shown as demo values.</div>
                      </div>
                    );
                  })()}
                </>
              )}
              {openCard && openCard !== health?.key && VISION_RAILS[openCard] && (
                <>
                  <div className="rail">
                    {VISION_RAILS[openCard].map((name, i) => {
                      const at = VISION_RAIL_AT[openCard] ?? 0;
                      return (
                        <div key={i} className={`step ${i < at ? "done" : ""} ${i === at ? "current" : ""}`}>
                          {i < VISION_RAILS[openCard].length - 1 && <div className="bar" />}
                          <div className="node">{i < at ? <Check size={11} /> : null}</div>
                          <div className="lbl">{name}</div>
                        </div>
                      );
                    })}
                  </div>
                  {VISION_POLICY[openCard] && (
                    <div className="policy">
                      {Object.entries(VISION_POLICY[openCard]).map(([k, v]) => (
                        <div key={k}><div className="k">{k}</div><div className="v">{v}</div></div>
                      ))}
                    </div>
                  )}
                  {(() => {
                    const cur = VISION_RAILS[openCard][VISION_RAIL_AT[openCard] ?? 0];
                    const steps = stepsFor(openCard, cur);
                    return steps.length ? (
                      <div className="steps">
                        <div className="steps-h">Steps to complete · {cur}</div>
                        {steps.map((s, i) => (
                          <div className="stepc" key={i}><span className="box" />{s}</div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  <div className="foot-note">Vision detail · this line isn’t wired to live data yet</div>
                </>
              )}
            </div>
          </Section>

          {/* CROSS-SELL — two tiers by confidence */}
          <Section label="Cross-sell · Block E" i={2}>
            {/* Tier 2: suggested, human-verified review queue */}
            <div className="sec-sub">Suggested · needs review <span className="sub-note">inferred from intake — verify before acting</span></div>
            <div className="xs" style={{ marginBottom: 14 }}>
              {SUGGESTED_FLAGS.map((f) => {
                const st = flagState[f.id];
                return (
                  <div className={`flagrow ${st || ""}`} key={f.id}>
                    <Flag size={14} className="ic" style={{ color: st === "dismissed" ? "var(--muted)" : "var(--rust)" }} />
                    <div style={{ flex: 1 }}>
                      <div className="ti">Possible {f.to} cross-sell <span className={`conf ${f.conf}`}>{f.conf} confidence</span></div>
                      <div className="de">{f.reason}</div>
                      <div className="basis">basis: {f.basis}</div>
                    </div>
                    {st === "confirmed" ? (
                      <span className="resolved ok"><Check size={12} /> Confirmed — opp created</span>
                    ) : st === "dismissed" ? (
                      <span className="resolved no">Dismissed · <button className="linklike" onClick={() => setFlagState((s) => ({ ...s, [f.id]: undefined }))}>undo</button></span>
                    ) : (
                      <div className="flagbtns">
                        <button className="btn xs-btn" onClick={() => onAction?.("followup", { flag: f, contact: c })}>Follow up</button>
                        <button className="btn xs-btn" onClick={() => setFlagState((s) => ({ ...s, [f.id]: "dismissed" }))}>Dismiss</button>
                        <button className="btn primary xs-btn" onClick={() => setFlagState((s) => ({ ...s, [f.id]: "confirmed" }))}>Confirm</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tier 1: automated, runs in background */}
            <div className="sec-sub"><RefreshCw size={11} style={{ verticalAlign: "middle" }} /> Running automatically <span className="sub-note">100% accurate · no review needed</span></div>
            <div className="card auto">
              {AUTO_FLAGS.map((a, i) => (
                <div className="autorow" key={i}>
                  <span className="autodot" />
                  <div style={{ flex: 1 }}>
                    <span className="ti">{a.label}</span>
                    <span className="de"> — {a.detail}</span>
                  </div>
                  <span className="when"><Clock size={10} style={{ verticalAlign: "middle" }} /> {a.when}</span>
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
                      {open && a.icon === "call" && <div className="act-body act-do" style={{ marginTop: 4 }} onClick={() => setTranscript(a)}><Play size={10} style={{ verticalAlign: "middle" }} /> view transcript + AI summary</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* DOCUMENTS + OPPORTUNITIES */}
          <div className="fade" style={{ animationDelay: "240ms" }}>
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
                  <div className={`doc docrow ${d.present ? "" : "miss"}`} key={i} onClick={() => setDocPreview(d)}>
                    <span className={`mk ${d.present ? "y" : "n"}`}>{d.present ? <Check size={12} /> : <X size={12} />}</span>
                    {d.label}
                  </div>
                ))}

                {/* Edge-case / additional documents (checkable) */}
                {(miscDocs[docLine] || []).map((m, i) => (
                  <div className={`doc misc ${m.checked ? "" : "miss"}`} key={`m${i}`}>
                    <span className={`mk ${m.checked ? "y" : "n"}`} style={{ cursor: "pointer" }}
                      onClick={() => setMiscDocs((s) => ({ ...s, [docLine]: s[docLine].map((x, j) => j === i ? { ...x, checked: !x.checked } : x) }))}>
                      {m.checked ? <Check size={12} /> : null}
                    </span>
                    <input className="misc-in" placeholder="Additional document to request…" value={m.label}
                      onChange={(e) => setMiscDocs((s) => ({ ...s, [docLine]: s[docLine].map((x, j) => j === i ? { ...x, label: e.target.value } : x) }))} />
                    <span className="misc-x" onClick={() => setMiscDocs((s) => ({ ...s, [docLine]: s[docLine].filter((_, j) => j !== i) }))}><X size={12} /></span>
                  </div>
                ))}
                <button className="addmisc" onClick={() => setMiscDocs((s) => ({ ...s, [docLine]: [...(s[docLine] || []), { label: "", checked: false }] }))}>
                  <Plus size={12} /> Add misc
                </button>

                {(c.documentsByLine?.[docLine] || []).some((d) => !d.present) && (
                  chase >= 0 ? (
                    <div className="reqdocs">
                      {chaseSteps.map((st, i) => (
                        <div className="step" key={i} style={{ opacity: i <= chase ? 1 : 0.35 }}>
                          <span className="n">{i <= chase ? <Check size={9} /> : i + 1}</span> {st}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button className="btn" style={{ marginTop: 11 }} onClick={runChase}>
                      <MessageSquare size={13} /> Request missing documents
                    </button>
                  )
                )}
                <div className="foot-note">
                  {docLine === "health"
                    ? "Live from uploaded files · feeds the Document Verification gate"
                    : "Sample checklist · not yet wired to uploads"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {email && (
        <div className="ucv-modal" onClick={(e) => { if (e.target.classList.contains("ucv-modal")) setEmail(null); }}>
          <div className="ucv-dialog">
            <div className="ucv-dlg-head">
              <span>Email · {c.firstName} {c.lastName}</span>
              <button className="ucv-x" onClick={() => setEmail(null)}><X size={16} /></button>
            </div>

            {email.loading ? (
              <div className="foot-note" style={{ padding: 18 }}>Loading thread…</div>
            ) : (
              <div className="ucv-dlg-body">
                {email.error && <div className="ucv-err">{email.error}</div>}

                {email.stage === "sent" ? (
                  <div className="ucv-sent"><Check size={15} /> Email sent — it now appears in the thread below.</div>
                ) : (
                  <>
                    <label className="ucv-l">From</label>
                    <select className="ucv-in" value={email.from} onChange={(e) => setEmail((s) => ({ ...s, from: e.target.value }))}>
                      {(email.froms || []).map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <label className="ucv-l">To</label>
                    <input className="ucv-in" value={id.email || ""} disabled />
                    <label className="ucv-l">Subject</label>
                    <input className="ucv-in" value={email.subject} onChange={(e) => setEmail((s) => ({ ...s, subject: e.target.value }))} placeholder="Subject" />
                    <label className="ucv-l">Message</label>
                    <textarea className="ucv-in" rows={5} value={email.body} onChange={(e) => setEmail((s) => ({ ...s, body: e.target.value }))} placeholder="Write your message…" />

                    {email.stage === "confirm" ? (
                      <div className="ucv-confirm">
                        <span>Send to {id.email} from {email.from}?</span>
                        <div>
                          <button className="btn" onClick={() => setEmail((s) => ({ ...s, stage: "compose" }))}>Cancel</button>
                          <button className="btn primary" onClick={sendEmail}>Confirm send</button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn primary ucv-send"
                        disabled={email.stage === "sending" || !email.from || !email.subject || !email.body}
                        onClick={() => setEmail((s) => ({ ...s, stage: "confirm", error: null }))}>
                        {email.stage === "sending" ? "Sending…" : "Send email"}
                      </button>
                    )}
                  </>
                )}

                <div className="ucv-thread-h">Email thread</div>
                {(email.thread || []).length === 0 && <div className="foot-note">No emails on file yet.</div>}
                {(email.thread || []).map((m, i) => (
                  <div className={`ucv-msg ${m.direction === "out" ? "out" : "in"}`} key={i}>
                    <div className="ucv-msg-h">{m.direction === "out" ? "Sent" : "Received"} · {fmt(m.date)}</div>
                    <div className="ucv-msg-s">{m.subject}</div>
                    <div className="ucv-msg-b">{m.snippet}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DOC PREVIEW (vision OCR viewer) */}
      {docPreview && (
        <div className="ucv-modal" onClick={(e) => { if (e.target.classList.contains("ucv-modal")) setDocPreview(null); }}>
          <div className="ucv-dialog">
            <div className="ucv-dlg-head">
              <span>{docPreview.label}</span>
              <button className="ucv-x" onClick={() => setDocPreview(null)}><X size={16} /></button>
            </div>
            <div className="ucv-dlg-body">
              {docPreview.present ? (
                <>
                  <div className="docview"><FileText size={20} style={{ marginRight: 6 }} /> document preview</div>
                  <div className="ucv-thread-h">Extracted fields · Azure Document Intelligence</div>
                  <div className="ocr">
                    {(OCR_FIELDS[docPreview.label] || OCR_FIELDS.default).map(([k, v], i) => (
                      <React.Fragment key={i}><div className="kk">{k}</div><div>{v}</div></React.Fragment>
                    ))}
                  </div>
                  <div className="foot-note">Vision · OCR extraction is a Phase-C capability</div>
                </>
              ) : (
                <div className="foot-note" style={{ padding: 10 }}>Not yet uploaded. Use “Request missing documents” to chase it.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CALL TRANSCRIPT (vision) */}
      {transcript && (
        <div className="ucv-modal" onClick={(e) => { if (e.target.classList.contains("ucv-modal")) setTranscript(null); }}>
          <div className="ucv-dialog">
            <div className="ucv-dlg-head">
              <span>{transcript.title} · {fmt(transcript.meta)}</span>
              <button className="ucv-x" onClick={() => setTranscript(null)}><X size={16} /></button>
            </div>
            <div className="ucv-dlg-body">
              <div className="summary" style={{ marginBottom: 14 }}>
                <span className="ai">AI summary</span>
                <p>{transcript.body || "Call discussed coverage options, next steps, and document needs. Client engaged; follow-up scheduled."}</p>
              </div>
              <div className="ucv-thread-h">Transcript</div>
              <div className="act-body" style={{ lineHeight: 1.7 }}>
                <b>Julio:</b> Hi, thanks for taking the call today.<br />
                <b>Client:</b> Of course — I wanted to go over my options.<br />
                <b>Julio:</b> Let’s start with where you are now and what’s changed…<br />
                <span className="foot-note">Vision · transcripts arrive via GHL Voice + AI in Phase C</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK UPDATE (friendly-label field editor; demo save) */}
      {quick && (
        <div className="ucv-modal" onClick={(e) => { if (e.target.classList.contains("ucv-modal")) setQuick(null); }}>
          <div className="ucv-dialog">
            <div className="ucv-dlg-head">
              <span>Quick update · {c.firstName} {c.lastName}</span>
              <button className="ucv-x" onClick={() => setQuick(null)}><X size={16} /></button>
            </div>
            <div className="ucv-dlg-body">
              {quick.saved ? (
                <div className="ucv-sent"><Check size={15} /> Updated “{quick.field.label}” → {quick.value || "—"}</div>
              ) : !quick.field ? (
                <>
                  <div className="search" style={{ marginBottom: 10 }}>
                    <Search size={15} />
                    <input autoFocus placeholder="Search a field to update…" value={quick.q}
                      onChange={(e) => setQuick((s) => ({ ...s, q: e.target.value }))} />
                  </div>
                  <div className="qlist">
                    {QUICK_FIELDS.filter((f) => f.label.toLowerCase().includes(quick.q.trim().toLowerCase())).map((f) => (
                      <button className="qrow" key={f.key} onClick={() => setQuick((s) => ({ ...s, field: f, value: "" }))}>
                        {f.label}<ChevronRight size={13} style={{ color: "var(--muted)" }} />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <label className="ucv-l">{quick.field.label}</label>
                  {quick.field.type === "select" ? (
                    <select className="ucv-in" value={quick.value} onChange={(e) => setQuick((s) => ({ ...s, value: e.target.value }))}>
                      <option value="">— select —</option>
                      {quick.field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className="ucv-in" autoFocus value={quick.value} placeholder={`New ${quick.field.label.toLowerCase()}`}
                      onChange={(e) => setQuick((s) => ({ ...s, value: e.target.value }))} />
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button className="btn" onClick={() => setQuick((s) => ({ ...s, field: null, value: "" }))}>← Back</button>
                    <button className="btn primary" disabled={!quick.value} onClick={() => setQuick((s) => ({ ...s, saved: true }))}>Save</button>
                  </div>
                  <div className="foot-note" style={{ marginTop: 10 }}>Maps to <code>{quick.field.key}</code> · demo (save is simulated)</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
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
