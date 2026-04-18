"use client";
import { useState, useEffect, useRef, useCallback } from "react";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [portrait, setPortrait] = useState(null);
  const [showPortrait, setShowPortrait] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [checking, setChecking] = useState(true);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  // Validate invite token on mount
  useEffect(() => {
    async function checkAccess() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("invite");

      if (token) {
        try {
          const res = await fetch("/api/invite/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          const data = await res.json();
          if (data.userId) {
            localStorage.setItem("verona-user-id", data.userId);
            localStorage.setItem("verona-invite", token);
            setUserId(data.userId);
            window.history.replaceState({}, "", "/");
            setChecking(false);
            return;
          }
        } catch (e) {
          console.error("Invite validation failed:", e);
        }
        setAccessDenied(true);
        setChecking(false);
        return;
      }

      const stored = localStorage.getItem("verona-user-id");
      const storedInvite = localStorage.getItem("verona-invite");
      if (stored && storedInvite) {
        setUserId(stored);
        setChecking(false);
        return;
      }

      setAccessDenied(true);
      setChecking(false);
    }
    checkAccess();
  }, []);

  // Load full history when userId is known
  useEffect(() => {
    if (!userId) return;
    async function loadHistory() {
      try {
        const res = await fetch("/api/messages?userId=" + userId);
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(
            data.messages.map((m) => ({
              role: m.role,
              content: m.content,
              created_at: m.created_at,
            }))
          );
        }
      } catch (e) {
        console.error("History load failed:", e);
      }
      setHistoryLoaded(true);
    }
    loadHistory();
  }, [userId]);

  // Scroll to bottom instantly when history first loads
  useEffect(() => {
    if (historyLoaded) {
      endRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [historyLoaded]);

  // Scroll to bottom smoothly on new messages (after history loaded)
  useEffect(() => {
    if (!historyLoaded) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start a session, returning its id and whether it was the first one
  async function startSession() {
    if (!userId) return { sid: null, first: false };
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "start" }),
      });
      const data = await res.json();
      if (data.session) {
        setSessionId(data.session.id);
        return { sid: data.session.id, first: !!data.isFirstSession };
      }
    } catch (e) {
      console.error("Session start failed:", e);
    }
    return { sid: null, first: false };
  }

  // Handle the splash-screen "Start talking" button.
  async function beginConversation() {
    if (loading || !userId) return;
    setLoading(true);
    const { sid, first } = await startSession();
    if (!sid) {
      setLoading(false);
      return;
    }
    setLoading(false);
    send("Hi Angelica", sid);
  }

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

  async function send(text, overrideSid) {
    if (!text.trim() || loading || !userId) return;

    let sid = overrideSid || sessionId;
    if (!sid) {
      const started = await startSession();
      sid = started.sid;
    }

    const userMsg = { role: "user", content: text, created_at: new Date().toISOString() };
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
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.text, created_at: new Date().toISOString() },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went quiet for a moment. Say that again?",
          created_at: new Date().toISOString(),
        },
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

  function formatDateLabel(iso) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    if (sameDay(d, today)) return "Today";
    if (sameDay(d, yesterday)) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  }

  // Messages grouped with date dividers
  function renderMessages() {
    const items = [];
    let lastLabel = null;
    messages.forEach((m, i) => {
      if (m.created_at) {
        const label = formatDateLabel(m.created_at);
        if (label !== lastLabel) {
          lastLabel = label;
          items.push(
            <div key={"div-" + i} style={S.dateDivider}>
              <span style={S.dateLabel}>{label}</span>
            </div>
          );
        }
      }
      items.push(
        <div key={i} style={m.role === "user" ? S.uRow : S.aRow}>
          <div style={m.role === "user" ? S.uBub : S.aBub}>{m.content}</div>
        </div>
      );
    });
    return items;
  }

  const empty = messages.length === 0;
  const showSplash = empty && historyLoaded;
  const showLoadingHistory = !historyLoaded && userId;

  if (checking) {
    return (
      <div style={S.wrap}>
        <div style={S.splash}>
          <div style={S.logo}>Verona</div>
          <div style={S.tag}>Find love worth dying for.</div>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div style={S.wrap}>
        <a href="/admin" style={{ position: "fixed", bottom: 16, left: 16, fontSize: 12, color: "#C4A08A", opacity: 0.6, textDecoration: "none", letterSpacing: 1, zIndex: 100, padding: "8px 12px" }}>admin</a>
        <div style={S.splash}>
          <div style={S.logo}>Verona</div>
          <div style={S.tag}>Find love worth dying for.</div>
          <div style={{ marginTop: 32, fontSize: 15, color: "#9B9590", maxWidth: 360, lineHeight: 1.6 }}>
            Angelica is available by invitation only. If someone shared a link with you, make sure you&apos;re using the full URL they sent.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.head}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={S.avatar}>A</div>
          <div>
            <div style={S.name}>Angelica</div>
            <div style={S.meta}>always here</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={S.msgs}>
          {showLoadingHistory && (
            <div style={S.splash}>
              <div style={{ ...S.tag, marginBottom: 0 }}>...</div>
            </div>
          )}

          {showSplash && (
            <div style={S.splash}>
              <div style={S.logo}>Verona</div>
              <div style={S.tag}>Find love worth dying for.</div>
              <button onClick={beginConversation} style={S.go} disabled={loading}>
                {loading ? "..." : "Start talking to Angelica"}
              </button>
            </div>
          )}

          {!empty && renderMessages()}

          {loading && !empty && (
            <div style={S.aRow}>
              <div style={S.wait}>&middot; &middot; &middot;</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

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
                ].map(([label, val]) =>
                  val != null && (
                    <div key={label} style={S.row}>
                      <span style={S.label}>{label}</span>
                      <div style={S.barOuter}>
                        <div style={{ ...S.barInner, width: `${(val / 10) * 100}%` }} />
                      </div>
                      <span style={S.val}>{val}</span>
                    </div>
                  )
                )}
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

      {/* Input bar — shown whenever user is known and history has loaded */}
      {userId && historyLoaded && !showSplash && (
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
            &#8593;
          </button>
        </div>
      )}
    </div>
  );
}

