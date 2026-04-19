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
  const [tab, setTab] = useState("users");
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

  useEffect(() => {
    if (authed) fetchData();
  }, [authed, fetchData]);

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
  async function reinvite(id) {
    const pw = sessionStorage.getItem("admin-pw");
    await fetch("/api/invite", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", authorization: pw },
      body: JSON.stringify({ id }),
    });
    fetchData();
  }

  function switchTab(newTab) {
    setTab(newTab);
    setSelectedUserId(null);
    setSelectedSessionId(null);
  }

  async function deleteUser(userId) {
    const pw = sessionStorage.getItem("admin-pw");
    const res = await fetch("/api/admin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", authorization: pw },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || "Delete failed");
    }
    setSelectedUserId(null);
    setSelectedSessionId(null);
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
      <style>{`
        #app-shell { max-width: 100% !important; box-shadow: none !important; }
        .va-grid { display: grid; grid-template-columns: 1fr 300px; gap: 24px; margin-top: 20px; }
        .va-grid-wide { display: grid; grid-template-columns: 1fr 340px; gap: 24px; margin-top: 20px; }
        .va-table-scroll { overflow-x: auto; }
        @media (max-width: 760px) {
          .va-grid, .va-grid-wide { grid-template-columns: 1fr; }
        }
      `}</style>
      <div style={S.topBar}>
        <div style={S.title}>Mission Control</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={fetchData} style={S.btn}>Refresh</button>
          <a href="/" style={{ ...S.btn, textDecoration: "none" }}>← App</a>
        </div>
      </div>

      <div style={S.tabBar}>
        <button onClick={() => switchTab("invites")} style={{ ...S.tab, ...(tab === "invites" ? S.tabActive : {}) }}>Invites</button>
        <button onClick={() => switchTab("users")} style={{ ...S.tab, ...(tab === "users" ? S.tabActive : {}) }}>Users</button>
        <button onClick={() => switchTab("conversations")} style={{ ...S.tab, ...(tab === "conversations" ? S.tabActive : {}) }}>Conversations</button>
        <button onClick={() => switchTab("prompts")} style={{ ...S.tab, ...(tab === "prompts" ? S.tabActive : {}) }}>Prompts</button>
      </div>

      {tab === "users" && (
        <>
          <div style={S.crumb}>
            <span onClick={() => { setSelectedUserId(null); setSelectedSessionId(null); }} style={S.crumbLink}>Users</span>
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
            <UserProfile data={data} userId={selectedUserId} onSelectSession={(id) => setSelectedSessionId(id)} onDeleteUser={deleteUser} />
          )}
          {selectedUserId && selectedSessionId && (
            <SessionAnalysis data={data} userId={selectedUserId} sessionId={selectedSessionId} />
          )}
        </>
      )}

      {tab === "conversations" && (
        <>
          <div style={S.crumb}>
            <span onClick={() => { setSelectedSessionId(null); setSelectedUserId(null); }} style={S.crumbLink}>Conversations</span>
            {currentSession && (
              <>
                <span style={S.crumbSep}>›</span>
                <span style={{ ...S.crumbLink, color: "#e0ddd8", cursor: "default" }}>
                  {currentUser?.display_name || currentUser?.id.slice(0, 8)} · Session #{currentSession.session_number}
                </span>
              </>
            )}
          </div>
          {!selectedSessionId && (
            <ConversationsList data={data} onSelectSession={(sessionId, userId) => { setSelectedSessionId(sessionId); setSelectedUserId(userId); }} />
          )}
          {selectedSessionId && (
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
          reinvite={reinvite}
        />
      )}

      {tab === "prompts" && <Prompts />}
    </div>
  );
}

// --- Prompts view ----------------------------------------------------

