"use client";
import { useState, useEffect, useCallback, useMemo } from "react";

// =====================================================================
// VERONA — Admin
// Three views + Invites. See Verona_Admin_PRD_v1.md for the purpose.
// This version adds an inviter-name field to the Invites tab.
// =====================================================================

function timeAgo(ts) {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function durationMin(startedAt, endedAt) {
  if (!startedAt) return null;
  const end = endedAt ? new Date(endedAt) : new Date();
  return Math.round((end - new Date(startedAt)) / 60000);
}

function userStatus(lastActiveTs) {
  if (!lastActiveTs) return { label: "never", color: "#555" };
  const days = (Date.now() - new Date(lastActiveTs).getTime()) / 86400000;
  if (days < 3) return { label: "active", color: "#7cb87c" };
  if (days < 14) return { label: "recent", color: "#d4a84a" };
  return { label: "dormant", color: "#555" };
}

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("conversations");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [newInviteName, setNewInviteName] = useState("");
  const [newInviterName, setNewInviterName] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("admin-pw");
    if (saved) { setPassword(saved); setAuthed(true); }
  }, []);

  const fetchData = useCallback(async () => {
    const pw = sessionStorage.getItem("admin-pw");
    if (!pw) return;
    try {
      const res = await fetch("/api/admin", { headers: { authorization: pw } });
      if (res.status === 401) {
        setAuthed(false); sessionStorage.removeItem("admin-pw");
        setError("Wrong password"); return;
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json); setError(null);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { if (authed) fetchData(); }, [authed, fetchData]);

  async function createInvite() {
    if (!newInviteName.trim()) return;
    const pw = sessionStorage.getItem("admin-pw");
    await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: pw },
      body: JSON.stringify({
        name: newInviteName.trim(),
        inviter_name: newInviterName.trim() || null,
      }),
    });
    setNewInviteName("");
    setNewInviterName("");
    fetchData();
  }
  async function deleteInvite(id) {
    const pw = sessionStorage.getItem("admin-pw");
    await fetch("/api/invite", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", authorization: pw },
      body: JSON.stringify({ id }),
    });
    fetchData();
  }

  if (!authed) {
    return (
      <div style={S.page}>
        <div style={S.loginBox}>
          <div style={S.title}>Mission Control</div>
          <form onSubmit={(e) => { e.preventDefault(); sessionStorage.setItem("admin-pw", password); setAuthed(true); setError(null); }} style={{ marginTop: 20 }}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" style={S.input} autoFocus />
            <button type="submit" style={{ ...S.btn, marginTop: 12, width: "100%" }}>Enter</button>
          </form>
          {error && <div style={{ color: "#E24B4A", marginTop: 12, fontSize: 12 }}>{error}</div>}
        </div>
      </div>
    );
  }

  if (error) return <div style={S.page}><div style={S.errorBox}>Error: {error}</div></div>;
  if (!data) return <div style={S.page}><div style={S.loadingBox}>Loading mission control...</div></div>;

  const currentUser = selectedUserId ? data.users.find((u) => u.id === selectedUserId) : null;
  const currentSession = selectedSessionId ? data.sessions.find((s) => s.id === selectedSessionId) : null;

  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <div style={S.title}>Mission Control</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={fetchData} style={S.btn}>Refresh</button>
          <a href="/" style={{ ...S.btn, textDecoration: "none" }}>← App</a>
        </div>
      </div>

      <div style={S.tabBar}>
        <button onClick={() => setTab("conversations")} style={{ ...S.tab, ...(tab === "conversations" ? S.tabActive : {}) }}>Conversations</button>
        <button onClick={() => setTab("invites")} style={{ ...S.tab, ...(tab === "invites" ? S.tabActive : {}) }}>Invites</button>
      </div>

      {tab === "conversations" && (
        <>
          <div style={S.crumb}>
            <span onClick={() => { setSelectedUserId(null); setSelectedSessionId(null); }} style={S.crumbLink}>Adoption</span>
            {currentUser && (
              <>
                <span style={S.crumbSep}>›</span>
                <span onClick={() => setSelectedSessionId(null)} style={S.crumbLink}>
                  {currentUser.display_name || currentUser.id.slice(0, 8)}
                </span>
              </>
            )}
            {currentSession && (
              <>
                <span style={S.crumbSep}>›</span>
                <span style={{ ...S.crumbLink, color: "#e0ddd8", cursor: "default" }}>
                  Session #{currentSession.session_number}
                </span>
              </>
            )}
          </div>

          {!selectedUserId && <Adoption data={data} onSelectUser={(id) => setSelectedUserId(id)} />}
          {selectedUserId && !selectedSessionId && (
            <UserJourney data={data} userId={selectedUserId} onSelectSession={(id) => setSelectedSessionId(id)} />
          )}
          {selectedUserId && selectedSessionId && (
            <SessionAnalysis data={data} userId={selectedUserId} sessionId={selectedSessionId} />
          )}
        </>
      )}

      {tab === "invites" && (
        <Invites
          invites={data.invites}
          newInviteName={newInviteName}
          setNewInviteName={setNewInviteName}
          newInviterName={newInviterName}
          setNewInviterName={setNewInviterName}
          createInvite={createInvite}
          deleteInvite={deleteInvite}
        />
      )}
    </div>
  );
}

