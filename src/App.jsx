import { useState } from "react";
import ContactList from "./ContactList";
import UnifiedContactView, { makeGhlAdapter } from "./UnifiedContactView";

// Sub-account this build serves. Path-based, so swap per franchise later.
const LOCATION_ID = "5awBlPxYQVQGyd1XudNB";

export default function App() {
  // Deep-link support: .../?contactId=<id> opens straight to that client.
  const initial = new URLSearchParams(window.location.search).get("contactId");
  const [selected, setSelected] = useState(initial || null);

  // Detail pulls live data (real identity/household/Health/docs/email activity);
  // the function adds the vision layer, and a fetch failure falls back to the
  // built-in mock so it never breaks on screen.
  const adapter = makeGhlAdapter(LOCATION_ID);

  if (!selected) {
    return <ContactList locationId={LOCATION_ID} onSelect={setSelected} />;
  }

  return (
    <div style={{ background: "#F4F1E8", minHeight: "100%" }}>
      <button
        onClick={() => setSelected(null)}
        style={{
          margin: "16px 22px 0", padding: "7px 14px", cursor: "pointer",
          border: "1px solid rgba(26,26,26,.15)", background: "#fff", borderRadius: 5,
          fontSize: 13, color: "#1A1A1A",
          fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif",
        }}
      >
        ← All clients
      </button>
      <UnifiedContactView contactId={selected} adapter={adapter} />
    </div>
  );
}