const S = {
  wrap: { display: "flex", flexDirection: "column", height: "100%", background: "#FFFFFF", fontFamily: "'DM Sans',sans-serif", color: "#2C2825" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #E8E4DF" },
  avatar: { width: 38, height: 38, borderRadius: "50%", background: "#C4A08A", color: "#FAF8F5", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 500, flexShrink: 0 },
  name: { fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 500, letterSpacing: "0.02em" },
  meta: { fontSize: 11, color: "#9B9590", marginTop: 1 },
  iconBtn: { background: "none", border: "1px solid #E8E4DF", borderRadius: 8, padding: "6px 14px", fontSize: 13, color: "#9B9590", cursor: "pointer" },
  msgs: { flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 6 },
  splash: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", position: "relative" },
  logo: { fontFamily: "'Cormorant Garamond',serif", fontSize: 52, fontWeight: 500, letterSpacing: "0.02em" },
  tag: { fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontStyle: "italic", color: "#9B9590", marginTop: 6, marginBottom: 48 },
  go: { background: "#2C2825", color: "#FAF8F5", border: "none", borderRadius: 28, padding: "14px 32px", fontSize: 15, cursor: "pointer" },
  dateDivider: { display: "flex", justifyContent: "center", margin: "12px 0 6px" },
  dateLabel: { fontSize: 11, color: "#9B9590", background: "#F0ECE8", borderRadius: 10, padding: "3px 12px", letterSpacing: "0.04em" },
  uRow: { display: "flex", justifyContent: "flex-end" },
  aRow: { display: "flex", justifyContent: "flex-start" },
  uBub: { background: "#2C2825", color: "#FAF8F5", padding: "12px 16px", borderRadius: "20px 20px 4px 20px", maxWidth: "80%", fontSize: 15, lineHeight: 1.55 },
  aBub: { padding: "12px 4px", maxWidth: "85%", fontSize: 17, lineHeight: 1.65, fontFamily: "'Cormorant Garamond',serif", whiteSpace: "pre-wrap" },
  wait: { padding: "12px 4px", fontSize: 22, color: "#C4A08A", fontFamily: "'Cormorant Garamond',serif", letterSpacing: 4 },
  bar: { display: "flex", alignItems: "center", padding: "12px 16px", paddingBottom: "max(16px, env(safe-area-inset-bottom))", gap: 10, borderTop: "1px solid #E8E4DF" },
  inp: { flex: 1, border: "1px solid #E8E4DF", borderRadius: 24, padding: "12px 18px", fontSize: 16, fontFamily: "'DM Sans',sans-serif", outline: "none", background: "#fff", color: "#2C2825" },
  snd: { background: "#2C2825", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", fontSize: 18, color: "#FAF8F5", display: "flex", alignItems: "center", justifyContent: "center" },
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