// --- Adoption view ---------------------------------------------------

function Adoption({ data, onSelectUser }) {
  const rows = useMemo(() => data.users.map((u) => {
    const userSessions = data.sessions.filter((s) => s.user_id === u.id);
    const lastSession = userSessions[0];
    const lastActive = lastSession?.started_at;
    const totalMins = userSessions.reduce((acc, s) => acc + (durationMin(s.started_at, s.ended_at) || 0), 0);
    return {
      id: u.id,
      name: u.display_name || u.id.slice(0, 8),
      invitedBy: u.invited_by_name,
      joined: u.created_at,
      lastActive,
      sessionsCount: userSessions.length,
      totalMins,
      currentPhase: lastSession?.phase || "—",
      status: userStatus(lastActive),
    };
  }).sort((a, b) => {
    if (!a.lastActive) return 1;
    if (!b.lastActive) return -1;
    return new Date(b.lastActive) - new Date(a.lastActive);
  }), [data]);

  const totalUsers = rows.length;
  const activeLast7 = rows.filter((r) => r.lastActive && (Date.now() - new Date(r.lastActive).getTime()) < 7 * 86400000).length;
  const sessionsLast7 = data.sessions.filter((s) => (Date.now() - new Date(s.started_at).getTime()) < 7 * 86400000).length;

  if (rows.length === 0) {
    return <div style={{ padding: 40, textAlign: "center", color: "#888" }}>No users yet. Create an invite and share the link.</div>;
  }

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={S.statsRow}>
        <Stat label="Total users" value={totalUsers} />
        <Stat label="Active last 7 days" value={activeLast7} />
        <Stat label="Sessions last 7 days" value={sessionsLast7} />
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={S.sectionTitle}>Users</div>
        <div style={S.tableWrap}>
          <div style={{ ...S.tableRow, ...S.tableHead }}>
            <div style={{ flex: 2 }}>Name</div>
            <div style={{ flex: 1.5 }}>Invited by</div>
            <div style={{ flex: 1, textAlign: "center" }}>Status</div>
            <div style={{ flex: 1.2 }}>Joined</div>
            <div style={{ flex: 1.2 }}>Last active</div>
            <div style={{ flex: 0.8, textAlign: "right" }}>Sessions</div>
            <div style={{ flex: 0.8, textAlign: "right" }}>Time</div>
            <div style={{ flex: 1 }}>Phase</div>
          </div>
          {rows.map((r) => (
            <div key={r.id} style={S.tableRow} onClick={() => onSelectUser(r.id)} className="va-row">
              <div style={{ flex: 2, fontWeight: 500 }}>{r.name}</div>
              <div style={{ flex: 1.5, color: "#aaa", fontSize: 12 }}>{r.invitedBy || "—"}</div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: r.status.color }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.status.color }} />
                  {r.status.label}
                </span>
              </div>
              <div style={{ flex: 1.2, color: "#aaa", fontSize: 12 }}>{formatDate(r.joined)}</div>
              <div style={{ flex: 1.2, color: "#aaa", fontSize: 12 }}>{timeAgo(r.lastActive)}</div>
              <div style={{ flex: 0.8, textAlign: "right", fontWeight: 500 }}>{r.sessionsCount}</div>
              <div style={{ flex: 0.8, textAlign: "right", color: "#aaa", fontSize: 12 }}>{r.totalMins ? `${r.totalMins}m` : "—"}</div>
              <div style={{ flex: 1, color: "#C4A08A", fontSize: 12, textTransform: "capitalize" }}>{r.currentPhase}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`.va-row:hover { background: #262626 !important; }`}</style>
    </div>
  );
}

