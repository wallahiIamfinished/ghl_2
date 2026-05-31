import { useEffect, useMemo, useState } from "react";
import { Search, ChevronRight, Bell, Building2 } from "lucide-react";

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
@media(max-width:680px){.cl .roll{grid-template-columns:repeat(2,1fr);}}
`;

// Cross-line filter views (Julio's north star) — vision toggles
const FILTERS = [
  { key: "all", label: "All clients" },
  { key: "health_no_tax", label: "Health · no Tax", demo: true },
  { key: "medicare_no_life", label: "Medicare · no Life", demo: true },
  { key: "tax_no_advisory", label: "Tax · no Advisory", demo: true },
  { key: "pc_eligible", label: "P&C eligible", demo: true },
];
const NOTIFICATIONS = [
  "3 documents received today",
  "2 cross-sell opportunities triggered",
  "1 Medicare eligibility approaching (within 12 months)",
];

const initials = (n) =>
  (n || "?").split(/\s+/).slice(0, 2).map((x) => x[0] || "").join("").toUpperCase();

// stable small hash of an id string, for deterministic vision filter subsets
function hashId(id) {
  let h = 0; const s = String(id || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function ContactList({ locationId, onSelect }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");   // all | insurance | consulting (vision)
  const [filter, setFilter] = useState("all");    // cross-line filter view (vision)
  const [bellOpen, setBellOpen] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/ghl/${encodeURIComponent(locationId)}/contacts`, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Proxy ${r.status}`))))
      .then((d) => live && setRows(d.contacts || []))
      .catch((e) => live && setErr(e.message));
    return () => { live = false; };
  }, [locationId]);

  // text search (real) + cross-line filter view (vision: deterministic subset by id hash)
  const filtered = useMemo(() => {
    const base = rows || [];
    const s = q.trim().toLowerCase();
    const bySearch = !s ? base : base.filter((c) =>
      [c.name, c.email, c.phone, (c.tags || []).join(" ")].join(" ").toLowerCase().includes(s));
    if (filter === "all") return bySearch;
    // vision: pick a stable pseudo-subset so each filter shows a different, consistent slice
    const mod = { health_no_tax: 0, medicare_no_life: 1, tax_no_advisory: 2, pc_eligible: 3 }[filter] ?? 0;
    return bySearch.filter((c) => (hashId(c.id) % 3) === (mod % 3));
  }, [rows, q, filter]);

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
            <div className="ti">Clients</div>
            <div className="sub">JN Insurance &amp; Consulting · select a client to open their 360 view</div>
          </div>
          <div className="topright">
            <div className="entity">
              <button className={entity === "all" ? "on" : ""} onClick={() => setEntity("all")}>All</button>
              <button className={entity === "insurance" ? "on" : ""} onClick={() => setEntity("insurance")}><Building2 size={12} /> Insurance</button>
              <button className={entity === "consulting" ? "on" : ""} onClick={() => setEntity("consulting")}><Building2 size={12} /> Consulting</button>
            </div>
            <div className="bell" onClick={() => setBellOpen((o) => !o)}>
              <Bell size={16} /><span className="dot" />
            </div>
          </div>
        </div>

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

        {/* Cross-line filter views (Julio's north star) */}
        <div className="filters">
          {FILTERS.map((f) => (
            <button key={f.key} className={`fchip ${filter === f.key ? "on" : ""}`} onClick={() => setFilter(f.key)}>
              {f.label}{f.demo && <span className="demo">demo</span>}
            </button>
          ))}
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
      </div>
    </div>
  );
}
