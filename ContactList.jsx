import { useEffect, useMemo, useState } from "react";
import { Search, ChevronRight } from "lucide-react";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap');
.cl{--cream:#F4F1E8;--paper:#fff;--teal:#1F4D4A;--ink:#1A1A1A;--ink2:#4A4A48;--muted:#7A7A75;--line:rgba(26,26,26,.1);
  --serif:'Newsreader',Georgia,serif;--sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;
  font-family:var(--sans);background:var(--cream);min-height:100%;padding:22px;box-sizing:border-box;color:var(--ink);}
.cl *{box-sizing:border-box;}
.cl .wrap{max-width:760px;margin:0 auto;}
.cl .hd{margin-bottom:18px;}
.cl .ti{font-family:var(--serif);font-size:26px;font-weight:500;}
.cl .sub{color:var(--ink2);font-size:13px;margin-top:3px;}
.cl .search{margin-top:16px;display:flex;align-items:center;gap:9px;background:var(--paper);
  border:1px solid var(--line);border-radius:7px;padding:10px 13px;color:var(--muted);}
.cl .search input{border:0;outline:0;flex:1;font-size:14px;color:var(--ink);background:transparent;font-family:var(--sans);}
.cl .msg{color:var(--muted);font-size:13px;padding:20px 2px;}
.cl .list{display:flex;flex-direction:column;gap:8px;}
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
`;

const initials = (n) =>
  (n || "?").split(/\s+/).slice(0, 2).map((x) => x[0] || "").join("").toUpperCase();

export default function ContactList({ locationId, onSelect }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let live = true;
    fetch(`/api/ghl/${encodeURIComponent(locationId)}/contacts`, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Proxy ${r.status}`))))
      .then((d) => live && setRows(d.contacts || []))
      .catch((e) => live && setErr(e.message));
    return () => { live = false; };
  }, [locationId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows || [];
    return (rows || []).filter((c) =>
      [c.name, c.email, c.phone, (c.tags || []).join(" ")].join(" ").toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <div className="cl">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="hd">
          <div className="ti">Clients</div>
          <div className="sub">JN Insurance &amp; Consulting · select a client to open their 360 view</div>
          <div className="search">
            <Search size={15} />
            <input
              placeholder="Search name, email, phone, tag…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
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
