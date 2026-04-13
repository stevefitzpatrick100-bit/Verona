"use client";
import { useState, useEffect, useCallback } from "react";

export default function Admin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [invites, setInvites] = useState([]);
  const [newInviteName, setNewInviteName] = useState("");
  const [showInvites, setShowInvites] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin-pw");
    if (saved) { setPassword(saved); setAuthed(true); }
  }, []);

  const fetchData = useCallback(async () => {
    const pw = sessionStorage.getItem("admin-pw");
    if (!pw) return;
    try {
      const res = await fetch("/api/admin", { headers: { authorization: pw } });
      if (res.status === 401) { setAuthed(false); sessionStorage.removeItem("admin-pw"); setError("Wrong password"); return; }
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { if (authed) fetchData(); }, [authed, fetchData]);

  const fetchInvites = useCallback(async () => {
    const pw = sessionStorage.getItem("admin-pw");
    if (!pw) return;
    try {
      const res = await fetch("/api/invite", { headers: { authorization: pw } });
      const json = await res.json();
      if (json.invites) setInvites(json.invites);
    } catch (e) { console.error("Invite fetch failed:", e); }
  }, []);

  useEffect(() => { if (authed) fetchInvites(); }, [authed, fetchInvites]);

  async function createInvite() {
    if (!newInviteName.trim()) return;
    const pw = sessionStorage.getItem("admin-pw");
    await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: pw },
      body: JSON.stringify({ name: newInviteName.trim() }),
    });
    setNewInviteName("");
    fetchInvites();
  }

  async function deleteInvite(id) {
    const pw = sessionStorage.getItem("admin-pw");
    await fetch("/api/invite", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", authorization: pw },
      body: JSON.stringify({ id }),
    });
    fetchInvites();
  }

  useEffect(() => {
    if (!autoRefresh || !authed) return;
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, authed, fetchData]);

  if (!authed) {
    return (
      <div style={S.page}>
        <div style={S.loginBox}>
          <div style={S.title}>Mission Control</div>
          <form onSubmit={(e) => { e.preventDefault(); sessionStorage.setItem("admin-pw", password); setAuthed(true); setError(null); }} style={{ marginTop: 20 }}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" style={S.input} autoFocus />
            <button type="submit" style={{ ...S.btn, marginTop: 12, width: "100%" }}>Enter</button>
          </form>
          {error && <div style={{ color: "#e74c3c", marginTop: 12, fontSize: 12 }}>{error}</div>}
        </div>
      </div>
    );
  }

  if (error) return <div style={S.page}><div style={S.error}>Error: {error}</div></div>;
  if (!data) return <div style={S.page}><div style={S.loading}>Loading mission control...</div></div>;

  const userSessions = selectedUser
    ? data.sessions.filter((s) => s.user_id === selectedUser)
    : data.sessions;

  const sessionMessages = selectedSession
    ? data.messages.filter((m) => m.session_id === selectedSession).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    : [];

  const userDims = selectedUser ? data.dimensions.filter((d) => d.user_id === selectedUser) : data.dimensions;
  const userFragments = selectedUser ? data.fragments.filter((f) => f.user_id === selectedUser) : data.fragments;
  const userHypotheses = selectedUser ? data.hypotheses.filter((h) => h.user_id === selectedUser) : data.hypotheses;
  const userScores = selectedUser ? data.scores.filter((s) => s.user_id === selectedUser) : data.scores;
  const userMoments = selectedUser ? data.keyMoments.filter((m) => m.user_id === selectedUser) : data.keyMoments;
  const userSilences = selectedUser ? data.silences.filter((s) => s.user_id === selectedUser) : data.silences;
  const userTerritory = selectedUser ? data.territory.filter((t) => t.user_id === selectedUser) : data.territory;
  const userTruth = selectedUser ? data.essentialTruth.filter((t) => t.user_id === selectedUser) : data.essentialTruth;

  function timeAgo(ts) {
    if (!ts) return "—";
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div style={S.page}>
      {/* Top bar */}
      <div style={S.topBar}>
        <div style={S.title}>Mission Control</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => setAutoRefresh(!autoRefresh)} style={{ ...S.btn, background: autoRefresh ? "#C4A08A" : "#E8E4DF" }}>
            {autoRefresh ? "● Live" : "○ Paused"}
          </button>
          <button onClick={fetchData} style={S.btn}>Refresh</button>
          <button onClick={() => setShowInvites(!showInvites)} style={{ ...S.btn, background: showInvites ? "#C4A08A" : "#E8E4DF" }}>Invites</button>
          <a href="/" style={{ ...S.btn, textDecoration: "none" }}>← App</a>
        </div>
      </div>

      {/* Stats row */}
      <div style={S.statsRow}>
        <Stat label="Users" value={data.users.length} />
        <Stat label="Sessions" value={data.sessions.length} />
        <Stat label="Messages" value={data.messages.length} />
        <Stat label="Dimensions" value={data.dimensions.length} />
        <Stat label="Fragments" value={data.fragments.length} />
        <Stat label="Hypotheses" value={data.hypotheses.length} />
      </div>

      {/* Invites panel */}
      {showInvites && (
        <div style={S.invitePanel}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              value={newInviteName}
              onChange={(e) => setNewInviteName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createInvite()}
              placeholder="Name (e.g. Tracey)"
              style={S.input}
            />
            <button onClick={createInvite} style={S.btn}>Create Invite</button>
          </div>
          {invites.length === 0 && <div style={S.empty}>No invites yet</div>}
          {invites.map((inv) => (
            <div key={inv.id} style={S.inviteRow}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 500 }}>{inv.name}</span>
                <span style={{ color: "#888", fontSize: 11, marginLeft: 8 }}>
                  {inv.used_at ? `Used ${timeAgo(inv.used_at)}` : "Not used"}
                </span>
              </div>
              <input
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/?invite=${inv.token}`}
                style={{ ...S.input, flex: 2, fontSize: 11, cursor: "text" }}
                onClick={(e) => { e.target.select(); navigator.clipboard.writeText(e.target.value); }}
              />
              <button onClick={() => deleteInvite(inv.id)} style={{ ...S.btn, background: "#433", color: "#e74c3c", fontSize: 11 }}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={S.columns}>
        {/* Left: Users & Sessions */}
        <div style={S.col}>
          <div style={S.sectionTitle}>
            Users
            {selectedUser && (
              <button onClick={() => { setSelectedUser(null); setSelectedSession(null); }} style={S.clearBtn}>Show all</button>
            )}
          </div>
          {data.users.map((u) => (
            <div
              key={u.id}
              onClick={() => { setSelectedUser(u.id); setSelectedSession(null); }}
              style={{ ...S.card, borderLeft: selectedUser === u.id ? "3px solid #C4A08A" : "3px solid transparent" }}
            >
              <div style={S.cardTitle}>{u.display_name || u.id.slice(0, 8)}</div>
              <div style={S.cardMeta}>
                Created {timeAgo(u.created_at)} · {data.sessions.filter((s) => s.user_id === u.id).length} sessions
              </div>
            </div>
          ))}
          {data.users.length === 0 && <div style={S.empty}>No users yet</div>}

          <div style={{ ...S.sectionTitle, marginTop: 20 }}>
            Sessions {selectedUser && `(${userSessions.length})`}
          </div>
          {userSessions.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelectedSession(s.id)}
              style={{ ...S.card, borderLeft: selectedSession === s.id ? "3px solid #C4A08A" : "3px solid transparent" }}
            >
              <div style={S.cardTitle}>
                Session #{s.session_number} · <span style={S.phase}>{s.phase}</span>
              </div>
              <div style={S.cardMeta}>
                {timeAgo(s.started_at)} {s.ended_at ? `· ended ${timeAgo(s.ended_at)}` : "· active"}
              </div>
              <div style={S.cardMeta}>
                {data.messages.filter((m) => m.session_id === s.id).length} messages
              </div>
            </div>
          ))}
          {userSessions.length === 0 && <div style={S.empty}>No sessions</div>}
        </div>

        {/* Middle: Messages */}
        <div style={S.col}>
          <div style={S.sectionTitle}>
            {selectedSession ? "Conversation" : "Select a session to view messages"}
          </div>
          {selectedSession && (
            <div style={S.messageList}>
              {sessionMessages.map((m) => (
                <div key={m.id} style={m.role === "user" ? S.msgUser : S.msgAssistant}>
                  <div style={S.msgRole}>{m.role}</div>
                  <div style={S.msgContent}>{m.content}</div>
                  <div style={S.msgTime}>{timeAgo(m.created_at)}</div>
                </div>
              ))}
              {sessionMessages.length === 0 && <div style={S.empty}>No messages in this session</div>}
            </div>
          )}
        </div>

        {/* Right: Portrait data */}
        <div style={S.col}>
          <div style={S.sectionTitle}>Portrait Data {selectedUser && `(${data.users.find(u => u.id === selectedUser)?.id.slice(0,8)})`}</div>

          {/* Scores */}
          {userScores.length > 0 && (
            <div style={S.dataSection}>
              <div style={S.dataTitle}>Scores</div>
              {userScores.slice(0, 1).map((s) => (
                <div key={s.id}>
                  {[["Trust", s.trust_score], ["Depth", s.depth_score], ["Readiness", s.readiness_score], ["Self-knowledge gap", s.self_knowledge_gap], ["Emotional avail.", s.emotional_availability]].map(([label, val]) => (
                    val != null && <div key={label} style={S.scoreRow}>
                      <span style={S.scoreLabel}>{label}</span>
                      <div style={S.barOuter}><div style={{ ...S.barInner, width: `${(val / 10) * 100}%` }} /></div>
                      <span style={S.scoreVal}>{val}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Dimensions */}
          {userDims.length > 0 && (
            <div style={S.dataSection}>
              <div style={S.dataTitle}>Dimensions ({userDims.length})</div>
              {userDims.slice(0, 20).map((d) => (
                <div key={d.id} style={S.dimRow}>
                  <span style={S.dimName}>{d.dimension_name}</span>
                  <span style={S.dimMeta}>
                    S:{d.stated_position || "—"} R:{d.revealed_position || "—"} [{d.resolution}] c{d.confidence}
                  </span>
                </div>
              ))}
              {userDims.length > 20 && <div style={S.dimMeta}>+{userDims.length - 20} more</div>}
            </div>
          )}

          {/* Fragments */}
          {userFragments.length > 0 && (
            <div style={S.dataSection}>
              <div style={S.dataTitle}>Fragments ({userFragments.length})</div>
              {userFragments.slice(0, 10).map((f) => (
                <div key={f.id} style={S.fragment}>
                  <div>"{f.text}"</div>
                  {f.context && <div style={S.fragmentCtx}>Context: {f.context}</div>}
                  <div style={S.fragmentCtx}>Session {f.session_number} · {timeAgo(f.created_at)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Hypotheses */}
          {userHypotheses.length > 0 && (
            <div style={S.dataSection}>
              <div style={S.dataTitle}>Hypotheses ({userHypotheses.length})</div>
              {userHypotheses.map((h) => (
                <div key={h.id} style={S.hypothesis}>
                  <span style={S.hStatus}>{h.status}</span> {h.text}
                </div>
              ))}
            </div>
          )}

          {/* Key Moments */}
          {userMoments.length > 0 && (
            <div style={S.dataSection}>
              <div style={S.dataTitle}>Key Moments</div>
              {userMoments.map((m) => (
                <div key={m.id} style={S.fragment}>
                  <span style={S.hStatus}>{m.moment_type}</span> {m.description}
                </div>
              ))}
            </div>
          )}

          {/* Silences */}
          {userSilences.length > 0 && (
            <div style={S.dataSection}>
              <div style={S.dataTitle}>Silences</div>
              {userSilences.map((s) => (
                <div key={s.id} style={S.dimRow}>
                  <span style={S.dimName}>{s.topic}</span>
                  <span style={S.dimMeta}>absent {s.sessions_absent} sessions</span>
                </div>
              ))}
            </div>
          )}

          {/* Territory */}
          {userTerritory.length > 0 && (
            <div style={S.dataSection}>
              <div style={S.dataTitle}>Territory</div>
              {userTerritory.map((t) => (
                <div key={t.id} style={S.scoreRow}>
                  <span style={S.scoreLabel}>{t.territory}</span>
                  <span style={S.scoreVal}>{t.depth}/5</span>
                </div>
              ))}
            </div>
          )}

          {/* Essential Truth */}
          {userTruth.length > 0 && userTruth[0]?.text && (
            <div style={S.dataSection}>
              <div style={S.dataTitle}>Essential Truth</div>
              <div style={{ ...S.fragment, fontStyle: "italic" }}>{userTruth[0].text}</div>
            </div>
          )}

          {userScores.length === 0 && userDims.length === 0 && userFragments.length === 0 && (
            <div style={S.empty}>No portrait data yet{selectedUser ? "" : " — select a user"}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={S.stat}>
      <div style={S.statValue}>{value}</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", background: "#1a1a1a", color: "#e0ddd8", fontFamily: "'DM Sans',sans-serif", fontSize: 13 },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #333" },
  title: { fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 500, color: "#C4A08A" },
  btn: { background: "#E8E4DF", color: "#2C2825", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontWeight: 500 },
  clearBtn: { background: "none", border: "none", color: "#C4A08A", cursor: "pointer", fontSize: 11, marginLeft: 8 },
  statsRow: { display: "flex", gap: 1, padding: "0 24px", borderBottom: "1px solid #333" },
  stat: { flex: 1, padding: "16px 12px", textAlign: "center" },
  statValue: { fontSize: 28, fontWeight: 600, color: "#C4A08A", fontFamily: "'Cormorant Garamond',serif" },
  statLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginTop: 4 },
  columns: { display: "flex", height: "calc(100vh - 130px)" },
  col: { flex: 1, overflowY: "auto", padding: "16px", borderRight: "1px solid #333" },
  sectionTitle: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#C4A08A", marginBottom: 12, display: "flex", alignItems: "center" },
  card: { background: "#222", borderRadius: 8, padding: "10px 12px", marginBottom: 6, cursor: "pointer", transition: "background 0.15s" },
  cardTitle: { fontSize: 13, fontWeight: 500 },
  cardMeta: { fontSize: 11, color: "#888", marginTop: 2 },
  phase: { color: "#C4A08A", fontWeight: 400 },
  empty: { color: "#666", fontStyle: "italic", fontSize: 12, padding: 12 },
  loading: { padding: 40, textAlign: "center", color: "#888" },
  error: { padding: 40, textAlign: "center", color: "#e74c3c" },
  messageList: { display: "flex", flexDirection: "column", gap: 8 },
  msgUser: { background: "#2a2520", borderRadius: 8, padding: "8px 12px", borderLeft: "3px solid #555" },
  msgAssistant: { background: "#1e2520", borderRadius: 8, padding: "8px 12px", borderLeft: "3px solid #C4A08A" },
  msgRole: { fontSize: 10, textTransform: "uppercase", color: "#888", letterSpacing: "0.06em", marginBottom: 4 },
  msgContent: { fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" },
  msgTime: { fontSize: 10, color: "#666", marginTop: 4 },
  dataSection: { marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #333" },
  dataTitle: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#C4A08A", marginBottom: 8 },
  scoreRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  scoreLabel: { minWidth: 100, fontSize: 11, color: "#aaa" },
  scoreVal: { fontSize: 12, color: "#C4A08A", fontWeight: 600, minWidth: 24, textAlign: "right" },
  barOuter: { flex: 1, height: 4, background: "#333", borderRadius: 2, overflow: "hidden" },
  barInner: { height: "100%", background: "#C4A08A", borderRadius: 2 },
  dimRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3, padding: "2px 0" },
  dimName: { fontSize: 12 },
  dimMeta: { fontSize: 10, color: "#888" },
  fragment: { background: "#252525", borderRadius: 6, padding: "8px 10px", marginBottom: 6, fontSize: 12, lineHeight: 1.5 },
  fragmentCtx: { fontSize: 10, color: "#888", marginTop: 3 },
  hypothesis: { fontSize: 12, marginBottom: 6, lineHeight: 1.5 },
  hStatus: { display: "inline-block", background: "#333", color: "#C4A08A", borderRadius: 4, padding: "1px 6px", fontSize: 10, marginRight: 6 },
  loginBox: { width: 300, margin: "120px auto", textAlign: "center" },
  input: { width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #444", background: "#222", color: "#e0ddd8", fontSize: 14, outline: "none", boxSizing: "border-box" },
  invitePanel: { padding: "16px 24px", borderBottom: "1px solid #333", background: "#1e1e1e" },
  inviteRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "6px 0" },
};