function Prompts() {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editContent, setEditContent] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [activatingId, setActivatingId] = useState(null);

  const pw = () => sessionStorage.getItem("admin-pw");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/prompts?key=angelica", { headers: { authorization: pw() } });
    const { versions: v } = await res.json();
    setVersions(v || []);
    const active = (v || []).find((x) => x.is_active);
    if (active) setEditContent(active.content);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const activeVersion = versions.find((v) => v.is_active);
  const isDirty = editContent !== (activeVersion?.content || "");

  async function saveNewVersion() {
    if (!editLabel.trim()) { setSaveError("Give this version a label before saving"); return; }
    setSaving(true); setSaveError(null);
    const res = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: pw() },
      body: JSON.stringify({ content: editContent, label: editLabel, notes: editNotes, key: "angelica" }),
    });
    const json = await res.json();
    if (json.error) { setSaveError(json.error); setSaving(false); return; }
    setEditLabel(""); setEditNotes("");
    await load();
    setSaving(false);
  }

  async function activateVersion(id) {
    setActivatingId(id);
    await fetch("/api/prompts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", authorization: pw() },
      body: JSON.stringify({ id, key: "angelica" }),
    });
    await load();
    setActivatingId(null);
  }

  async function deleteVersion(id) {
    if (!confirm("Delete this version? This cannot be undone.")) return;
    await fetch("/api/prompts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", authorization: pw() },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  const [selectedVersion, setSelectedVersion] = useState(null);

  // When versions load, select the active one
  useEffect(() => {
    if (versions.length > 0 && !selectedVersion) {
      const active = versions.find((v) => v.is_active);
      if (active) setSelectedVersion(active);
    }
  }, [versions]);

  if (loading) return <div style={{ padding: 40, color: "#888" }}>Loading…</div>;

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={S.sectionTitle}>Prompt dashboard</div>
        <div style={{ fontSize: 11, color: "#666" }}>
          {activeVersion
            ? <>Live: <span style={{ color: "#7cb87c" }}>{activeVersion.label}</span> · {activeVersion.content.length.toLocaleString()} chars</>
            : "No active prompt (using code fallback)"}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24 }}>

        {/* ── Left: version list ── */}
        <div>
          {/* ── New version upload ── */}
          <div style={{ marginBottom: 16, borderBottom: "1px solid #2a2a2a", paddingBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Add new version
            </div>
            <input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              placeholder="Label (e.g. v3 — shorter opening)"
              style={{ ...S.input, width: "100%", marginBottom: 6 }}
            />
            <input
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Notes (optional)"
              style={{ ...S.input, width: "100%", marginBottom: 8 }}
            />
            <label
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "10px 0", marginBottom: 8,
                border: "1px dashed #3a3a3a", borderRadius: 6, cursor: "pointer",
                fontSize: 12, color: "#888", transition: "border-color 0.15s",
              }}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#C4A08A"; }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = "#3a3a3a"; }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = "#3a3a3a";
                const file = e.dataTransfer.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setEditContent(ev.target.result);
                  reader.readAsText(file);
                }
              }}
            >
              <input
                type="file"
                accept=".md,.txt,.text"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setEditContent(ev.target.result);
                    reader.readAsText(file);
                  }
                  e.target.value = "";
                }}
              />
              ↑ Upload .md / .txt file
            </label>
            <div style={{ fontSize: 10, color: "#555", marginBottom: 8 }}>
              Upload a file or edit directly in the editor, then click save.
            </div>
            <button
              onClick={saveNewVersion}
              disabled={saving || !isDirty || !editLabel.trim()}
              style={{ ...S.btn, width: "100%", opacity: (saving || !isDirty || !editLabel.trim()) ? 0.4 : 1 }}
            >{saving ? "Saving…" : "Save & activate"}</button>
            {saveError && <div style={{ fontSize: 11, color: "#E24B4A", marginTop: 6 }}>{saveError}</div>}
          </div>

          <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Versions ({versions.length})
          </div>

          {versions.map((v) => (
            <div
              key={v.id || "seed"}
              onClick={() => { setSelectedVersion(v); setEditContent(v.content); }}
              style={{
                background: selectedVersion?.id === v.id ? "#1e2230" : "#1a1a1a",
                border: `1px solid ${v.is_active ? "#3a5a3a" : selectedVersion?.id === v.id ? "#3a3a5a" : "#2a2a2a"}`,
                borderRadius: 6, padding: "10px 14px", marginBottom: 6, cursor: "pointer",
                transition: "border-color 0.15s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 500, fontSize: 13, color: v.is_active ? "#C4A08A" : "#e0ddd8" }}>{v.label}</span>
                {v.is_active && <span style={{ fontSize: 9, color: "#7cb87c", textTransform: "uppercase", letterSpacing: "0.06em", background: "#1a2a1a", padding: "2px 6px", borderRadius: 4 }}>Live</span>}
              </div>
              <div style={{ fontSize: 10, color: "#555", marginTop: 3 }}>
                {v.created_at ? timeAgo(v.created_at) : "from code"}
                {v.notes && <span style={{ color: "#666" }}> · {v.notes}</span>}
              </div>
              <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>
                {v.content.length.toLocaleString()} chars · {v.content.split("\n").length} lines
              </div>
            </div>
          ))}
        </div>

        {/* ── Right: editor + actions ── */}
        <div>
          {selectedVersion && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {selectedVersion.label}
                {selectedVersion.is_active && <span style={{ marginLeft: 8, fontSize: 10, color: "#7cb87c" }}>LIVE</span>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => navigator.clipboard.writeText(editContent)}
                  style={{ fontSize: 11, color: "#aaa", background: "none", border: "1px solid #333", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}
                >Copy</button>
                {!selectedVersion.is_active && selectedVersion.id && (
                  <button
                    onClick={() => activateVersion(selectedVersion.id)}
                    disabled={activatingId === selectedVersion.id}
                    style={{ fontSize: 11, color: "#C4A08A", background: "none", border: "1px solid #3a3020", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}
                  >{activatingId === selectedVersion.id ? "Activating…" : "Make live"}</button>
                )}
                {!selectedVersion.is_active && selectedVersion.id && (
                  <button
                    onClick={() => { deleteVersion(selectedVersion.id); setSelectedVersion(null); }}
                    style={{ fontSize: 11, color: "#E24B4A", background: "none", border: "1px solid #3a2020", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}
                  >Delete</button>
                )}
              </div>
            </div>
          )}

          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            style={{
              width: "100%", minHeight: 560, background: "#111", color: "#d0cdc8",
              border: `1px solid ${isDirty ? "#5a4a1a" : "#2a2a2a"}`, borderRadius: 6, padding: 16,
              fontSize: 12, lineHeight: 1.7, fontFamily: "monospace",
              resize: "vertical", boxSizing: "border-box", outline: "none",
            }}
          />
          <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
            {editContent.length.toLocaleString()} chars · {editContent.split("\n").length} lines
            {isDirty && <span style={{ color: "#d4a84a", marginLeft: 12 }}>● Unsaved changes</span>}
          </div>
        </div>
      </div>
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
    const inviterUser = u.invited_by_name ? data.users.find((other) => other.display_name === u.invited_by_name) : null;
    return {
      id: u.id,
      shortId: u.id.slice(0, 8),
      name: u.display_name || u.id.slice(0, 8),
      invitedBy: u.invited_by_name,
      invitedByShortId: inviterUser ? inviterUser.id.slice(0, 8) : null,
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
              <div style={{ flex: 2, fontWeight: 500 }}>
                {r.name}
                <span style={{ display: "block", fontSize: 10, color: "#555", fontWeight: 400, fontFamily: "monospace", marginTop: 1 }}>{r.shortId}</span>
              </div>
              <div style={{ flex: 1.5, color: "#aaa", fontSize: 12 }}>
                {r.invitedBy || "—"}
                {r.invitedByShortId && <span style={{ display: "block", fontSize: 10, color: "#555", fontFamily: "monospace", marginTop: 1 }}>{r.invitedByShortId}</span>}
              </div>
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

function UserProfile({ data, userId, onSelectSession, onDeleteUser }) {
  const user = data.users.find((u) => u.id === userId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const userSessions = useMemo(
    () => data.sessions.filter((s) => s.user_id === userId).sort((a, b) => new Date(b.started_at) - new Date(a.started_at)),
    [data.sessions, userId]
  );

  const latestSession = userSessions[0];
  const status = userStatus(latestSession?.started_at);

  // Scores — latest across all sessions
  const userScores = useMemo(
    () => data.scores.filter((s) => s.user_id === userId).sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at)),
    [data.scores, userId]
  );
  const latestScore = userScores[0];

  // CQ — latest entry
  const userCQ = useMemo(
    () => (data.cq || []).filter((c) => c.user_id === userId).sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at)),
    [data.cq, userId]
  );
  const latestCQ = userCQ[0];

  const essentialTruth = data.essentialTruth.find((t) => t.user_id === userId);
  const activeHypotheses = data.hypotheses.filter((h) => h.user_id === userId && h.status === "active");
  const resolvedHypotheses = data.hypotheses.filter((h) => h.user_id === userId && ["confirmed", "revised", "discarded"].includes(h.status));
  const silences = data.silences.filter((s) => s.user_id === userId).sort((a, b) => (b.sessions_absent || 0) - (a.sessions_absent || 0));
  const topDimensions = data.dimensions.filter((d) => d.user_id === userId).sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 10);

  if (!user) return <div style={{ padding: 40, color: "#888" }}>User not found</div>;

  const phaseColor = { trust: "#888", hypothesis: "#d4a84a", diffusion: "#C4A08A" };

  return (
    <div style={{ padding: "20px 24px" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 16, borderBottom: "1px solid #2a2a2a", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 26, fontWeight: 500, fontFamily: "'Cormorant Garamond',serif", color: "#C4A08A" }}>
              {user.display_name || user.id.slice(0, 8)}
            </div>
            {latestSession?.phase && (
              <span style={{ fontSize: 11, color: phaseColor[latestSession.phase] || "#888", background: "#222", border: "1px solid #333", borderRadius: 12, padding: "2px 10px", textTransform: "capitalize" }}>
                {latestSession.phase}
              </span>
            )}
            <span style={{ fontSize: 11, color: status.color, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: status.color }} />{status.label}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 6, fontFamily: "monospace" }}>
            {user.id.slice(0, 8)}
            <span style={{ fontFamily: "inherit", fontSize: 12, color: "#666", marginLeft: 12 }}>
              Joined {formatDate(user.created_at)}
              {user.invited_by_name && ` · Invited by ${user.invited_by_name}`}
              {` · ${userSessions.length} session${userSessions.length === 1 ? "" : "s"}`}
              {latestSession && ` · Last active ${timeAgo(latestSession.started_at)}`}
            </span>
          </div>
        </div>
        <button
          onClick={() => { setShowDeleteConfirm(true); setDeleteError(null); }}
          style={{ fontSize: 12, color: "#E24B4A", background: "none", border: "1px solid #3a2020", borderRadius: 4, padding: "6px 14px", cursor: "pointer", flexShrink: 0 }}
        >
          Delete user
        </button>
      </div>

      {/* ── Relationship with Angelica ── */}
      {(latestScore || essentialTruth || latestCQ) && (
        <div style={{ marginBottom: 28 }}>
          <div style={S.sectionTitle}>Relationship with Angelica</div>

          {latestScore && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
              {[
                ["Trust", latestScore.trust_score],
                ["Depth", latestScore.depth_score],
                ["Readiness", latestScore.readiness_score],
                ["Self-knowledge gap", latestScore.self_knowledge_gap],
                ["Emotional availability", latestScore.emotional_availability],
              ].map(([label, val]) => val != null && (
                <div key={label} style={{ flex: "1 1 150px", minWidth: 130 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginBottom: 4 }}>
                    <span>{label}</span><span style={{ fontWeight: 500, color: "#e0ddd8" }}>{val}/10</span>
                  </div>
                  <div style={{ height: 3, background: "#2a2a2a", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${val * 10}%`, background: "#C4A08A", borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {essentialTruth?.text && (
            <div style={{ padding: "12px 16px", background: "#1e1e1e", borderRadius: 6, borderLeft: "3px solid #C4A08A", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Essential truth · confidence {essentialTruth.confidence}/5
              </div>
              <div style={{ fontSize: 13, fontStyle: "italic", color: "#e0ddd8", lineHeight: 1.6 }}>"{essentialTruth.text}"</div>
            </div>
          )}

          {latestCQ && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                ["Honesty", latestCQ.honesty],
                ["Safety", latestCQ.safety],
                ["Trust", latestCQ.trust],
                ["Investment", latestCQ.investment],
                ["Momentum", latestCQ.momentum],
                ["Depth signal", latestCQ.depth_signal],
                ["Return signal", latestCQ.return_signal],
                ["Goal aliveness", latestCQ.goal_aliveness],
              ].map(([label, val]) => val != null && (
                <div key={label} style={{
                  fontSize: 11, padding: "4px 10px", background: "#1e1e1e", borderRadius: 12,
                  border: "1px solid #2a2a2a",
                  color: val >= 7 ? "#7cb87c" : val <= 3 ? "#E24B4A" : "#aaa",
                }}>
                  {label} <strong>{val}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Portrait + Silences grid ── */}
      {(activeHypotheses.length > 0 || resolvedHypotheses.length > 0 || silences.length > 0 || topDimensions.length > 0) && (
        <div className="va-grid" style={{ marginBottom: 28 }}>
          <div>
            {activeHypotheses.length > 0 && (
              <div style={S.portraitSection}>
                <div style={S.sectionTitle}>Active hypotheses ({activeHypotheses.length})</div>
                {activeHypotheses.map((h) => (
                  <div key={h.id} style={S.hypothesisChip}>{h.text}</div>
                ))}
              </div>
            )}
            {silences.length > 0 && (
              <div style={S.portraitSection}>
                <div style={S.sectionTitle}>Silences</div>
                {silences.slice(0, 6).map((s) => (
                  <div key={s.id} style={S.dimRow}>
                    <span style={{ fontSize: 11 }}>{s.topic}</span>
                    <span style={{ fontSize: 10, color: "#888" }}>absent {s.sessions_absent}</span>
                  </div>
                ))}
              </div>
            )}
            {resolvedHypotheses.length > 0 && (
              <div style={S.portraitSection}>
                <div style={S.sectionTitle}>Resolved hypotheses ({resolvedHypotheses.length})</div>
                {resolvedHypotheses.slice(0, 4).map((h) => (
                  <div key={h.id} style={{ ...S.hypothesisChip, opacity: 0.7 }}>
                    <span style={{ color: h.status === "confirmed" ? "#7cb87c" : h.status === "discarded" ? "#E24B4A" : "#d4a84a", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 6 }}>
                      {h.status}
                    </span>
                    {h.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            {topDimensions.length > 0 && (
              <div style={S.portraitSection}>
                <div style={S.sectionTitle}>Portrait dimensions</div>
                {topDimensions.map((d) => (
                  <div key={d.id} style={S.dimRow}>
                    <span style={{ fontSize: 11 }}>{d.dimension_name}</span>
                    <span style={{ fontSize: 10, color: "#888" }}>{d.resolution} · w{d.weight}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Conversations ── */}
      <div>
        <div style={S.sectionTitle}>Conversations ({userSessions.length})</div>
        {userSessions.length === 0 && <div style={S.empty}>No conversations yet</div>}
        {userSessions.map((s) => (
          <SessionCard key={s.id} session={s} data={data} onClick={() => onSelectSession(s.id)} />
        ))}
      </div>

      {/* ── Delete modal ── */}
      {showDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#1a1a1a", border: "1px solid #3a2020", borderRadius: 8, padding: 32, maxWidth: 400, width: "90%" }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#E24B4A", marginBottom: 12 }}>Delete user?</div>
            <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6, marginBottom: 20 }}>
              This will permanently delete <strong style={{ color: "#e0ddd8" }}>{user.display_name || user.id.slice(0, 8)}</strong> and all their data — conversations, portrait, hypotheses, scores, and dimensions. This cannot be undone.
            </div>
            {deleteError && <div style={{ fontSize: 12, color: "#E24B4A", marginBottom: 12 }}>{deleteError}</div>}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                style={{ fontSize: 13, color: "#aaa", background: "none", border: "1px solid #333", borderRadius: 4, padding: "8px 18px", cursor: "pointer" }}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeleting(true);
                  try { await onDeleteUser(userId); }
                  catch (e) { setDeleteError(e.message); setDeleting(false); }
                }}
                disabled={deleting}
                style={{ fontSize: 13, color: "#fff", background: "#7a1a1a", border: "none", borderRadius: 4, padding: "8px 18px", cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
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

  function downloadText(filename, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = filename;
    a.click();
  }

  function exportConversation() {
    const header = `Verona — ${userName} · Session #${session.session_number}\n${formatDate(session.started_at)} · ${mins != null ? `${mins}m` : "—"} · ${messages.length} turns · phase: ${session.phase}\n${"─".repeat(60)}\n\n`;
    const body = messages.map(m => `[${m.role === "user" ? userName : "Angelica"}  ${formatTime(m.created_at)}]\n${m.content}`).join("\n\n");
    downloadText(`verona-${userName.toLowerCase()}-session${session.session_number}.txt`, header + body);
  }

  function exportConversationAndAnalysis() {
    const lines = [];
    lines.push(`VERONA — ${userName} · Session #${session.session_number}`);
    lines.push(`${formatDate(session.started_at)} · ${mins != null ? `${mins}m` : "—"} · ${messages.length} turns · phase: ${session.phase}`);
    lines.push("═".repeat(60));
    lines.push("");

    lines.push("CONVERSATION");
    lines.push("─".repeat(40));
    messages.forEach(m => {
      lines.push(`[${m.role === "user" ? userName : "Angelica"}  ${formatTime(m.created_at)}]`);
      lines.push(m.content);
      lines.push("");
    });

    if (lastScore) {
      lines.push("═".repeat(60));
      lines.push("SCORES");
      lines.push("─".repeat(40));
      [["Trust", lastScore.trust_score], ["Depth", lastScore.depth_score], ["Readiness", lastScore.readiness_score], ["Self-knowledge gap", lastScore.self_knowledge_gap], ["Emotional availability", lastScore.emotional_availability]].forEach(([label, val]) => {
        if (val != null) lines.push(`${label}: ${val}/10`);
      });
      lines.push("");
    }

    if (sessionKeyMoments.length > 0) {
      lines.push("═".repeat(60));
      lines.push("KEY MOMENTS");
      lines.push("─".repeat(40));
      sessionKeyMoments.forEach(k => {
        lines.push(`[${k.moment_type || "moment"}] ${k.description}`);
        if (k.portrait_impact) lines.push(`  Impact: ${k.portrait_impact}`);
      });
      lines.push("");
    }

    if (sessionHypotheses.length > 0) {
      lines.push("═".repeat(60));
      lines.push("HYPOTHESES");
      lines.push("─".repeat(40));
      sessionHypotheses.forEach(h => {
        const tag = h.created_session === session.session_number ? "NEW" : h.status.toUpperCase();
        lines.push(`[${tag}] ${h.text}`);
        if (h.evidence) lines.push(`  Evidence: ${h.evidence}`);
      });
      lines.push("");
    }

    if (sessionFragments.length > 0) {
      lines.push("═".repeat(60));
      lines.push("FRAGMENTS");
      lines.push("─".repeat(40));
      sessionFragments.forEach(f => {
        lines.push(`"${f.text}"`);
        if (f.significance) lines.push(`  ${f.significance}`);
      });
      lines.push("");
    }

    if (sessionDimsEvidenced.length > 0) {
      lines.push("═".repeat(60));
      lines.push("DIMENSIONS EVIDENCED");
      lines.push("─".repeat(40));
      sessionDimsEvidenced.forEach(d => lines.push(`${d.dimension_name}: ${d.resolution} (confidence ${d.confidence}, weight ${d.weight})`));
      lines.push("");
    }

    if (sessionTerritoryUpdates.length > 0) {
      lines.push("═".repeat(60));
      lines.push("TERRITORY COVERED");
      lines.push("─".repeat(40));
      sessionTerritoryUpdates.forEach(t => lines.push(`${t.territory}: depth ${t.depth}/5`));
      lines.push("");
    }

    downloadText(`verona-${userName.toLowerCase()}-session${session.session_number}-full.txt`, lines.join("\n"));
  }

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
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={exportConversation} style={S.btn}>Export conversation</button>
          <button onClick={exportConversationAndAnalysis} style={S.btn}>Export with analysis</button>
        </div>
      </div>

      <div className="va-grid-wide">
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

// --- Conversations list ----------------------------------------------

function ConversationsList({ data, onSelectSession }) {
  const rows = useMemo(() => data.sessions.map((s) => {
    const user = data.users.find((u) => u.id === s.user_id);
    const msgs = data.messages.filter((m) => m.session_id === s.id);
    const sessionScores = data.scores.filter((sc) => sc.session_id === s.id).sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at));
    const latestScore = sessionScores[0];
    return {
      id: s.id,
      userId: s.user_id,
      userName: user?.display_name || user?.id.slice(0, 8) || "Unknown",
      sessionNumber: s.session_number,
      phase: s.phase,
      startedAt: s.started_at,
      mins: durationMin(s.started_at, s.ended_at),
      turns: msgs.length,
      trust: latestScore?.trust_score,
      depth: latestScore?.depth_score,
      readiness: latestScore?.readiness_score,
    };
  }).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)), [data]);

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={S.tableWrap}>
        <div style={{ ...S.tableRow, ...S.tableHead }}>
          <div style={{ flex: 2 }}>User</div>
          <div style={{ flex: 0.6, textAlign: "center" }}>Session</div>
          <div style={{ flex: 1 }}>Phase</div>
          <div style={{ flex: 1.2 }}>Date</div>
          <div style={{ flex: 1 }}>Duration</div>
          <div style={{ flex: 0.8, textAlign: "right" }}>Turns</div>
          <div style={{ flex: 1, textAlign: "right" }}>Trust</div>
          <div style={{ flex: 1, textAlign: "right" }}>Depth</div>
          <div style={{ flex: 1, textAlign: "right" }}>Readiness</div>
        </div>
        {rows.map((r) => (
          <div key={r.id} style={S.tableRow} onClick={() => onSelectSession(r.id, r.userId)} className="va-row">
            <div style={{ flex: 2, fontWeight: 500 }}>{r.userName}</div>
            <div style={{ flex: 0.6, textAlign: "center", color: "#888" }}>#{r.sessionNumber}</div>
            <div style={{ flex: 1, color: "#C4A08A", fontSize: 12, textTransform: "capitalize" }}>{r.phase || "—"}</div>
            <div style={{ flex: 1.2, color: "#aaa", fontSize: 12 }}>{formatDate(r.startedAt)}</div>
            <div style={{ flex: 1, color: "#aaa", fontSize: 12 }}>{r.mins != null ? `${r.mins}m` : "—"}</div>
            <div style={{ flex: 0.8, textAlign: "right", fontWeight: 500 }}>{r.turns || "—"}</div>
            <div style={{ flex: 1, textAlign: "right", fontSize: 12, color: "#aaa" }}>{r.trust != null ? `${r.trust}/10` : "—"}</div>
            <div style={{ flex: 1, textAlign: "right", fontSize: 12, color: "#aaa" }}>{r.depth != null ? `${r.depth}/10` : "—"}</div>
            <div style={{ flex: 1, textAlign: "right", fontSize: 12, color: "#aaa" }}>{r.readiness != null ? `${r.readiness}/10` : "—"}</div>
          </div>
        ))}
      </div>
      <style>{`.va-row:hover { background: #262626 !important; }`}</style>
    </div>
  );
}

// --- Invites ---------------------------------------------------------

function Invites({ invites, newInviteName, setNewInviteName, newInviterName, setNewInviterName, createInvite, deleteInvite, reinvite }) {
  function inviteUrl(inv) {
    return `https://verona-demo.vercel.app/?invite=${inv.token}`;
  }

  return (
    <div style={{ padding: "20px 24px", maxWidth: 900 }}>
      <div style={S.sectionTitle}>Invites</div>

      <div style={{ marginBottom: 20, maxWidth: 700 }}>
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
            placeholder="Who's introducing them (e.g. Sarah)"
            style={S.input}
          />
          <button onClick={createInvite} style={{ ...S.btn, whiteSpace: "nowrap" }}>Create invite</button>
        </div>
        <div style={{ fontSize: 11, color: "#888" }}>
          Angelica uses both names in her opening message. Introducer is optional.
        </div>
      </div>

      {invites.length === 0 && <div style={S.empty}>No invites yet</div>}
      {invites.map((inv) => {
        const url = inviteUrl(inv);
        return (
          <div key={inv.id} style={S.inviteRow}>
            <div style={{ minWidth: 160 }}>
              <span style={{ fontWeight: 500 }}>{inv.name}</span>
              {inv.inviter_name && <span style={{ color: "#888", fontSize: 11 }}> · from {inv.inviter_name}</span>}
              <div style={{ fontSize: 11, marginTop: 2 }}>
                <span style={{ color: inv.used_at ? "#7cb87c" : "#888" }}>
                  {inv.used_at ? `Used ${timeAgo(inv.used_at)}` : "Not used"}
                </span>
              </div>
            </div>
            <input
              readOnly
              value={url}
              style={{ ...S.input, flex: 1, fontSize: 11 }}
              onClick={(e) => { e.target.select(); navigator.clipboard.writeText(e.target.value); }}
            />
            <button
              onClick={() => navigator.clipboard.writeText(url)}
              style={{ ...S.btn, fontSize: 11 }}
            >Copy</button>
            {inv.used_at && (
              <button onClick={() => reinvite(inv.id)} style={{ ...S.btn, fontSize: 11, background: "#2a3a2a", color: "#7cb87c" }}>Reinvite</button>
            )}
            <button onClick={() => deleteInvite(inv.id)} style={{ ...S.btn, background: "#433", color: "#E24B4A", fontSize: 11 }}>Delete</button>
          </div>
        );
      })}
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
  tableWrap: { display: "flex", flexDirection: "column", background: "#1e1e1e", borderRadius: 6, overflow: "hidden", overflowX: "auto" },
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
