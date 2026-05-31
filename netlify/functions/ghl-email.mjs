/* ============================================================================
   Netlify Function · /api/ghl/:locationId/contact/:id/email
   ----------------------------------------------------------------------------
   GET  → returns the contact's email thread (so the panel can show the stream)
   POST → sends an email via GHL ( POST /conversations/messages/outbound ),
          which lands in the contact's conversation thread.

   This is a WRITE that sends on the user's behalf — the React side gates it
   behind an explicit confirm step before calling POST.

   FROM ADDRESSES: GHL's public API has no "list verified sending addresses"
   endpoint, so the dropdown is populated from FROM_ADDRESSES below. Replace
   these with the sub-account's real verified addresses (health@, tax@, etc.).
   An unverified from-address will send but deliver poorly / may bounce.

   ENV: GHL_PIT. locationId + contactId from the path.
   ========================================================================== */

const GHL_BASE = "https://services.leadconnectorhq.com";
const VERSION  = "2021-07-28";          // contacts/conversations read
const MSG_VERSION = "2021-04-15";       // conversations send endpoint

/* ◀──────── REPLACE with the sub-account's VERIFIED sending addresses ──────── */
const FROM_ADDRESSES = [
  "health@jninsure.com",       // placeholder — replace with a real verified address
  "tax@jninsure.com",          // placeholder
  "julio@jninsure.com",        // placeholder
];

async function ghl(path, { method = "GET", body, version = VERSION } = {}) {
  const r = await fetch(`${GHL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GHL_PIT}`,
      Version: version,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!r.ok) throw new Error(`GHL ${r.status} on ${path}: ${text.slice(0, 200)}`);
  return data;
}
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

// Pull the email messages for a contact, newest first.
async function emailThread(loc, contactId) {
  const out = [];
  try {
    const s = await ghl(`/conversations/search?locationId=${loc}&contactId=${contactId}`);
    for (const c of (s.conversations || []).slice(0, 3)) {
      try {
        const m = await ghl(`/conversations/${c.id}/messages`);
        const msgs = m.messages?.messages || m.messages || [];
        for (const msg of msgs) {
          if (!String(msg.messageType || msg.type || "").toUpperCase().includes("EMAIL")) continue;
          out.push({
            direction: String(msg.direction || "").toLowerCase() === "outbound" ? "out" : "in",
            subject: msg.subject || msg.meta?.email?.subject || "(no subject)",
            snippet: (msg.body || "").toString().replace(/<[^>]+>/g, " ").slice(0, 200),
            date: msg.dateAdded || msg.dateUpdated || "",
            _ts: Date.parse(msg.dateAdded || msg.dateUpdated || 0) || 0,
          });
        }
      } catch (_) {}
    }
  } catch (_) {}
  out.sort((a, b) => b._ts - a._ts);
  return out;
}

export default async (req, context) => {
  const loc = context.params?.locationId, id = context.params?.id;
  if (!loc || !id) return json({ error: "missing locationId or contact id" }, 400);

  // GET → thread + the from-address options for the dropdown
  if (req.method === "GET") {
    const thread = await emailThread(loc, id);
    return json({ fromAddresses: FROM_ADDRESSES, thread });
  }

  // POST → send
  if (req.method === "POST") {
    let p; try { p = await req.json(); } catch { return json({ error: "bad json" }, 400); }
    const { emailFrom, emailSubject, emailBody, emailTo } = p || {};
    if (!emailFrom || !emailSubject || !emailBody)
      return json({ error: "emailFrom, emailSubject, emailBody required" }, 422);
    if (!FROM_ADDRESSES.includes(emailFrom))
      return json({ error: "emailFrom must be one of the configured verified addresses" }, 422);

    try {
      const res = await ghl(`/conversations/messages/outbound`, {
        method: "POST", version: MSG_VERSION,
        body: {
          type: "Email", contactId: id,
          emailFrom, emailSubject,
          emailBody, ...(emailTo ? { emailTo } : {}),
        },
      });
      const thread = await emailThread(loc, id);
      return json({ ok: true, messageId: res.messageId || res.id || null, thread });
    } catch (e) {
      return json({ error: String(e.message || e) }, 502);
    }
  }

  return json({ error: "method not allowed" }, 405);
};

export const config = { path: "/api/ghl/:locationId/contact/:id/email" };
