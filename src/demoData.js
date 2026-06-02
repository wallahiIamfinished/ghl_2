/* ============================================================================
   demoData.js — explicit Potemkin seed clients (clearly labeled "DEMO").
   ----------------------------------------------------------------------------
   Every field here is one of the two intake forms actually capture today:
   name, spouse name, dependents (name/age), annual income, services selected,
   language, referred by. NO invented fields. Household structure is modeled
   from the Insurance form's spouse + dependent capture.

   Used by both the client list and the Growth tab so the demo always has a
   populated, self-consistent book even against an empty/small GHL location.
   These rows carry _demo: true so they can be visually flagged.
   ========================================================================== */

const LINE_REV = { Health: 450, Medicare: 520, Life: 900, Group: 1800, Tax: 350, Bookkeeping: 2400, Advisory: 1500, "P&C": 300 };
const RECURRING = { Health: true, Medicare: true, Life: true, Group: true, Tax: false, Bookkeeping: true, Advisory: true, "P&C": true };

// Households. Each: head + optional spouse + dependents, services per member,
// language, source. All form-capturable.
export const DEMO_HOUSEHOLDS = [
  {
    hid: "demo-h1", lastName: "Demo-Alvarez", address: "100 Demo St, Union City NJ",
    income: 86000, language: "Spanish", source: "DEMO · BNI referral",
    members: [
      { id: "demo-1a", name: "Maria Demo-Alvarez", role: "head", lines: ["Health", "Tax"] },
      { id: "demo-1b", name: "Roberto Demo-Alvarez", role: "spouse", lines: ["Medicare"] },
      { id: "demo-1c", name: "Sofia Demo-Alvarez", role: "dependent", age: 17, lines: [] },
    ],
  },
  {
    hid: "demo-h2", lastName: "Demo-Okafor", address: "220 Demo Ave, West NY NJ",
    income: 154000, language: "English", source: "DEMO · website",
    members: [
      { id: "demo-2a", name: "James Demo-Okafor", role: "head", lines: ["Health", "Tax", "Advisory", "Life"] },
      { id: "demo-2b", name: "Grace Demo-Okafor", role: "spouse", lines: ["Health"] },
    ],
  },
  {
    hid: "demo-h3", lastName: "Demo-Singh", address: "55 Demo Blvd, Jersey City NJ",
    income: 240000, language: "English", source: "DEMO · referral",
    members: [
      { id: "demo-3a", name: "Amrit Demo-Singh", role: "head", lines: ["Bookkeeping", "Tax", "Advisory", "Group", "Life"] },
    ],
  },
  {
    hid: "demo-h4", lastName: "Demo-Reyes", address: "9 Demo Ct, Union City NJ",
    income: 41000, language: "Spanish", source: "DEMO · walk-in",
    members: [
      { id: "demo-4a", name: "Lucia Demo-Reyes", role: "head", lines: ["Health"] },
      { id: "demo-4b", name: "Diego Demo-Reyes", role: "dependent", age: 14, lines: [] },
    ],
  },
  {
    hid: "demo-h5", lastName: "Demo-Brown", address: "300 Demo Rd, Bayonne NJ",
    income: 62000, language: "English", source: "DEMO · BNI referral",
    members: [
      { id: "demo-5a", name: "Tanya Demo-Brown", role: "head", lines: ["Tax"] },
    ],
  },
  {
    hid: "demo-h6", lastName: "Demo-Costa", address: "77 Demo Ln, Hoboken NJ",
    income: 118000, language: "Spanish", source: "DEMO · referral",
    members: [
      { id: "demo-6a", name: "Paulo Demo-Costa", role: "head", lines: ["Health", "Bookkeeping", "Tax"] },
      { id: "demo-6b", name: "Ana Demo-Costa", role: "spouse", lines: ["Life"] },
    ],
  },
];

// Flatten households → individual contact rows (list-shaped: id, name, _demo, tags)
export function demoIndividuals() {
  const out = [];
  for (const h of DEMO_HOUSEHOLDS) {
    for (const m of h.members) {
      out.push({
        id: m.id, name: m.name, email: "", phone: "",
        tags: ["DEMO"], _demo: true, _hid: h.hid,
        _lines: m.lines, _income: h.income, _language: h.language, _source: h.source,
        _role: m.role, _age: m.age,
      });
    }
  }
  return out;
}

// Revenue + recurring for a set of lines
export function linesRevenue(lines) {
  const value = (lines || []).reduce((s, l) => s + (LINE_REV[l] || 0), 0);
  const recurring = (lines || []).filter((l) => RECURRING[l]).reduce((s, l) => s + (LINE_REV[l] || 0), 0);
  return { value, recurring };
}

// Build economic UNITS from individuals, either per-person or per-household.
// mode: "individual" | "household". lineFilter: null | "Health" etc.
export function buildUnits(individuals, mode, lineFilter) {
  const inScope = (lines) => !lineFilter || (lines || []).includes(lineFilter);

  if (mode === "household") {
    const byH = {};
    for (const p of individuals) {
      const hid = p._hid || p.id;
      (byH[hid] ||= { id: hid, name: "", lines: new Set(), income: p._income || 0, members: 0 });
      byH[hid].members++;
      (p._lines || []).forEach((l) => byH[hid].lines.add(l));
      // household display name from last-name-ish head
      if (p._role === "head" || !byH[hid].name) byH[hid].name = householdName(p.name);
    }
    return Object.values(byH)
      .map((u) => ({ ...u, lines: [...u.lines] }))
      .filter((u) => inScope(u.lines))
      .map(finalizeUnit);
  }

  // individual
  return individuals
    .filter((p) => inScope(p._lines))
    .map((p) => finalizeUnit({ id: p.id, name: p.name, lines: p._lines || [], income: p._income || 0, members: 1 }));
}

function householdName(personName) {
  const parts = String(personName || "").split(/\s+/);
  const last = parts[parts.length - 1] || personName;
  return `${last} household`;
}

function finalizeUnit(u) {
  const { value, recurring } = linesRevenue(u.lines);
  const nLines = u.lines.length || 1;
  // modeled effort: more lines + smaller households cost relatively more touch
  const effort = Math.min(100, 30 + nLines * 12 + (u.members === 1 ? 10 : 0));
  const valueScore = Math.min(100, Math.round((value / 4000) * 100));
  const single = u.lines.length <= 1;
  const tier = valueScore >= 60 && effort <= 55 ? "A" : valueScore >= 60 ? "B" : effort <= 55 ? "C" : "D";
  const quadrant = valueScore >= 50 ? (effort <= 50 ? "hv_le" : "hv_he") : (effort <= 50 ? "lv_le" : "lv_he");
  return { ...u, value, recurring, effort, valueScore, single, tier, quadrant };
}

export const ALL_LINES = ["Health", "Medicare", "Life", "Group", "Tax", "Bookkeeping", "Advisory", "P&C"];
