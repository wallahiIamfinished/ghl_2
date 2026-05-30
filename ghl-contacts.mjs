/* ============================================================================
   Netlify Function · /api/ghl/:locationId/contacts
   Live client list for the picker. Returns a slim, render-ready array.
   Same PIT/env as ghl-contact.mjs; token stays server-side.
   ========================================================================== */

const GHL_BASE = "https://services.leadconnectorhq.com";
const VERSION  = "2021-07-28";

async function ghl(path) {
  const r = await fetch(`${GHL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${process.env.GHL_PIT}`, Version: VERSION, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`GHL ${r.status} on ${path}`);
  return r.json();
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}

export default async (req, context) => {
  const loc = context.params?.locationId;
  if (!loc) return json({ error: "missing locationId" }, 400);
  try {
    // GHL contacts list. If this returns empty/422, the casing may differ —
    // the contacts endpoint expects camelCase `locationId`.
    const data = await ghl(`/contacts/?locationId=${encodeURIComponent(loc)}&limit=100`);
    const contacts = (data.contacts || []).map((c) => ({
      id: c.id,
      name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.contactName || c.email || c.id,
      email: c.email || "",
      phone: c.phone || "",
      tags: c.tags || [],
    }));
    return json({ contacts });
  } catch (e) {
    return json({ error: String(e.message || e) }, 502);
  }
};

export const config = { path: "/api/ghl/:locationId/contacts" };
