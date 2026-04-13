"use client";
import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [portrait, setPortrait] = useState(null);
  const [showPortrait, setShowPortrait] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  // Create or retrieve user on mount
  useEffect(() => {
    let stored = localStorage.getItem("verona-user-id");
    if (!stored) {
      stored = crypto.randomUUID();
      localStorage.setItem("verona-user-id", stored);
    }
    setUserId(stored);
  }, []);

  // Start a session when user is ready
  async function startSession() {
    if (!userId) return null;
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "start" }),
      });
      const data = await res.json();
      if (data.session) {
        setSessionId(data.session.id);
        return data.session.id;
      }
    } catch (e) {
      console.error("Session start failed:", e);
    }
    return null;
  }

  // Scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Refresh portrait data periodically
  useEffect(() => {
    if (!userId || messages.length === 0) return;
    const timer = setTimeout(() => fetchPortrait(), 3000);
    return () => clearTimeout(timer);
  }, [messages, userId]);

  async function fetchPortrait() {
    if (!userId) return;
    try {
      const res = await fetch(`/api/portrait?userId=${userId}`);
      const data = await res.json();
      if (!data.error) setPortrait(data);
    } catch (e) {
      console.error("Portrait fetch failed:", e);
    }
  }

  async function send(text) {
    if (!text.trim() || loading || !userId) return;

    // Ensure we have a session
    let sid = sessionId;
    if (!sid) {
      sid = await startSession();
    }

    const userMsg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
          userId,
          sessionId: sid,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went quiet for a moment. Say that again?" },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  async function newConversation() {
    setMessages([]);
    setSessionId(null);
    setPortrait(null);
  }

  const empty = messages.length === 0;

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.head}>
        <div>
          <div style={S.name}>Angelica</div>
          {!empty && <div style={S.meta}>{Math.ceil(messages.length / 2)} exchanges</div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!empty && (
            <>
              <button onClick={() => { setShowPortrait(!showPortrait); if (!showPortrait) fetchPortrait(); }} style={S.iconBtn} title="Portrait">◐</button>
              <button onClick={newConversation} style={S.iconBtn}>New</button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Messages */}
        <div style={S.msgs}>
          {empty && (
            <div style={S.splash}>
              <div style={S.logo}>Verona</div>
              <div style={S.tag}>Find love worth dying for.</div>
              <button onClick={() => send("Hi")} style={S.go}>
                Start talking to Angelica
              </button>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={m.role === "user" ? S.uRow : S.aRow}>
              <div style={m.role === "user" ? S.uBub : S.aBub}>{m.content}</div>
            </div>
          ))}

          {loading && (
            <div style={S.aRow}>
              <div style={S.wait}>· · ·</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Portrait Panel */}
        {showPortrait && portrait && (
          <div style={S.panel}>
            <div style={S.panelTitle}>Portrait</div>

            {portrait.scores && (
              <div style={S.section}>
                <div style={S.sectionTitle}>Scores</div>
                {[
                  ["Trust", portrait.scores.trust_score],
                  ["Depth", portrait.scores.depth_score],
                  ["Readiness", portrait.scores.readiness_score],
                  ["Self-knowledge gap", portrait.scores.self_knowledge_gap],
                  ["Emotional availability", portrait.scores.emotional_availability],
                ].map(([label, val]) => val != null && (
                  <div key={label} style={S.row}>
                    <span style={S.label}>{label}</span>
                    <div style={S.barOuter}><div style={{ ...S.barInner, width: `${(val / 10) * 100}%` }} /></div>
                    <span style={S.val}>{val}</span>
                  </div>
                ))}
              </div>
            )}

            {portrait.dimensions?.length > 0 && (
              <div style={S.section}>
                <div style={S.sectionTitle}>Dimensions ({portrait.dimensions.length})</div>
                {portrait.dimensions.slice(0, 15).map((d) => (
                  <div key={d.dimension_name} style={S.dimRow}>
                    <span style={S.dimName}>{d.dimension_name}</span>
                    <span style={S.dimVal}>
                      S:{d.stated_position || "—"} R:{d.revealed_position || "—"} · {d.resolution}
                    </span>
                  </div>
                ))}
                {portrait.dimensions.length > 15 && (
                  <div style={S.dimVal}>+{portrait.dimensions.length - 15} more</div>
                )}
              </div>
            )}

            {portrait.hypotheses?.length > 0 && (
              <div style={S.section}>
                <div style={S.sectionTitle}>Hypotheses</div>
                {portrait.hypotheses.map((h, i) => (
                  <div key={i} style={S.itemText}>{h.text}</div>
                ))}
              </div>
            )}

            {portrait.fragments?.length > 0 && (
              <div style={S.section}>
                <div style={S.sectionTitle}>Fragments</div>
                {portrait.fragments.map((f, i) => (
                  <div key={i} style={S.itemText}>"{f.text}"</div>
                ))}
              </div>
            )}

            {portrait.territory?.length > 0 && (
              <div style={S.section}>
                <div style={S.sectionTitle}>Territory</div>
                {portrait.territory.map((t) => (
                  <div key={t.territory} style={S.row}>
                    <span style={S.label}>{t.territory}</span>
                    <span style={S.val}>{t.depth}/5</span>
                  </div>
                ))}
              </div>
            )}

            {portrait.essentialTruth && (
              <div style={S.section}>
                <div style={S.sectionTitle}>Essential Truth</div>
                <div style={{ ...S.itemText, fontStyle: "italic" }}>{portrait.essentialTruth}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      {!empty && (
        <div style={S.bar}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Say something..."
            style={S.inp}
            disabled={loading}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            style={{ ...S.snd, opacity: loading || !input.trim() ? 0.3 : 1 }}
          >
            ↑
          </button>
        </div>
      )}
    </div>
  );
}

const S = {
  wrap: { display: "flex", flexDirection: "column", height: "100vh", background: "#FAF8F5", fontFamily: "'DM Sans',sans-serif", color: "#2C2825" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #E8E4DF" },
  name: { fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 500, letterSpacing: "0.02em" },
  meta: { fontSize: 12, color: "#9B9590", marginTop: 2 },
  iconBtn: { background: "none", border: "1px solid #E8E4DF", borderRadius: 8, padding: "6px 14px", fontSize: 13, color: "#9B9590", cursor: "pointer" },
  msgs: { flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 6 },
  splash: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center" },
  logo: { fontFamily: "'Cormorant Garamond',serif", fontSize: 52, fontWeight: 500, letterSpacing: "0.02em" },
  tag: { fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontStyle: "italic", color: "#9B9590", marginTop: 6, marginBottom: 48 },
  go: { background: "#2C2825", color: "#FAF8F5", border: "none", borderRadius: 28, padding: "14px 32px", fontSize: 15, cursor: "pointer" },
  uRow: { display: "flex", justifyContent: "flex-end" },
  aRow: { display: "flex", justifyContent: "flex-start" },
  uBub: { background: "#2C2825", color: "#FAF8F5", padding: "12px 16px", borderRadius: "20px 20px 4px 20px", maxWidth: "80%", fontSize: 15, lineHeight: 1.55 },
  aBub: { padding: "12px 4px", maxWidth: "85%", fontSize: 17, lineHeight: 1.65, fontFamily: "'Cormorant Garamond',serif", whiteSpace: "pre-wrap" },
  wait: { padding: "12px 4px", fontSize: 22, color: "#C4A08A", fontFamily: "'Cormorant Garamond',serif", letterSpacing: 4 },
  bar: { display: "flex", alignItems: "center", padding: "12px 16px 24px", gap: 10, borderTop: "1px solid #E8E4DF" },
  inp: { flex: 1, border: "1px solid #E8E4DF", borderRadius: 24, padding: "12px 18px", fontSize: 15, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff", color: "#2C2825" },
  snd: { background: "#2C2825", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", fontSize: 18, color: "#FAF8F5", display: "flex", alignItems: "center", justifyContent: "center" },
  // Portrait panel
  panel: { width: 320, borderLeft: "1px solid #E8E4DF", overflowY: "auto", padding: "16px", background: "#fff", flexShrink: 0 },
  panelTitle: { fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 500, marginBottom: 16 },
  section: { marginBottom: 16, paddingTop: 12, borderTop: "1px solid #F0ECE8" },
  sectionTitle: { fontSize: 11, fontWeight: 500, color: "#C4A08A", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 },
  row: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13 },
  label: { minWidth: 100, fontWeight: 500, fontSize: 12 },
  val: { fontSize: 12, color: "#9B9590", minWidth: 24, textAlign: "right" },
  barOuter: { flex: 1, height: 4, background: "#F0ECE8", borderRadius: 2, overflow: "hidden" },
  barInner: { height: "100%", background: "#C4A08A", borderRadius: 2, transition: "width 0.5s ease" },
  dimRow: { display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 },
  dimName: { fontWeight: 500 },
  dimVal: { color: "#9B9590", fontSize: 11 },
  itemText: { fontSize: 13, color: "#5C5550", lineHeight: 1.5, marginBottom: 6 },
};
