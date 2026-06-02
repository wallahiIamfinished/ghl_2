import { useMemo, useState } from "react";
import { TrendingUp, Users, Repeat, AlertTriangle, Target, Megaphone, Share2, Link2 } from "lucide-react";
import { demoIndividuals, buildUnits, ALL_LINES } from "./demoData";

/* ============================================================================
   GROWTH INTELLIGENCE LAYER  (portfolio-level)
   ----------------------------------------------------------------------------
   Reframes the book around how successful brokers/advisors/tax pros actually
   grow: depth over width, recurring over transactional, retention as cheapest
   growth, prune/reprice the tail.

   DATA HONESTY (shown in the UI footer too):
   - REAL:      the client roster + count come from GHL (the rows passed in).
   - MODELED:   Total Client Value, cost-to-serve / Time-to-Service, tiers,
                recurring mix, churn, LTV, source attribution — these need
                revenue + effort data from Toro / QBO / carrier feeds /
                a real activity ledger, which aren't wired yet. Numbers here
                are derived deterministically from each contact id so the demo
                is stable and self-consistent, NOT pulled from real revenue.
   This layer is the payoff of wiring the core integrations — it runs for real
   the moment revenue + cost-to-serve data flows in.
   ========================================================================== */

const LINES = ["Health", "Medicare", "Life", "Group", "Tax", "Bookkeeping", "Advisory", "P&C"];