// --- User Journey ----------------------------------------------------

function UserJourney({ data, userId, onSelectSession }) {
  const user = data.users.find((u) => u.id === userId);
  const userSessions = useMemo(
    () => data.sessions.filter((s) => s.user_id === userId).sort((a, b) => new Date(b.started_at) - new Date(a.started_at)),
    [data.sessions, userId]
  );

  const userEssentialTruth = data.essentialTruth.find((t) => t.user_id === userId);
  const userActiveHypotheses = data.hypotheses.filter((h) => h.user_id === userId && h.status === "active");
  const userResolvedHypotheses = data.hypotheses.filter((h) => h.user_id === userId && ["confirmed", "revised", "discarded"].includes(h.status));
  const userSilences = data.silences.filter((s) => s.user_id === userId).sort((a, b) => (b.sessions_absent || 0) - (a.sessions_absent || 0));
  const userTopDimensions = data.dimensions.filter((d) => d.user_id === userId).sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 8);

  if (!user) return <div style={{ padding: 40, color: "#888" }}>User not found</div>;

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={S.userHeader}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 500, fontFamily: "'Cormorant Garamond',serif", color: "#C4A08A" }}>
            {user.display_name || user.id.slice(0, 8)}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
            Joined {formatDate(user.created_at)}
            {user.invited_by_name && ` · Invited by ${user.invited_by_name}`}
            {" · "}{userSessions.length} session{userSessions.length === 1 ? "" : "s"}
            {userSessions[0] && ` · Current phase: ${userSessions[0].phase}`}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, marginTop: 20 }}>
        <div>
          <div style={S.sectionTitle}>Sessions</div>
          {userSessions.length === 0 && <div style={S.empty}>No sessions yet</div>}
          {userSessions.map((s) => (
            <SessionCard key={s.id} session={s} data={data} onClick={() => onSelectSession(s.id)} />
          ))}
        </div>

        <div>
          <div style={S.sectionTitle}>Portrait so far</div>

          {userEssentialTruth?.text && (
            <div style={S.portraitSection}>
              <div style={S.portraitLabel}>Essential truth</div>
              <div style={{ fontSize: 13, fontStyle: "italic", lineHeight: 1.5, color: "#e0ddd8" }}>"{userEssentialTruth.text}"</div>
              <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>Confidence: {userEssentialTruth.confidence}/5</div>
            </div>
          )}

          {userActiveHypotheses.length > 0 && (
            <div style={S.portraitSection}>
              <div style={S.portraitLabel}>Active hypotheses ({userActiveHypotheses.length})</div>
              {userActiveHypotheses.slice(0, 5).map((h) => (
                <div key={h.id} style={S.hypothesisChip}>{h.text}</div>
              ))}
            </div>
          )}

          {userResolvedHypotheses.length > 0 && (
            <div style={S.portraitSection}>
              <div style={S.portraitLabel}>Resolved ({userResolvedHypotheses.length})</div>
              {userResolvedHypotheses.slice(0, 3).map((h) => (
                <div key={h.id} style={{ ...S.hypothesisChip, opacity: 0.7 }}>
                  <span style={{ color: h.status === "confirmed" ? "#7cb87c" : h.status === "discarded" ? "#E24B4A" : "#d4a84a", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 6 }}>
                    {h.status}
                  </span>
                  {h.text}
                </div>
              ))}
            </div>
          )}

          {userTopDimensions.length > 0 && (
            <div style={S.portraitSection}>
              <div style={S.portraitLabel}>Most resolved dimensions</div>
              {userTopDimensions.map((d) => (
                <div key={d.id} style={S.dimRow}>
                  <span style={{ fontSize: 11 }}>{d.dimension_name}</span>
                  <span style={{ fontSize: 10, color: "#888" }}>{d.resolution} · w{d.weight}</span>
                </div>
              ))}
            </div>
          )}

          {userSilences.length > 0 && (
            <div style={S.portraitSection}>
              <div style={S.portraitLabel}>Silences</div>
              {userSilences.slice(0, 5).map((s) => (
                <div key={s.id} style={S.dimRow}>
                  <span style={{ fontSize: 11 }}>{s.topic}</span>
                  <span style={{ fontSize: 10, color: "#888" }}>absent {s.sessions_absent}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionCard({ session, data, onClick }) {
  const sessionFragments = data.fragments.filter((f) => f.user_id === session.user_id && f.session_number === session.session_number);
  const sessionHypotheses = data.hypotheses.filter((h) => h.user_id === session.user_id && (h.created_session === session.session_number || h.resolved_session === session.session_number));
  const sessionKeyMoments = data.keyMoments.filter((k) => k.user_id === session.user_id && k.session_number === session.session_number);
  const sessionTerritoryUpdates = data.territory.filter((t) => t.user_id === session.user_id && t.last_visited_session === session.session_number);
  const sessionDimsEvidenced = data.dimensions.filter((d) => d.user_id === session.user_id && d.last_evidence_session === session.session_number);
  const sessionMessages = data.messages.filter((m) => m.session_id === session.id);
  const sessionScores = data.scores.filter((s) => s.session_id === session.id);
  const latestScore = sessionScores[sessionScores.length - 1];
  const mins = durationMin(session.started_at, session.ended_at);

  return (
    <div style={S.sessionCard} onClick={onClick} className="va-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>
          Session #{session.session_number}
          <span style={{ color: "#C4A08A", fontSize: 12, fontWeight: 400, marginLeft: 10 }}>{session.phase}</span>
        </div>
        <div style={{ fontSize: 11, color: "#888" }}>
          {timeAgo(session.started_at)} · {mins != null ? `${mins}m` : "—"} · {sessionMessages.length} turns
        </div>
      </div>

      {(sessionFragments.length > 0 || sessionHypotheses.length > 0 || sessionKeyMoments.length > 0 || sessionTerritoryUpdates.length > 0 || sessionDimsEvidenced.length > 0) && (
        <div style={{ marginBottom: 10 }}>
          <div style={S.portraitLabel}>What emerged</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: "#d0cdc8" }}>
            {sessionFragments.slice(0, 3).map((f) => (<li key={f.id}>Fragment: "{f.text}"</li>))}
            {sessionFragments.length > 3 && <li style={{ color: "#666", listStyle: "none", paddingLeft: 0 }}>+{sessionFragments.length - 3} more fragments</li>}
            {sessionHypotheses.map((h) => (<li key={h.id}>Hypothesis {h.created_session === session.session_number ? "added" : h.status}: {h.text}</li>))}
            {sessionKeyMoments.map((k) => (<li key={k.id}><span style={{ color: "#C4A08A" }}>Key moment ({k.moment_type}):</span> {k.description}</li>))}
            {sessionTerritoryUpdates.map((t) => (<li key={t.id}>Territory: {t.territory} (depth {t.depth}/5)</li>))}
            {sessionDimsEvidenced.length > 0 && (<li style={{ color: "#888" }}>{sessionDimsEvidenced.length} dimension{sessionDimsEvidenced.length === 1 ? "" : "s"} evidenced</li>)}
          </ul>
        </div>
      )}

      {latestScore && (
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#888", paddingTop: 8, borderTop: "1px solid #2a2a2a" }}>
          <span>Trust {latestScore.trust_score ?? "—"}</span>
          <span>Depth {latestScore.depth_score ?? "—"}</span>
          <span>Readiness {latestScore.readiness_score ?? "—"}</span>
          <span style={{ marginLeft: "auto", color: "#C4A08A" }}>View conversation →</span>
        </div>
      )}
      {!latestScore && (
        <div style={{ fontSize: 11, color: "#C4A08A", textAlign: "right", paddingTop: 8, borderTop: "1px solid #2a2a2a" }}>View conversation →</div>
      )}
      <style>{`.va-card:hover { background: #252525 !important; border-color: #444 !important; }`}</style>
    </div>
  );
}

// --- Session Analysis ------------------------------------------------

function SessionAnalysis({ data, userId, sessionId }) {
  const user = data.users.find((u) => u.id === userId);
  const session = data.sessions.find((s) => s.id === sessionId);

  const messages = useMemo(
    () => data.messages.filter((m) => m.session_id === sessionId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [data.messages, sessionId]
  );

  if (!session || !user) return <div style={{ padding: 40, color: "#888" }}>Session not found</div>;

  const sessionFragments = data.fragments.filter((f) => f.user_id === userId && f.session_number === session.session_number);
  const sessionHypotheses = data.hypotheses.filter((h) => h.user_id === userId && (h.created_session === session.session_number || h.resolved_session === session.session_number));
  const sessionKeyMoments = data.keyMoments.filter((k) => k.user_id === userId && k.session_number === session.session_number);
  const sessionTerritoryUpdates = data.territory.filter((t) => t.user_id === userId && t.last_visited_session === session.session_number);
  const sessionDimsEvidenced = data.dimensions.filter((d) => d.user_id === userId && d.last_evidence_session === session.session_number).sort((a, b) => (b.weight || 0) - (a.weight || 0));
  const sessionScores = data.scores.filter((s) => s.session_id === sessionId);
  const firstScore = sessionScores[0];
  const lastScore = sessionScores[sessionScores.length - 1];
  const mins = durationMin(session.started_at, session.ended_at);
  const userName = user.display_name || user.id.slice(0, 8);

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={S.userHeader}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500, fontFamily: "'Cormorant Garamond',serif", color: "#C4A08A" }}>
            Session #{session.session_number}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
            {formatDate(session.started_at)} · {mins != null ? `${mins}m` : "—"} · {messages.length} turns · phase: {session.phase}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, marginTop: 20 }}>
        <div>
          <div style={S.sectionTitle}>Conversation</div>
          {messages.length === 0 && <div style={S.empty}>No messages</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} style={{
                  padding: "12px 14px", borderRadius: 6,
                  background: isUser ? "#252525" : "#1e2230",
                  borderLeft: isUser ? "2px solid #555" : "2px solid #7F77DD",
                }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: "#888", letterSpacing: "0.06em", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                    <span>{isUser ? userName : "Angelica"}</span>
                    <span>{formatTime(m.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#e0ddd8" }}>{m.content}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div style={S.sectionTitle}>Analysis</div>

          {lastScore && (
            <div style={S.portraitSection}>
              <div style={S.portraitLabel}>Scores {firstScore !== lastScore ? "(at session end)" : ""}</div>
              {[
                ["Trust", lastScore.trust_score, firstScore?.trust_score],
                ["Depth", lastScore.depth_score, firstScore?.depth_score],
                ["Readiness", lastScore.readiness_score, firstScore?.readiness_score],
                ["Self-knowledge gap", lastScore.self_knowledge_gap, firstScore?.self_knowledge_gap],
                ["Emotional availability", lastScore.emotional_availability, firstScore?.emotional_availability],
              ].map(([label, val, startVal]) => {
                if (val == null) return null;
                const delta = startVal != null && startVal !== val ? val - startVal : null;
                return (
                  <div key={label} style={S.dimRow}>
                    <span style={{ fontSize: 11 }}>{label}</span>
                    <span style={{ fontSize: 11, fontWeight: 500 }}>
                      {val}/10
                      {delta != null && (
                        <span style={{ marginLeft: 6, color: delta > 0 ? "#7cb87c" : "#E24B4A", fontSize: 10 }}>
                          {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {sessionKeyMoments.length > 0 && (
            <div style={S.portraitSection}>
              <div style={S.portraitLabel}>Key moments ({sessionKeyMoments.length})</div>
              {sessionKeyMoments.map((k) => (
                <div key={k.id} style={S.analysisChip}>
                  <span style={{ color: "#C4A08A", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 6 }}>{k.moment_type || "moment"}</span>
                  {k.description}
                  {k.portrait_impact && <div style={{ fontSize: 10, color: "#666", marginTop: 4, fontStyle: "italic" }}>Impact: {k.portrait_impact}</div>}
                </div>
              ))}
            </div>
          )}

          {sessionFragments.length > 0 && (
            <div style={S.portraitSection}>
              <div style={S.portraitLabel}>Fragments captured ({sessionFragments.length})</div>
              {sessionFragments.map((f) => (
                <div key={f.id} style={S.analysisChip}>
                  "{f.text}"
                  {f.context && <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>Context: {f.context}</div>}
                  {f.significance && <div style={{ fontSize: 10, color: "#888", marginTop: 4, fontStyle: "italic" }}>{f.significance}</div>}
                </div>
              ))}
            </div>
          )}

          {sessionHypotheses.length > 0 && (
            <div style={S.portraitSection}>
              <div style={S.portraitLabel}>Hypotheses ({sessionHypotheses.length})</div>
              {sessionHypotheses.map((h) => {
                const isNewThisSession = h.created_session === session.session_number;
                return (
                  <div key={h.id} style={S.analysisChip}>
                    <span style={{
                      color: h.status === "confirmed" ? "#7cb87c" : h.status === "discarded" ? "#E24B4A" : h.status === "revised" ? "#d4a84a" : "#C4A08A",
                      fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 6
                    }}>{isNewThisSession ? "new" : h.status}</span>
                    {h.text}
                    {h.evidence && <div style={{ fontSize: 10, color: "#888", marginTop: 4, fontStyle: "italic" }}>Evidence: {h.evidence}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {sessionDimsEvidenced.length > 0 && (
            <div style={S.portraitSection}>
              <div style={S.portraitLabel}>Dimensions evidenced ({sessionDimsEvidenced.length})</div>
              {sessionDimsEvidenced.slice(0, 10).map((d) => (
                <div key={d.id} style={S.dimRow}>
                  <span style={{ fontSize: 11 }}>{d.dimension_name}</span>
                  <span style={{ fontSize: 10, color: "#888" }}>{d.resolution} · conf {d.confidence}</span>
                </div>
              ))}
              {sessionDimsEvidenced.length > 10 && <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>+{sessionDimsEvidenced.length - 10} more</div>}
            </div>
          )}

          {sessionTerritoryUpdates.length > 0 && (
            <div style={S.portraitSection}>
              <div style={S.portraitLabel}>Territory covered</div>
              {sessionTerritoryUpdates.map((t) => (
                <div key={t.id} style={S.dimRow}>
                  <span style={{ fontSize: 11 }}>{t.territory}</span>
                  <span style={{ fontSize: 10, color: "#888" }}>depth {t.depth}/5</span>
                </div>
              ))}
            </div>
          )}

          {sessionFragments.length === 0 && sessionHypotheses.length === 0 && sessionKeyMoments.length === 0 && sessionDimsEvidenced.length === 0 && !lastScore && (
            <div style={S.empty}>No analysis data for this session yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Invites ---------------------------------------------------------

function Invites({ invites, newInviteName, setNewInviteName, newInviterName, setNewInviterName, createInvite, deleteInvite }) {
  return (
    <div style={{ padding: "20px 24px", maxWidth: 900 }}>
      <div style={S.sectionTitle}>Invites</div>

      <div style={{ marginBottom: 20, maxWidth: 600 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            value={newInviteName}
            onChange={(e) => setNewInviteName(e.target.value)}
            placeholder="Who's being invited (e.g. Tracey)"
            style={S.input}
          />
          <input
            value={newInviterName}
            onChange={(e) => setNewInviterName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createInvite()}
            placeholder="Who's introducing them (e.g. Sarah)"
            style={S.input}
          />
          <button onClick={createInvite} style={{ ...S.btn, whiteSpace: "nowrap" }}>Create invite</button>
        </div>
        <div style={{ fontSize: 11, color: "#888" }}>
          Angelica uses both names in her opening message. Introducer is optional — if blank, Angelica will just greet the invitee by name.
        </div>
      </div>

      {invites.length === 0 && <div style={S.empty}>No invites yet</div>}
      {invites.map((inv) => (
        <div key={inv.id} style={S.inviteRow}>
          <div style={{ minWidth: 140 }}>
            <span style={{ fontWeight: 500 }}>{inv.name}</span>
            {inv.inviter_name && <span style={{ color: "#888", fontSize: 11 }}> · from {inv.inviter_name}</span>}
            <div style={{ color: inv.used_at ? "#7cb87c" : "#888", fontSize: 11, marginTop: 2 }}>
              {inv.used_at ? `Used ${timeAgo(inv.used_at)}` : "Not used"}
            </div>
          </div>
          <input
            readOnly
            value={`https://verona-ai.app/?invite=${inv.token}`}
            style={{ ...S.input, flex: 1, fontSize: 11 }}
            onClick={(e) => { e.target.select(); navigator.clipboard.writeText(e.target.value); }}
          />
          <button
            onClick={() => navigator.clipboard.writeText(`https://verona-ai.app/?invite=${inv.token}`)}
            style={{ ...S.btn, fontSize: 11 }}
          >Copy</button>
          <button onClick={() => deleteInvite(inv.id)} style={{ ...S.btn, background: "#433", color: "#E24B4A", fontSize: 11 }}>Delete</button>
        </div>
      ))}
    </div>
  );
}

// --- Small components ------------------------------------------------

function Stat({ label, value }) {
  return <div style={S.stat}><div style={S.statValue}>{value}</div><div style={S.statLabel}>{label}</div></div>;
}

// --- Styles ----------------------------------------------------------

const S = {
  page: { minHeight: "100vh", background: "#1a1a1a", color: "#e0ddd8", fontFamily: "'DM Sans',sans-serif", fontSize: 13 },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #333" },
  title: { fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 500, color: "#C4A08A" },
  btn: { background: "#E8E4DF", color: "#2C2825", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontWeight: 500 },
  tabBar: { display: "flex", borderBottom: "1px solid #333", padding: "0 24px" },
  tab: { background: "none", border: "none", borderBottom: "2px solid transparent", color: "#888", cursor: "pointer", fontSize: 13, fontWeight: 500, padding: "10px 18px", marginBottom: -1, fontFamily: "inherit" },
  tabActive: { color: "#C4A08A", borderBottom: "2px solid #C4A08A" },
  crumb: { padding: "12px 24px", fontSize: 12, color: "#888", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", gap: 8 },
  crumbLink: { color: "#C4A08A", cursor: "pointer" },
  crumbSep: { color: "#555" },
  loginBox: { width: 300, margin: "120px auto", textAlign: "center" },
  input: { width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid #444", background: "#222", color: "#e0ddd8", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  loadingBox: { padding: 40, textAlign: "center", color: "#888" },
  errorBox: { padding: 40, textAlign: "center", color: "#E24B4A" },
  sectionTitle: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#C4A08A", marginBottom: 12 },
  statsRow: { display: "flex", gap: 1 },
  stat: { flex: 1, padding: "16px 12px", textAlign: "center", background: "#1e1e1e", borderRadius: 4, maxWidth: 200 },
  statValue: { fontSize: 28, fontWeight: 600, color: "#C4A08A", fontFamily: "'Cormorant Garamond',serif" },
  statLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginTop: 4 },
  tableWrap: { display: "flex", flexDirection: "column", background: "#1e1e1e", borderRadius: 6, overflow: "hidden" },
  tableRow: { display: "flex", padding: "12px 16px", borderBottom: "1px solid #2a2a2a", cursor: "pointer", alignItems: "center", transition: "background 0.1s" },
  tableHead: { fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", fontWeight: 500, cursor: "default", background: "#161616" },
  userHeader: { display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 12, borderBottom: "1px solid #2a2a2a" },
  sessionCard: { background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 8, padding: 14, marginBottom: 10, cursor: "pointer", transition: "background 0.1s, border-color 0.1s" },
  portraitSection: { marginBottom: 18 },
  portraitLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", marginBottom: 8, fontWeight: 500 },
  hypothesisChip: { fontSize: 12, padding: "6px 10px", background: "#222", borderRadius: 4, marginBottom: 5, lineHeight: 1.5 },
  analysisChip: { fontSize: 12, padding: "8px 10px", background: "#222", borderRadius: 4, marginBottom: 6, lineHeight: 1.5, color: "#d0cdc8" },
  dimRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", borderBottom: "1px solid #252525" },
  empty: { color: "#666", fontStyle: "italic", fontSize: 12, padding: 20, textAlign: "center" },
  inviteRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 10, padding: "10px 14px", background: "#222", borderRadius: 6 },
};
