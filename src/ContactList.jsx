import { useEffect, useMemo, useState } from "react";
import { Search, ChevronRight, Bell, Building2, Users, LineChart, X } from "lucide-react";
import Growth from "./Growth";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap');
.cl{--cream:#F4F1E8;--paper:#fff;--teal:#1F4D4A;--ink:#1A1A1A;--ink2:#4A4A48;--muted:#7A7A75;--line:rgba(26,26,26,.1);--olive:#4A5D2C;--ochre:#8B6914;--rust:#A8442F;
  --serif:'Newsreader',Georgia,serif;--sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;
  font-family:var(--sans);background:var(--cream);min-height:100%;padding:22px;box-sizing:border-box;color:var(--ink);}
.cl *{box-sizing:border-box;}
.cl .wrap{max-width:860px;margin:0 auto;}
.cl .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.cl .ti{font-family:var(--serif);font-size:26px;font-weight:500;}
.cl .sub{color:var(--ink2);font-size:13px;margin-top:3px;}
.cl .topright{display:flex;align-items:center;gap:10px;}
.cl .tabs{display:flex;gap:6px;margin-bottom:16px;border-bottom:1px solid var(--line);}
.cl .tab{display:flex;align-items:center;gap:6px;border:0;background:none;font-family:var(--sans);font-size:13px;color:var(--muted);padding:8px 12px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;}
.cl .tab.on{color:var(--teal);border-bottom-color:var(--teal);font-weight:600;}
.cl .entity{display:flex;border:1px solid var(--line);border-radius:7px;overflow:hidden;}
.cl .entity button{border:0;background:var(--paper);font-size:11.5px;padding:6px 12px;cursor:pointer;color:var(--ink2);font-family:var(--sans);display:flex;align-items:center;gap:5px;}
.cl .entity button.on{background:var(--teal);color:#F4F1E8;}
.cl .bell{position:relative;background:var(--paper);border:1px solid var(--line);border-radius:7px;width:34px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink2);}
.cl .bell .dot{position:absolute;top:5px;right:6px;width:7px;height:7px;border-radius:50%;background:var(--rust);}
.cl .notes{background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:10px 14px;margin-bottom:14px;}
.cl .notes .n{font-size:12px;color:var(--ink2);padding:3px 0;display:flex;gap:7px;align-items:center;}
.cl .notes .n .b{width:6px;height:6px;border-radius:50%;background:var(--ochre);flex:0 0 auto;}
.cl .roll{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;}
.cl .stat{background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:12px 14px;}
.cl .stat .v{font-family:var(--serif);font-size:24px;font-weight:500;}
.cl .stat .l{font-size:10.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-top:2px;}
.cl .stat .v.teal{color:var(--teal);}.cl .stat .v.ochre{color:var(--ochre);}.cl .stat .v.olive{color:var(--olive);}
.cl .search{display:flex;align-items:center;gap:9px;background:var(--paper);border:1px solid var(--line);border-radius:7px;padding:10px 13px;color:var(--muted);}
.cl .search input{border:0;outline:0;flex:1;font-size:14px;color:var(--ink);background:transparent;font-family:var(--sans);}
.cl .filters{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0 4px;}
.cl .fchip{font-size:11px;padding:5px 11px;border-radius:20px;border:1px solid var(--line);background:var(--paper);color:var(--ink2);cursor:pointer;font-family:var(--sans);}
.cl .fchip.on{background:var(--teal);color:#F4F1E8;border-color:var(--teal);}
.cl .fchip .demo{font-size:8px;opacity:.7;margin-left:4px;text-transform:uppercase;}
.cl .msg{color:var(--muted);font-size:13px;padding:20px 2px;}
.cl .list{display:flex;flex-direction:column;gap:8px;margin-top:10px;}
.cl .row{display:flex;align-items:center;gap:13px;width:100%;text-align:left;cursor:pointer;
  background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:13px 15px;transition:.12s;font-family:var(--sans);}
.cl .row:hover{border-color:var(--teal);transform:translateX(2px);}
.cl .av{width:40px;height:40px;border-radius:50%;background:var(--teal);color:#F4F1E8;flex:0 0 auto;
  display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;}
.cl .meta{flex:1;min-width:0;}
.cl .nm{font-size:14.5px;font-weight:600;}
.cl .dt{font-size:12px;color:var(--muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cl .tags{margin-top:6px;display:flex;gap:5px;flex-wrap:wrap;}
.cl .tag{font-size:10px;color:var(--teal);background:rgba(31,77,74,.08);border-radius:4px;padding:2px 7px;}
.cl .chev{color:var(--muted);flex:0 0 auto;}
.cl .fchip.newview{border-style:dashed;color:var(--teal);font-weight:600;}
.cl .fchip.newview:hover{background:rgba(31,77,74,.06);}
.cl .fchip .demo:last-child{}
.cl-modal{position:fixed;inset:0;background:rgba(26,26,26,.45);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;}
.cl-dialog{background:#fff;border-radius:8px;width:460px;max-width:100%;max-height:88vh;overflow:auto;font-family:var(--sans);color:var(--ink);}
.cl-dlg-head{display:flex;align-items:center;justify-content:space-between;padding:15px 18px;border-bottom:1px solid var(--line);font-family:var(--serif);font-size:17px;}
.cl-x{background:none;border:0;cursor:pointer;color:var(--muted);display:flex;}
.cl-dlg-body{padding:16px 18px;}
.cl-l{display:block;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:12px 0 5px;}
.cl-l .muted2{text-transform:none;letter-spacing:0;font-size:10.5px;}
.cl-in{width:100%;border:1px solid var(--line);border-radius:5px;padding:8px 10px;font-size:13px;font-family:var(--sans);color:var(--ink);}
.cond-row{display:flex;gap:7px;align-items:center;margin-bottom:7px;}
.cl-sel{border:1px solid var(--line);border-radius:5px;padding:7px 9px;font-size:12.5px;font-family:var(--sans);background:#fff;color:var(--ink);}
.cl-sel.grow{flex:1;}
.cond-x{background:none;border:0;color:var(--muted);cursor:pointer;display:flex;}.cond-x:hover{color:var(--rust);}
.addcond{background:none;border:1px dashed var(--line);border-radius:5px;padding:6px 11px;font-size:11.5px;color:var(--ink2);cursor:pointer;font-family:var(--sans);margin-top:3px;}
.addcond:hover{border-color:var(--teal);color:var(--teal);}
.cl-preview{margin-top:14px;background:rgba(31,77,74,.05);border-radius:6px;padding:9px 12px;font-size:12.5px;color:var(--ink2);}
.cl-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;}
.cl-btn{padding:7px 14px;border-radius:5px;border:1px solid var(--line);background:#fff;font-size:12.5px;cursor:pointer;font-family:var(--sans);color:var(--ink);}
.cl-btn.primary{background:var(--teal);color:#F4F1E8;border-color:var(--teal);}
.cl-btn:disabled{opacity:.5;cursor:not-allowed;}
.cl-foot{font-size:10.5px;color:var(--muted);font-style:italic;margin-top:10px;}
@media(max-width:680px){.cl .roll{grid-template-columns:repeat(2,1fr);}}
`;

// Cross-line filter views (Julio's north star) — vision toggles
const LINES = ["Health", "Medicare", "Life", "Group", "Tax", "Bookkeeping", "Advisory", "P&C"];

// Built-in preset views, expressed as condition lists (same engine as custom views).
// A condition: { line, op: "has" | "missing" }. A client matches if ALL conditions hold.
const PRESETS = [
  { key: "all", label: "All clients", conds: [] },
  { key: "health_no_tax", label: "Health · no Tax", demo: true, conds: [{ line: "Health", op: "has" }, { line: "Tax", op: "missing" }] },
  { key: "medicare_no_life", label: "Medicare · no Life", demo: true, conds: [{ line: "Medicare", op: "has" }, { line: "Life", op: "missing" }] },
  { key: "tax_no_advisory", label: "Tax · no Advisory", demo: true, conds: [{ line: "Tax", op: "has" }, { line: "Advisory", op: "missing" }] },
  { key: "pc_eligible", label: "P&C eligible", demo: true, conds: [{ line: "P&C", op: "missing" }] },
];

const NOTIFICATIONS = [
  "3 documents received today",
  "2 cross-sell opportunities triggered",
  "1 Medicare eligibility approaching (within 12 months)",
];

const initials = (n) =>
  (n || "?").split(/\s+/).slice(0, 2).map((x) => x[0] || "").join("").toUpperCase();

// stable hash of an id string
function hashId(id) {
  let h = 0; const s = String(id || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
// MODELED: which lines a client "has", derived deterministically from their id.
// (Demo stand-in until real per-line status fields exist in GHL.)
function clientLines(id) {
  const h = hashId(id);
  const set = new Set();
  LINES.forEach((l, i) => { if ((h >> i) & 1) set.add(l); });
  if (!set.size) set.add("Health");           // everyone has at least one
  return set;
}
// evaluate a condition list against a client
function matchesConds(id, conds) {
  if (!conds || !conds.length) return true;
  const lines = clientLines(id);
  return conds.every((c) => c.op === "has" ? lines.has(c.line) : !lines.has(c.line));
}

export default function ContactList({ locationId, onSelect }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");   // all | insurance | consulting (vision)
  const [filter, setFilter] = useState("all");    // active view key
  const [bellOpen, setBellOpen] = useState(false);
  const [tab, setTab] = useState("clients");      // clients | growth
  const [customViews, setCustomViews] = useState([]); // [{key,label,conds}]
  const [builder, setBuilder] = useState(null);   // null=closed; {name, conds:[{line,op}]}

  useEffect(() => {
    let live = true;
    fetch(`/api/ghl/${encodeURIComponent(locationId)}/contacts`, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Proxy ${r.status}`))))
      .then((d) => live && setRows(d.contacts || []))
      .catch((e) => live && setErr(e.message));
    return () => { live = false; };
  }, [locationId]);

  const allViews = useMemo(() => [...PRESETS, ...customViews], [customViews]);

  // text search (real) + active view conditions (modeled per-line attributes)
  const filtered = useMemo(() => {
    const base = rows || [];
    const s = q.trim().toLowerCase();
    const bySearch = !s ? base : base.filter((c) =>
      [c.name, c.email, c.phone, (c.tags || []).join(" ")].join(" ").toLowerCase().includes(s));
    const view = allViews.find((v) => v.key === filter) || allViews[0];
    return bySearch.filter((c) => matchesConds(c.id, view.conds));
  }, [rows, q, filter, allViews]);

  // rollup stats — counts are real off loaded rows; pipeline value/conversion are vision
  const total = (rows || []).length;
  const stats = [
    { v: total, l: "Clients", cls: "" },
    { v: "$182k", l: "Pipeline value", cls: "teal" },
    { v: 7, l: "Cross-sells open", cls: "ochre" },
    { v: "34%", l: "Conversion", cls: "olive" },
  ];

  return (
    <div className="cl">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <div>
            <div className="ti">{tab === "growth" ? "Growth Intelligence" : "Clients"}</div>
            <div className="sub">{tab === "growth" ? "Run the book by value and cost to serve" : "JN Insurance & Consulting · select a client to open their 360 view"}</div>
          </div>
          <div className="topright">
            {tab === "clients" && (
              <div className="entity">
                <button className={entity === "all" ? "on" : ""} onClick={() => setEntity("all")}>All</button>
                <button className={entity === "insurance" ? "on" : ""} onClick={() => setEntity("insurance")}><Building2 size={12} /> Insurance</button>
                <button className={entity === "consulting" ? "on" : ""} onClick={() => setEntity("consulting")}><Building2 size={12} /> Consulting</button>
              </div>
            )}
            <div className="bell" onClick={() => setBellOpen((o) => !o)}>
              <Bell size={16} /><span className="dot" />
            </div>
          </div>
        </div>

        {/* top-level tabs */}
        <div className="tabs">
          <button className={`tab ${tab === "clients" ? "on" : ""}`} onClick={() => setTab("clients")}><Users size={14} /> Clients</button>
          <button className={`tab ${tab === "growth" ? "on" : ""}`} onClick={() => setTab("growth")}><LineChart size={14} /> Growth</button>
        </div>

        {tab === "growth" ? (
          <Growth rows={rows} />
        ) : (
        <>
        {bellOpen && (
          <div className="notes">
            {NOTIFICATIONS.map((n, i) => (
              <div className="n" key={i}><span className="b" /> {n}</div>
            ))}
          </div>
        )}

        {/* Owner rollup (counts real; value/conversion vision) */}
        <div className="roll">
          {stats.map((s, i) => (
            <div className="stat" key={i}>
              <div className={`v ${s.cls}`}>{s.v}</div>
              <div className="l">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="search">
          <Search size={15} />
          <input placeholder="Search name, email, phone, tag…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {/* Cross-line filter views (Julio's north star) — presets + custom */}
        <div className="filters">
          {allViews.map((f) => (
            <button key={f.key} className={`fchip ${filter === f.key ? "on" : ""}`} onClick={() => setFilter(f.key)}>
              {f.label}{f.demo && <span className="demo">demo</span>}{f.custom && <span className="demo">custom</span>}
            </button>
          ))}
          <button className="fchip newview" onClick={() => setBuilder({ name: "", conds: [{ line: "Health", op: "has" }] })}>
            + New view
          </button>
        </div>

        {err && <div className="msg">Couldn’t load contacts: {err}</div>}
        {!rows && !err && <div className="msg">Loading clients…</div>}
        {rows && filtered.length === 0 && <div className="msg">No matches.</div>}

        <div className="list">
          {filtered.map((c) => (
            <button key={c.id} className="row" onClick={() => onSelect(c.id)}>
              <div className="av">{initials(c.name)}</div>
              <div className="meta">
                <div className="nm">{c.name}</div>
                <div className="dt">{[c.email, c.phone].filter(Boolean).join(" · ")}</div>
                {c.tags?.length ? (
                  <div className="tags">
                    {c.tags.slice(0, 4).map((t, i) => <span key={i} className="tag">{t}</span>)}
                  </div>
                ) : null}
              </div>
              <ChevronRight size={16} className="chev" />
            </button>
          ))}
        </div>
        </>
        )}
      </div>

      {/* CUSTOM VIEW BUILDER */}
      {builder && (
        <div className="cl-modal" onClick={(e) => { if (e.target.classList.contains("cl-modal")) setBuilder(null); }}>
          <div className="cl-dialog">
            <div className="cl-dlg-head">
              <span>Build a custom view</span>
              <button className="cl-x" onClick={() => setBuilder(null)}><X size={16} /></button>
            </div>
            <div className="cl-dlg-body">
              <label className="cl-l">View name</label>
              <input className="cl-in" autoFocus placeholder="e.g. Group clients approaching Medicare"
                value={builder.name} onChange={(e) => setBuilder((b) => ({ ...b, name: e.target.value }))} />

              <label className="cl-l">Conditions <span className="muted2">— client matches when all are true</span></label>
              {builder.conds.map((cond, i) => (
                <div className="cond-row" key={i}>
                  <select className="cl-sel" value={cond.op}
                    onChange={(e) => setBuilder((b) => ({ ...b, conds: b.conds.map((x, j) => j === i ? { ...x, op: e.target.value } : x) }))}>
                    <option value="has">Has</option>
                    <option value="missing">Doesn't have</option>
                  </select>
                  <select className="cl-sel grow" value={cond.line}
                    onChange={(e) => setBuilder((b) => ({ ...b, conds: b.conds.map((x, j) => j === i ? { ...x, line: e.target.value } : x) }))}>
                    {LINES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  {builder.conds.length > 1 && (
                    <button className="cond-x" onClick={() => setBuilder((b) => ({ ...b, conds: b.conds.filter((_, j) => j !== i) }))}><X size={13} /></button>
                  )}
                </div>
              ))}
              <button className="addcond" onClick={() => setBuilder((b) => ({ ...b, conds: [...b.conds, { line: "Tax", op: "missing" }] }))}>+ Add condition</button>

              {/* live preview count */}
              <div className="cl-preview">
                Matches now: <b>{(rows || []).filter((c) => matchesConds(c.id, builder.conds)).length}</b> of {(rows || []).length} clients
              </div>

              <div className="cl-actions">
                <button className="cl-btn" onClick={() => setBuilder(null)}>Cancel</button>
                <button className="cl-btn primary" disabled={!builder.name.trim()}
                  onClick={() => {
                    const key = "cv_" + Date.now();
                    setCustomViews((v) => [...v, { key, label: builder.name.trim(), conds: builder.conds, custom: true }]);
                    setFilter(key); setBuilder(null);
                  }}>Save view</button>
              </div>
              <div className="cl-foot">Saved for this session · runs on modeled per-line data until real status fields are wired.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