// deterministic per-id hash so the same client always models the same way
function hash(id) { let h = 0; const s = String(id || ""); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

// modeled line-membership for a REAL contact id (demo seeds carry their own _lines).
// Mirrors the list page's clientLines so the two stay consistent.
function clientLinesFromId(id) {
  const h = hash(id);
  const lines = [];
  LINES.forEach((l, i) => { if ((h >> i) & 1) lines.push(l); });
  if (!lines.length) lines.push("Health");
  return lines;
}

const fmt$ = (n) => "$" + Math.round(n).toLocaleString();

const QUAD = {
  hv_le: { label: "High value · Low effort", note: "Your ICP — go get more of these", color: "var(--olive)" },
  hv_he: { label: "High value · High effort", note: "Protect + automate the cost to serve", color: "var(--teal)" },
  lv_le: { label: "Low value · Low effort", note: "Leave alone — quietly profitable", color: "var(--muted)" },
  lv_he: { label: "Low value · High effort", note: "The tail bleeding you — reprice or graduate", color: "var(--rust)" },
};
const TIER_COLOR = { A: "var(--olive)", B: "var(--teal)", C: "var(--ochre)", D: "var(--rust)" };

const CSS = `
.gr{--cream:#F4F1E8;--paper:#fff;--teal:#1F4D4A;--ink:#1A1A1A;--ink2:#4A4A48;--muted:#7A7A75;--line:rgba(26,26,26,.1);--olive:#4A5D2C;--ochre:#8B6914;--rust:#A8442F;
  --serif:'Newsreader',Georgia,serif;--sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;color:var(--ink);font-family:var(--sans);}
.gr *{box-sizing:border-box;}
.gr .lead{font-size:13px;color:var(--ink2);margin-bottom:16px;max-width:760px;line-height:1.5;}
.gr .sec{font-size:10px;font-weight:500;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted);margin:0 0 9px;}
.gr .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;}
.gr .kpi{background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:13px 15px;}
.gr .kpi .v{font-family:var(--serif);font-size:23px;font-weight:500;}
.gr .kpi .l{font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-top:2px;}
.gr .v.teal{color:var(--teal);}.gr .v.olive{color:var(--olive);}.gr .v.ochre{color:var(--ochre);}.gr .v.rust{color:var(--rust);}
.gr .card{background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:16px;margin-bottom:20px;}
.gr .matrix{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.gr .quad{border:1px solid var(--line);border-radius:8px;padding:13px;min-height:120px;position:relative;}
.gr .quad .qh{font-size:12px;font-weight:600;display:flex;align-items:center;gap:7px;}
.gr .quad .qn{font-size:11px;color:var(--ink2);margin:3px 0 8px;}
.gr .quad .qc{font-family:var(--serif);font-size:20px;}
.gr .quad .qnames{font-size:10.5px;color:var(--muted);margin-top:6px;line-height:1.5;}
.gr .dotq{width:9px;height:9px;border-radius:50%;flex:0 0 auto;}
.gr .scatter{position:relative;height:300px;border-left:1.5px solid var(--line);border-bottom:1.5px solid var(--line);margin:6px 0 4px;}
.gr .pt{position:absolute;width:11px;height:11px;border-radius:50%;transform:translate(-50%,50%);border:1.5px solid #fff;cursor:default;}
.gr .axl{font-size:10px;color:var(--muted);}
.gr .axx{text-align:center;margin-top:4px;}
.gr .midv{position:absolute;left:50%;top:0;bottom:0;border-left:1px dashed var(--line);}
.gr .midh{position:absolute;top:50%;left:0;right:0;border-top:1px dashed var(--line);}
.gr .tiers{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
.gr .tier{border:1px solid var(--line);border-radius:8px;padding:12px;}
.gr .tier .th{font-family:var(--serif);font-size:22px;}.gr .tier .tl{font-size:10.5px;color:var(--muted);}
.gr .tier .tc{font-size:12px;margin-top:6px;color:var(--ink2);}
.gr .bar{height:9px;border-radius:5px;background:rgba(26,26,26,.07);overflow:hidden;margin-top:8px;}
.gr .bar > span{display:block;height:100%;}
.gr .row2{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
.gr .li{display:flex;align-items:center;justify-content:space-between;font-size:12px;padding:6px 0;border-bottom:1px solid var(--line);}
.gr .li:last-child{border-bottom:none;}
.gr .li .muted{color:var(--muted);}
.gr .play{display:flex;gap:11px;padding:11px 0;border-bottom:1px solid var(--line);}
.gr .play:last-child{border-bottom:none;}
.gr .play .ic{color:var(--teal);flex:0 0 auto;margin-top:1px;}
.gr .play .pt2{font-size:12.5px;font-weight:600;}
.gr .play .pd{font-size:11.5px;color:var(--ink2);margin-top:2px;}
.gr .foot{font-size:11px;color:var(--muted);font-style:italic;margin-top:6px;line-height:1.5;}
.gr .modeled{display:inline-block;font-size:8.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--ochre);background:rgba(139,105,20,.12);border-radius:3px;padding:2px 6px;margin-left:6px;}
@media(max-width:680px){.gr .kpis,.gr .tiers{grid-template-columns:repeat(2,1fr);}.gr .matrix,.gr .row2{grid-template-columns:1fr;}}
.gr .gr-controls{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:18px;}
.gr .seg{display:flex;border:1px solid var(--line);border-radius:7px;overflow:hidden;}
.gr .seg button{border:0;background:var(--paper);font-family:var(--sans);font-size:12px;padding:6px 14px;cursor:pointer;color:var(--ink2);}
.gr .seg button.on{background:var(--teal);color:#F4F1E8;}
.gr .linefilter{display:flex;flex-wrap:wrap;gap:5px;}
.gr .lf{font-size:11px;padding:4px 10px;border-radius:20px;border:1px solid var(--line);background:var(--paper);color:var(--ink2);cursor:pointer;font-family:var(--sans);}
.gr .lf.on{background:var(--ochre);color:#F4F1E8;border-color:var(--ochre);}
`;

export default function Growth({ rows }) {
  const [mode, setMode] = useState("household");   // individual | household
  const [line, setLine] = useState(null);          // null = all lines

  // Merge any real rows with the explicit DEMO seed so the book is always
  // populated; build economic units per the mode + line filter.
  const individuals = useMemo(() => {
    const seed = demoIndividuals();
    const realDemoShaped = (rows || []).map((r) => ({
      ...r, _lines: clientLinesFromId(r.id), _income: 60000 + (hash(r.id) % 90000),
      _hid: r.id, _role: "head",
    }));
    return [...seed, ...realDemoShaped];
  }, [rows]);

  const data = useMemo(() => buildUnits(individuals, mode, line), [individuals, mode, line]);

  const totals = useMemo(() => {
    const n = data.length || 1;
    const bookValue = data.reduce((s, d) => s + d.value, 0);
    const recurring = data.reduce((s, d) => s + d.recurring, 0);
    const recurringPct = bookValue ? Math.round((recurring / bookValue) * 100) : 0;
    const singleProduct = data.filter((d) => d.single).length;
    const churnRisk = bookValue ? Math.round((data.filter((d) => d.single).reduce((s, d) => s + d.value, 0) / bookValue) * 100) : 0;
    const avgLines = (data.reduce((s, d) => s + d.lines.length, 0) / n).toFixed(1);
    const tiers = { A: [], B: [], C: [], D: [] };
    const quads = { hv_le: [], hv_he: [], lv_le: [], lv_he: [] };
    data.forEach((d) => { tiers[d.tier].push(d); quads[d.quadrant].push(d); });
    return { bookValue, recurring, recurringPct, singleProduct, churnRisk, avgLines, tiers, quads };
  }, [data]);

  const topClients = useMemo(() => [...data].sort((a, b) => b.value - a.value).slice(0, 6), [data]);

  const unitWord = mode === "household" ? "households" : "individuals";

  return (
    <div className="gr">
      <style>{CSS}</style>
      <div className="lead">
        How high-performing brokers actually grow: <b>depth over width, recurring over transactional, retention as the cheapest growth, and pruning the tail while doubling down on the top.</b> None of it is runnable without knowing each household's <b>value</b> and <b>cost to serve</b> — which is exactly what this layer establishes.
      </div>

      {/* CONTROLS: individual/household + line-of-business filter */}
      <div className="gr-controls">
        <div className="seg">
          <button className={mode === "household" ? "on" : ""} onClick={() => setMode("household")}>Households</button>
          <button className={mode === "individual" ? "on" : ""} onClick={() => setMode("individual")}>Individuals</button>
        </div>
        <div className="linefilter">
          <button className={`lf ${!line ? "on" : ""}`} onClick={() => setLine(null)}>All lines</button>
          {ALL_LINES.map((l) => (
            <button key={l} className={`lf ${line === l ? "on" : ""}`} onClick={() => setLine(l)}>{l}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis">
        <div className="kpi"><div className="v teal">{fmt$(totals.bookValue)}<span className="modeled">modeled</span></div><div className="l">{line ? `${line} book value` : "Annual book value"}</div></div>
        <div className="kpi"><div className="v olive">{totals.recurringPct}%<span className="modeled">modeled</span></div><div className="l">Recurring revenue mix</div></div>
        <div className="kpi"><div className="v">{totals.avgLines}<span className="modeled">modeled</span></div><div className="l">Avg lines / {mode === "household" ? "household" : "client"}</div></div>
        <div className="kpi"><div className="v rust">{totals.churnRisk}%<span className="modeled">modeled</span></div><div className="l">Churn-risk revenue (single-line)</div></div>
      </div>

      {/* VALUE / EFFORT MATRIX */}
      <div className="sec">★ Value / Effort matrix — how to run the book</div>
      <div className="card">
        <div className="matrix">
          {["hv_le", "hv_he", "lv_le", "lv_he"].map((q) => (
            <div className="quad" key={q}>
              <div className="qh"><span className="dotq" style={{ background: QUAD[q].color }} /> {QUAD[q].label}</div>
              <div className="qn">{QUAD[q].note}</div>
              <div className="qc" style={{ color: QUAD[q].color }}>{totals.quads[q].length} <span style={{ fontSize: 11, color: "var(--muted)" }}>{unitWord} · {fmt$(totals.quads[q].reduce((s, d) => s + d.value, 0))}</span></div>
              <div className="qnames">{totals.quads[q].slice(0, 4).map((d) => d.name).join(", ") || "—"}</div>
            </div>
          ))}
        </div>
        {/* scatter */}
        <div style={{ marginTop: 14 }}>
          <div className="scatter">
            <div className="midv" /><div className="midh" />
            {data.map((d, i) => (
              <div key={i} className="pt"
                title={`${d.name} · ${fmt$(d.value)} · effort ${d.effort}`}
                style={{ left: `${d.effort}%`, bottom: `${d.valueScore}%`, background: QUAD[d.quadrant].color }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="axl">← lower effort</span><span className="axl">higher effort →</span>
          </div>
          <div className="axx axl">x = cost to serve · y = client value</div>
        </div>
        <div className="foot">Modeled from each household's lines + activity volume. Becomes live once revenue (Toro/QBO/carrier) and a real effort ledger are wired.</div>
      </div>

      {/* AUTO-TIERED BOOK */}
      <div className="sec">Auto-tiered book (A / B / C / D)</div>
      <div className="card">
        <div className="tiers">
          {["A", "B", "C", "D"].map((t) => {
            const grp = totals.tiers[t]; const val = grp.reduce((s, d) => s + d.value, 0);
            const labels = { A: "Best — protect & clone", B: "High value, costly", C: "Steady, low touch", D: "Reprice or graduate" };
            return (
              <div className="tier" key={t}>
                <div className="th" style={{ color: TIER_COLOR[t] }}>{t}</div>
                <div className="tl">{labels[t]}</div>
                <div className="tc">{grp.length} {unitWord} · {fmt$(val)}</div>
                <div className="bar"><span style={{ width: `${Math.min(100, (grp.length / (data.length || 1)) * 100)}%`, background: TIER_COLOR[t] }} /></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RECURRING + CHURN + CROSS-SELL DEPTH + TOP CLIENTS */}
      <div className="row2">
        <div>
          <div className="sec"><Repeat size={11} style={{ verticalAlign: "middle" }} /> Recurring revenue & churn radar</div>
          <div className="card">
            <div className="li"><span>Recurring revenue</span><span>{fmt$(totals.recurring)} <span className="muted">/ {totals.recurringPct}%</span></span></div>
            <div className="li"><span>Transactional revenue</span><span className="muted">{fmt$(totals.bookValue - totals.recurring)}</span></div>
            <div className="li"><span><AlertTriangle size={12} style={{ verticalAlign: "middle", color: "var(--rust)" }} /> Single-line {unitWord}</span><span style={{ color: "var(--rust)" }}>{totals.singleProduct}</span></div>
            <div className="foot">Single-line {unitWord} churn hardest — each is a depth (cross-sell) opportunity and a retention risk.</div>
          </div>
        </div>
        <div>
          <div className="sec"><Target size={11} style={{ verticalAlign: "middle" }} /> Most valuable {unitWord} <span className="modeled">modeled</span></div>
          <div className="card">
            {topClients.map((d, i) => (
              <div className="li" key={i}>
                <span>{d.name} <span className="muted">· {d.lines.length} lines · tier {d.tier}</span></span>
                <span>{fmt$(d.value)}</span>
              </div>
            ))}
            <div className="foot">He doesn’t currently know who these are. This is the list that should get the white-glove treatment.</div>
          </div>
        </div>
      </div>

      {/* BOOK-WIDE CROSS-SELL DEPTH (centralized here, not on each contact) */}
      <div className="sec"><TrendingUp size={11} style={{ verticalAlign: "middle" }} /> Cross-sell depth gauge — the engine pointed at the whole book</div>
      <div className="card">
        <div className="li"><span>Avg lines per household</span><span>{totals.avgLines} <span className="muted">of 8</span></span></div>
        <div className="li"><span>{mode === "household" ? "Households" : "Individuals"} with 1 line (deepen first)</span><span>{totals.singleProduct}</span></div>
        <div className="li"><span>Open cross-sell signals across book</span><span className="muted">{Math.round(data.length * 0.4)} <span className="modeled">modeled</span></span></div>
        <div className="foot">The per-client cross-sell engine, aggregated. Depth (more lines per existing household) is cheaper growth than new acquisition.</div>
      </div>

      {/* MARKETING / ACQUISITION PLAYS */}
      <div className="sec"><Megaphone size={11} style={{ verticalAlign: "middle" }} /> Turning the data into marketing</div>
      <div className="card">
        <div className="play"><Users size={15} className="ic" /><div><div className="pt2">Lookalike acquisition from your ICP</div><div className="pd">Target more high-value/low-effort profiles ({totals.quads.hv_le.length} today) — find more of your best, not just more bodies.</div></div></div>
        <div className="play"><Repeat size={15} className="ic" /><div><div className="pt2">Segment-triggered lifecycle campaigns</div><div className="pd">The cross-line filters become self-refilling audiences — AEP, renewals, life events — delivered in Spanish where flagged.</div></div></div>
        <div className="play"><Share2 size={15} className="ic" /><div><div className="pt2">Referral campaigns aimed at A-tier</div><div className="pd">Your {totals.tiers.A.length} happiest, highest-value {unitWord} become your cheapest acquisition channel, deliberately.</div></div></div>
        <div className="play"><Link2 size={15} className="ic" /><div><div className="pt2">Source attribution → LTV loop</div><div className="pd">Tie each household’s eventual value back to how they came in, so marketing spend flows to what compounds. Most firms this size never close this loop.</div></div></div>
      </div>

      <div className="foot" style={{ marginTop: 4 }}>
        <b>Dependency:</b> this layer is only as good as the revenue + cost-to-serve data flowing from the upstream integrations (Toro, QBO, carrier feeds, a real activity ledger). The roster and counts here are live from GHL; the dollar values, effort scores, and tiers are modeled. Wiring the core is what turns this from a compelling picture into a live operating system for the book.
      </div>
    </div>
  );
}
