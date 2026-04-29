"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

const TOP_TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "users", label: "Users" },
  { id: "invites", label: "Invites" },
  { id: "angelica", label: "Angelica" },
];

const USER_TABS = [
  { id: "overview", label: "Overview" },
  { id: "substrate", label: "Substrate" },
  { id: "conversations", label: "Conversations" },
  { id: "cq", label: "CQ" },
];

const SESSION_PANES = [
  { id: "substrate", label: "Substrate snapshot" },
  { id: "cq", label: "CQ verdict" },
  { id: "notes", label: "Notes" },
];

const CQ_GROUPS = [
  {
    label: "Relationship quality",
    keys: ["honesty", "trust", "safety", "investment"],
  },
  {
    label: "Experience quality",
    keys: ["anticipation", "momentum", "progress_belief", "frustration"],
  },
  {
    label: "Engagement signal",
    keys: ["return_signal", "depth_signal", "arrival_state"],
  },
  {
    label: "Direction signal",
    keys: ["orientation", "goal_aliveness", "agency", "dependency_risk"],
  },
];

const CQ_OVERVIEW_KEYS = ["honesty", "depth_signal", "momentum", "frustration", "return_signal"];

function labelForStage(stage) {
  const map = {
    1: "Arrival",
    2: "Knowing",
    3: "Discernment",
    4: "Reciprocity",
    5: "Commitment",
  };
  const n = Number(stage);
  return Number.isFinite(n) && map[n] ? `${n} - ${map[n]}` : "-";
}

function labelForLevel(level) {
  const map = {
    1: "Level 1",
    2: "Level 2",
    3: "Level 3",
  };
  const n = Number(level);
  return Number.isFinite(n) && map[n] ? map[n] : "-";
}

function niceLabel(key) {
  return key
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

const CQ_DIMS = [
  "honesty","trust","safety","investment",
  "anticipation","momentum","progress_belief","frustration",
  "return_signal","depth_signal","arrival_state",
  "orientation","goal_aliveness","agency","dependency_risk",
];

function buildObserverNotesMarkdown({ user, session, messages, sortedCq, anchorByCq, observerNotes }) {
  const name = user?.display_name || "User";
  const sessNum = session?.session_number ?? "?";
  const startedAt = session?.started_at ? new Date(session.started_at).toLocaleString() : "";
  const endedAt = session?.ended_at ? new Date(session.ended_at).toLocaleString() : "";
  const turnIndex = new Map(messages.map((m, i) => [m.id, i + 1]));

  const lines = [];
  lines.push(`# Observer notes — ${name} — Session ${sessNum}`);
  if (startedAt) lines.push(`Started: ${startedAt}${endedAt ? ` · Ended: ${endedAt}` : ""}`);
  lines.push(`Stage ${session?.stage ?? "-"} · Level ${session?.level ?? "-"} · ${messages.length} turns · ${sortedCq.length} observer reading${sortedCq.length === 1 ? "" : "s"}`);
  lines.push("");

  if (sortedCq.length) {
    lines.push("## CQ observer readings");
    lines.push("");
    sortedCq.forEach((cq, i) => {
      const anchor = anchorByCq.get(cq.id);
      const turn = anchor ? turnIndex.get(anchor.id) : null;
      lines.push(`### Reading ${i + 1}${turn ? ` — after turn ${turn}` : ""}`);
      lines.push(`_${cq.measured_at ? new Date(cq.measured_at).toLocaleString() : ""}_`);
      if (anchor) {
        const preview = (anchor.content || "").replace(/\s+/g, " ").trim().slice(0, 200);
        lines.push(`> **${anchor.role === "user" ? name : "Angelica"}:** ${preview}${preview.length === 200 ? "…" : ""}`);
      }
      lines.push("");
      if (cq.room) lines.push(`**Room:** ${cq.room.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ")}`);
      if (cq.conversation_level) lines.push(`**Level:** ${cq.conversation_level}`);
      if (cq.alert) lines.push(`**⚠ Alert:** ${cq.alert.replace(/_/g, " ")}`);
      if (cq.delta_summary) lines.push(`**Summary:** ${cq.delta_summary}`);
      lines.push("");
      lines.push("| Dimension | Score |");
      lines.push("|---|---|");
      CQ_DIMS.forEach((k) => {
        if (cq[k] != null) lines.push(`| ${niceLabel(k)} | ${cq[k]} |`);
      });
      const rationale = cq.rationale || {};
      const rKeys = Object.keys(rationale).filter((k) => rationale[k]);
      if (rKeys.length) {
        lines.push("");
        lines.push("**Rationale:**");
        rKeys.forEach((k) => lines.push(`- _${niceLabel(k)}:_ ${rationale[k]}`));
      }
      lines.push("");
    });
  }

  if (observerNotes && observerNotes.length) {
    lines.push("## Manual observer notes");
    lines.push("");
    observerNotes.forEach((n) => {
      lines.push(`- _${n.created_at ? new Date(n.created_at).toLocaleString() : ""}_ — ${n.note}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

function CopyObserverButton({ user, session, messages, sortedCq, anchorByCq, observerNotes }) {
  const [copied, setCopied] = useState(false);
  const empty = !sortedCq.length && !observerNotes.length;
  const onCopy = async () => {
    const md = buildObserverNotesMarkdown({ user, session, messages, sortedCq, anchorByCq, observerNotes });
    try {
      await navigator.clipboard.writeText(md);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = md;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={onCopy}
      disabled={empty}
      style={{ ...S.secondaryBtn, padding: "4px 10px", fontSize: 11, opacity: empty ? 0.4 : 1 }}
      title="Copy observer notes as Markdown"
    >
      {copied ? "✓ Copied" : "⧉ Copy"}
    </button>
  );
}

function formatDate(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(ts) {
  if (!ts) return "-";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const mos = Math.floor(days / 30);
  return `${mos}mo ago`;
}

function durationMin(startedAt, endedAt) {
  if (!startedAt) return null;
  const end = endedAt ? new Date(endedAt) : new Date();
  return Math.max(0, Math.round((end - new Date(startedAt)) / 60000));
}

function userStatus(lastActiveTs) {
  if (!lastActiveTs) return { label: "never", color: "#6b6a67" };
  const days = (Date.now() - new Date(lastActiveTs).getTime()) / 86400000;
  if (days < 3) return { label: "active", color: "#82bd8b" };
  if (days < 14) return { label: "recent", color: "#d0a45c" };
  return { label: "dormant", color: "#6b6a67" };
}

function cqOverall(row) {
  if (!row) return null;
  const values = [];
  for (const g of CQ_GROUPS) {
    for (const key of g.keys) {
      if (row[key] != null) values.push(Number(row[key]));
    }
  }
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Deterministic CQ → coaching nudge mapping. Mirrors lib/cq-coaching.js.
// Edit these in lockstep with the chat-side rules.
const CQ_NUDGES = {
  honesty: { low: "Honesty is shaky. Soften, give permission, don't probe." },
  trust: {
    low: "Trust is low. Stay in Trust phase. Keep it ordinary, no interpretations.",
    high: "Trust is strong. Permission to go deeper, name patterns.",
  },
  safety: { low: "Safety is low. Pull back. Be warmer, lighter, no probing." },
  investment: { low: "Investment is thin. Return to what lit them up earlier." },
  anticipation: { low: "Anticipation is flat. Surprise with specificity, callbacks." },
  momentum: { low: "Momentum dragging. Shorten responses. Lighter touch." },
  progress_belief: { low: "They don't feel this is going anywhere. Land precisely." },
  frustration: { high: "Frustration rising. Ease off. Change tack. Acknowledge, give space." },
  return_signal: { low: "They may not come back. End on something that lingers." },
  depth_signal: {
    low: "Staying surface-level. Invite specificity if trust permits.",
    high: "They are going deep. Stay with them. Let silence work.",
  },
  arrival_state: { low: "They arrived flat. Match it gently. Don't try to lift them." },
  orientation: { low: "Disoriented. Don't push direction. Let them find the thread." },
  goal_aliveness: { low: "Goal feels distant. Don't reference matching or outcomes." },
  agency: { low: "Agency low. Hand control back. Ask what they want to talk about." },
  dependency_risk: { high: "Dependency risk rising. Don't over-nurture. Create distance." },
};
const CQ_LOW = 4;
const CQ_HIGH = 8;
function cqNudgesFor(row) {
  if (!row) return [];
  const out = [];
  for (const [key, n] of Object.entries(CQ_NUDGES)) {
    const v = row[key];
    if (v == null) continue;
    const num = Number(v);
    if (num <= CQ_LOW && n.low) out.push({ key, value: num, level: "low", text: n.low });
    else if (num >= CQ_HIGH && n.high) out.push({ key, value: num, level: "high", text: n.high });
  }
  return out;
}

function stageTransitionsForSession(stageTransitions, session) {
  if (!session) return [];
  return stageTransitions.filter((t) => {
    const bySessionId = t.session_id && t.session_id === session.id;
    const bySessionNumber =
      t.session_number != null &&
      session.session_number != null &&
      Number(t.session_number) === Number(session.session_number);
    return bySessionId || bySessionNumber;
  });
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [topTab, setTopTab] = useState("dashboard");
  const [conversationsRootView, setConversationsRootView] = useState("dashboard");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserTab, setSelectedUserTab] = useState("overview");
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionPaneById, setSessionPaneById] = useState({});

  const [newInviteName, setNewInviteName] = useState("");
  const [newInviterName, setNewInviterName] = useState("");

  const [sessionNoteDraft, setSessionNoteDraft] = useState("");
  const [messageNoteDraft, setMessageNoteDraft] = useState({});

  useEffect(() => {
    const saved = sessionStorage.getItem("admin-pw");
    if (!saved) return;
    setPassword(saved);
    setAuthed(true);
  }, []);

  const fetchData = useCallback(async () => {
    const pw = sessionStorage.getItem("admin-pw");
    if (!pw) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin", { headers: { authorization: pw } });
      if (res.status === 401) {
        setAuthed(false);
        sessionStorage.removeItem("admin-pw");
        setError("Wrong password");
        setLoading(false);
        return;
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) fetchData();
  }, [authed, fetchData]);

  const currentUser = useMemo(() => {
    if (!data || !selectedUserId) return null;
    return data.users.find((u) => u.id === selectedUserId) || null;
  }, [data, selectedUserId]);

  const currentSession = useMemo(() => {
    if (!data || !selectedSessionId) return null;
    return data.sessions.find((s) => s.id === selectedSessionId) || null;
  }, [data, selectedSessionId]);

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

  async function addSessionNote(sessionId) {
    if (!sessionNoteDraft.trim()) return;
    const pw = sessionStorage.getItem("admin-pw");
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: pw },
      body: JSON.stringify({
        action: "add_observer_note",
        sessionId,
        note: sessionNoteDraft.trim(),
        rubricVersion: "operator-notes-v1",
        modelIdentifier: "operator",
      }),
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error);
      return;
    }
    setSessionNoteDraft("");
    fetchData();
  }

  async function addMessageNote(messageId) {
    const note = messageNoteDraft[messageId] || "";
    if (!note.trim()) return;
    const pw = sessionStorage.getItem("admin-pw");
    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", authorization: pw },
      body: JSON.stringify({
        action: "add_message_note",
        messageId,
        note: note.trim(),
      }),
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error);
      return;
    }
    setMessageNoteDraft((prev) => ({ ...prev, [messageId]: "" }));
    fetchData();
  }

  function onTopTabChange(nextTab) {
    setTopTab(nextTab);
    if (nextTab === "dashboard") {
      setConversationsRootView("dashboard");
      setSelectedSessionId(null);
      setSelectedUserId(null);
      setSelectedUserTab("overview");
      return;
    }
    if (nextTab === "users") {
      setConversationsRootView("adoption");
      setSelectedSessionId(null);
      setSelectedUserId(null);
      setSelectedUserTab("overview");
      return;
    }
    setSelectedSessionId(null);
    setSelectedUserId(null);
    setSelectedUserTab("overview");
  }

  function openUser(userId) {
    setTopTab("users");
    setConversationsRootView("adoption");
    setSelectedUserId(userId);
    setSelectedUserTab("overview");
    setSelectedSessionId(null);
  }

  function openUserTab(tabId) {
    setSelectedUserTab(tabId);
    setSelectedSessionId(null);
  }

  function openSession(sessionId) {
    setSelectedUserTab("conversations");
    setSelectedSessionId(sessionId);
    setSessionPaneById((prev) => ({
      ...prev,
      [sessionId]: prev[sessionId] || "substrate",
    }));
  }

  function openAllConversations() {
    setTopTab("users");
    setConversationsRootView("all-conversations");
    setSelectedUserId(null);
    setSelectedSessionId(null);
    setSelectedUserTab("overview");
  }

  function setSessionPane(sessionId, paneId) {
    setSessionPaneById((prev) => ({ ...prev, [sessionId]: paneId }));
  }

  if (!authed) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #f3e0d9 0%, #e8c9bd 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          width: "100%",
          maxWidth: 380,
          background: "#fffdfb",
          border: "1px solid #e2c9bf",
          borderRadius: 14,
          padding: "40px 36px",
          boxShadow: "0 24px 60px rgba(139, 74, 58, 0.18), 0 4px 12px rgba(139, 74, 58, 0.06)",
        }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 38,
            color: "#8f4634",
            letterSpacing: "0.01em",
            lineHeight: 1.1,
          }}>
            Verona
          </div>
          <div style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "#b78e84",
            marginTop: 6,
            marginBottom: 28,
          }}>
            The Balcony
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sessionStorage.setItem("admin-pw", password);
              setAuthed(true);
              setError(null);
            }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px",
                fontSize: 14,
                background: "#fbf3ef",
                border: "1px solid #e2c9bf",
                borderRadius: 8,
                color: "#3d2722",
                outline: "none",
                fontFamily: "inherit",
              }}
              autoFocus
            />
            <button
              type="submit"
              style={{
                width: "100%",
                marginTop: 12,
                padding: "12px 14px",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.04em",
                background: "#a95d49",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Enter
            </button>
          </form>
          {error && (
            <div style={{
              color: "#b04f46",
              fontSize: 12,
              marginTop: 14,
              textAlign: "center",
            }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={S.page}>
        <div style={{ ...S.card, margin: "80px auto", maxWidth: 600 }}>
          <div style={S.errorText}>{error}</div>
        </div>
      </div>
    );
  }

  if (!data || loading) {
    return (
      <div style={S.page}>
        <div style={{ ...S.card, margin: "80px auto", maxWidth: 520 }}>
          Loading the balcony...
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <style>{`
        #app-shell { max-width: 100% !important; box-shadow: none !important; }
        .va-table-row:hover { background: #f6e7e1 !important; }
        @media (max-width: 760px) {
          .va-session-grid { grid-template-columns: 1fr !important; }
          .va-substrate-grid { grid-template-columns: 1fr !important; }
          .va-cq-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#efdcd5" }}>
        <div style={S.topBar}>
          <div style={S.title}>The Balcony</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={fetchData} style={S.secondaryBtn}>Refresh</button>
            <a href="/" style={{ ...S.secondaryBtn, textDecoration: "none" }}>Back to app</a>
          </div>
        </div>

        <div style={S.tabStrip}>
          {TOP_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => onTopTabChange(t.id)}
              style={{ ...S.tabBtn, ...(topTab === t.id ? S.tabBtnActive : null) }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Breadcrumbs
          topTab={topTab}
          user={currentUser}
          conversationsRootView={conversationsRootView}
          selectedUserTab={selectedUserTab}
          session={currentSession}
          onGoAdoption={() => {
          setConversationsRootView("adoption");
          setSelectedUserId(null);
          setSelectedSessionId(null);
          setSelectedUserTab("overview");
        }}
        onGoAllConversations={openAllConversations}
        onGoUser={() => setSelectedSessionId(null)}
        onGoUserTab={openUserTab}
      />
      </div>

      {!!data.missingTables?.length && (
        <div style={S.warnBar}>
          Missing optional tables: {data.missingTables.join(", ")}. Related panes show partial data.
        </div>
      )}

      {error && <div style={{ ...S.warnBar, color: "#f3b0aa" }}>{error}</div>}

      {topTab === "invites" && (
        <InvitesTab
          invites={data.invites || []}
          newInviteName={newInviteName}
          setNewInviteName={setNewInviteName}
          newInviterName={newInviterName}
          setNewInviterName={setNewInviterName}
          createInvite={createInvite}
          deleteInvite={deleteInvite}
          reinvite={reinvite}
        />
      )}

      {topTab === "dashboard" && (
        <div style={S.section}>
          <DashboardLanding
            data={data}
            onOpenUsers={() => {
              setTopTab("users");
              setConversationsRootView("adoption");
            }}
            onOpenAllConversations={() => {
              setTopTab("users");
              setConversationsRootView("all-conversations");
            }}
            onOpenInvites={() => setTopTab("invites")}
            onOpenAngelica={() => setTopTab("angelica")}
            onOpenUser={openUser}
          />
        </div>
      )}

      {topTab === "users" && !selectedUserId && (
        <div style={S.section}>
          <RootConversationSwitch
            value={conversationsRootView}
            onChange={setConversationsRootView}
          />
          {conversationsRootView === "adoption" && <AdoptionView data={data} onSelectUser={openUser} />}
          {conversationsRootView === "all-conversations" && (
            <AllConversationsView
              data={data}
              onOpenSession={(sessionId, userId) => {
                setSelectedUserId(userId);
                openSession(sessionId);
              }}
            />
          )}
        </div>
      )}

      {topTab === "users" && selectedUserId && !selectedSessionId && (
        <UserSurface
          data={data}
          user={currentUser}
          selectedUserTab={selectedUserTab}
          setSelectedUserTab={openUserTab}
          onOpenSession={openSession}
          onGoAdoption={() => {
            setConversationsRootView("adoption");
            setSelectedUserId(null);
            setSelectedSessionId(null);
            setSelectedUserTab("overview");
          }}
          onGoAllConversations={openAllConversations}
        />
      )}

      {topTab === "users" && selectedUserId && selectedSessionId && (
        <SessionSurface
          data={data}
          user={currentUser}
          session={currentSession}
          activePane={sessionPaneById[selectedSessionId] || "substrate"}
          onSelectPane={(paneId) => setSessionPane(selectedSessionId, paneId)}
          onOpenSession={openSession}
          sessionNoteDraft={sessionNoteDraft}
          setSessionNoteDraft={setSessionNoteDraft}
          addSessionNote={addSessionNote}
          messageNoteDraft={messageNoteDraft}
          setMessageNoteDraft={setMessageNoteDraft}
          addMessageNote={addMessageNote}
        />
      )}

      {topTab === "angelica" && <AngelicaTab />}
    </div>
  );
}

function Breadcrumbs({
  topTab,
  user,
  conversationsRootView,
  selectedUserTab,
  session,
  onGoAdoption,
  onGoAllConversations,
  onGoUser,
  onGoUserTab,
}) {
  return (
    <div style={S.breadcrumbs}>
      {topTab === "dashboard" ? (
        <span style={S.crumbCurrent}>Dashboard</span>
      ) : topTab === "invites" ? (
        <span style={S.crumbCurrent}>Invites</span>
      ) : topTab === "angelica" ? (
        <span style={S.crumbCurrent}>Angelica</span>
      ) : (
        <>
          <span style={S.crumbLink} onClick={onGoAdoption}>Users</span>
          {!user && conversationsRootView === "all-conversations" && (
            <>
              <span style={S.crumbSep}>/</span>
              <span style={S.crumbCurrent}>All conversations</span>
            </>
          )}
          {user && (
            <>
              <span style={S.crumbSep}>/</span>
              <span style={S.crumbLink} onClick={onGoUser}>{user.display_name || user.id.slice(0, 8)}</span>
              <span style={S.crumbSep}>/</span>
              {!session ? (
                <span style={S.crumbCurrent}>
                  {USER_TABS.find((t) => t.id === selectedUserTab)?.label || "Overview"}
                </span>
              ) : (
                <>
                  <span style={S.crumbLink} onClick={() => onGoUserTab("conversations")}>Conversations</span>
                  <span style={S.crumbSep}>/</span>
                  <span style={S.crumbCurrent}>Session {session.session_number}</span>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function RootConversationSwitch({ value, onChange }) {
  return (
    <div style={{ ...S.card, marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
      <button
        onClick={() => onChange("adoption")}
        style={{ ...S.secondaryBtn, ...(value === "adoption" ? S.secondaryBtnActive : null) }}
      >
        Users
      </button>
      <button
        onClick={() => onChange("all-conversations")}
        style={{ ...S.secondaryBtn, ...(value === "all-conversations" ? S.secondaryBtnActive : null) }}
      >
        All conversations
      </button>
    </div>
  );
}

function DashboardLanding({
  data,
  onOpenUsers,
  onOpenAllConversations,
  onOpenInvites,
  onOpenAngelica,
  onOpenUser,
}) {
  const users = data.users || [];
  const sessions = data.sessions || [];
  const invites = data.invites || [];
  const cq = data.cq || [];

  const activeLast7 = users.filter((u) => {
    const latest = sessions
      .filter((s) => s.user_id === u.id)
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0];
    return latest?.started_at && Date.now() - new Date(latest.started_at).getTime() < 7 * 86400000;
  }).length;

  const sessionsLast7 = sessions.filter(
    (s) => s.started_at && Date.now() - new Date(s.started_at).getTime() < 7 * 86400000
  ).length;

  const unusedInvites = invites.filter((i) => !i.used_at).length;

  const recentUsers = users
    .map((u) => {
      const latest = sessions
        .filter((s) => s.user_id === u.id)
        .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0];
      return {
        id: u.id,
        name: u.display_name || u.email || u.id.slice(0, 8),
        lastActive: latest?.started_at,
        sessionsCount: sessions.filter((s) => s.user_id === u.id).length,
      };
    })
    .sort((a, b) => new Date(b.lastActive || 0) - new Date(a.lastActive || 0))
    .slice(0, 6);

  const recentSessions = sessions
    .slice()
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
    .slice(0, 6)
    .map((s) => {
      const u = users.find((x) => x.id === s.user_id);
      const cqRow = cq
        .filter((c) => c.session_id === s.id)
        .sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))[0];
      return {
        id: s.id,
        userId: s.user_id,
        userName: u?.display_name || u?.id?.slice(0, 8) || "Unknown",
        startedAt: s.started_at,
        sessionNumber: s.session_number,
        cq: cqOverall(cqRow),
      };
    });

  return (
    <>
      <div style={S.statsRow}>
        <StatCard label="Total users" value={users.length} />
        <StatCard label="Active last 7 days" value={activeLast7} />
        <StatCard label="Sessions last 7 days" value={sessionsLast7} />
      </div>

      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={S.cardTitle}>Quick actions</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={S.secondaryBtn} onClick={onOpenUsers}>Open users</button>
          <button style={S.secondaryBtn} onClick={onOpenAllConversations}>Open all conversations</button>
          <button style={S.secondaryBtn} onClick={onOpenInvites}>Manage invites ({unusedInvites} unused)</button>
          <button style={S.secondaryBtn} onClick={onOpenAngelica}>Open Angelica</button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
        <div style={S.card}>
          <div style={S.cardTitle}>Recently active users</div>
          {!recentUsers.length && <div style={S.mutedText}>No users yet.</div>}
          {recentUsers.map((u) => (
            <div key={u.id} style={S.keyValueRow}>
              <span style={{ cursor: "pointer", color: "#a95d49" }} onClick={() => onOpenUser(u.id)}>{u.name}</span>
              <span style={S.dimMeta}>{u.sessionsCount} sessions · {timeAgo(u.lastActive)}</span>
            </div>
          ))}
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>Latest sessions</div>
          {!recentSessions.length && <div style={S.mutedText}>No sessions yet.</div>}
          {recentSessions.map((s) => (
            <div key={s.id} style={S.keyValueRow}>
              <span style={{ cursor: "pointer", color: "#a95d49" }} onClick={() => onOpenUser(s.userId)}>
                {s.userName} · session {s.sessionNumber}
              </span>
              <span style={S.dimMeta}>{timeAgo(s.startedAt)} · CQ {s.cq != null ? s.cq.toFixed(1) : "-"}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function AdoptionView({ data, onSelectUser }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const rows = useMemo(() => {
    return (data.users || [])
      .map((u) => {
        const sessions = (data.sessions || []).filter((s) => s.user_id === u.id);
        const sorted = sessions.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
        const lastSession = sorted[0] || null;
        const totalMins = sessions.reduce(
          (acc, s) => acc + (durationMin(s.started_at, s.ended_at) || 0),
          0
        );
        const lastActive = lastSession?.started_at;
        return {
          id: u.id,
          name: u.display_name || u.email || u.id.slice(0, 8),
          stage: u.stage,
          level: u.level,
          joined: u.created_at,
          lastActive,
          sessionsCount: sessions.length,
          totalMins,
          status: userStatus(lastActive),
        };
      })
      .sort((a, b) => {
        if (!a.lastActive) return 1;
        if (!b.lastActive) return -1;
        return new Date(b.lastActive) - new Date(a.lastActive);
      });
  }, [data]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const statusMatch = statusFilter === "all" || r.status.label === statusFilter;
      const queryMatch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        labelForStage(r.stage).toLowerCase().includes(q) ||
        labelForLevel(r.level).toLowerCase().includes(q);
      return statusMatch && queryMatch;
    });
  }, [rows, query, statusFilter]);

  const totalUsers = rows.length;
  const activeLast7 = rows.filter(
    (r) => r.lastActive && Date.now() - new Date(r.lastActive).getTime() < 7 * 86400000
  ).length;
  const sessionsLast7 = (data.sessions || []).filter(
    (s) => s.started_at && Date.now() - new Date(s.started_at).getTime() < 7 * 86400000
  ).length;

  return (
    <div style={S.section}>
      <div style={S.statsRow}>
        <StatCard label="Total users" value={totalUsers} />
        <StatCard label="Active last 7 days" value={activeLast7} />
        <StatCard label="Sessions last 7 days" value={sessionsLast7} />
      </div>

      <div style={{ ...S.card, marginTop: 18 }}>
        <div style={{ ...S.cardTitle, marginBottom: 10 }}>Users</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, stage, or level"
            style={{ ...S.input, width: 280, marginBottom: 0 }}
          />
          {[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "recent", label: "Recent" },
            { id: "dormant", label: "Dormant" },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setStatusFilter(opt.id)}
              style={{ ...S.secondaryBtn, ...(statusFilter === opt.id ? S.secondaryBtnActive : null) }}
            >
              {opt.label}
            </button>
          ))}
          <div style={{ ...S.dimMeta, marginLeft: "auto", alignSelf: "center" }}>
            {filteredRows.length} of {rows.length} users
          </div>
        </div>
        <div style={S.tableWrap}>
          <div style={{ ...S.tableRow, ...S.tableHeader }}>
            <div style={{ flex: 1.7 }}>Name</div>
            <div style={{ flex: 1.3 }}>Status</div>
            <div style={{ flex: 1.2 }}>Stage</div>
            <div style={{ flex: 1 }}>Level</div>
            <div style={{ flex: 1.2 }}>Last active</div>
            <div style={{ flex: 0.8, textAlign: "right" }}>Sessions</div>
            <div style={{ flex: 0.8, textAlign: "right" }}>Time</div>
            <div style={{ flex: 1.2 }}>Joined</div>
          </div>
          {filteredRows.map((r) => (
            <div
              key={r.id}
              style={S.tableRow}
              className="va-table-row"
              onClick={() => onSelectUser(r.id)}
            >
              <div style={{ flex: 1.7, fontWeight: 500 }}>{r.name}</div>
              <div style={{ flex: 1.3, color: r.status.color, textTransform: "capitalize" }}>{r.status.label}</div>
              <div style={{ flex: 1.2 }}>{labelForStage(r.stage)}</div>
              <div style={{ flex: 1 }}>{labelForLevel(r.level)}</div>
              <div style={{ flex: 1.2, color: "#815f55" }}>{timeAgo(r.lastActive)}</div>
              <div style={{ flex: 0.8, textAlign: "right" }}>{r.sessionsCount}</div>
              <div style={{ flex: 0.8, textAlign: "right", color: "#815f55" }}>
                {r.totalMins ? `${r.totalMins}m` : "-"}
              </div>
              <div style={{ flex: 1.2, color: "#815f55" }}>{formatDate(r.joined)}</div>
            </div>
          ))}
          {!filteredRows.length && (
            <div style={{ ...S.tableRow, color: "#815f55" }}>No users match this filter.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserSurface({ data, user, selectedUserTab, setSelectedUserTab, onOpenSession, onGoAdoption, onGoAllConversations }) {
  const sessions = useMemo(() => {
    return (data.sessions || [])
      .filter((s) => s.user_id === user.id)
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
  }, [data.sessions, user.id]);

  const totalMins = sessions.reduce(
    (acc, s) => acc + (durationMin(s.started_at, s.ended_at) || 0),
    0
  );
  const latestSession = sessions[0] || null;

  return (
    <div style={S.section}>
      <UserHeaderStrip user={user} sessions={sessions} totalMins={totalMins} latestSession={latestSession} />

      <div style={S.innerTabs}>
        {USER_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedUserTab(t.id)}
            style={{ ...S.innerTabBtn, ...(selectedUserTab === t.id ? S.innerTabBtnActive : null) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {selectedUserTab === "overview" && (
        <UserOverview data={data} user={user} sessions={sessions} onOpenSession={onOpenSession} />
      )}
      {selectedUserTab === "substrate" && <UserSubstrate data={data} user={user} />}
      {selectedUserTab === "conversations" && (
        <UserConversations data={data} user={user} sessions={sessions} onOpenSession={onOpenSession} />
      )}
      {selectedUserTab === "cq" && <UserCQ data={data} user={user} sessions={sessions} />}
    </div>
  );
}

function AllConversationsView({ data, onOpenSession }) {
  const rows = useMemo(() => {
    const usersById = new Map((data.users || []).map((u) => [u.id, u]));
    return (data.sessions || [])
      .map((s) => {
        const user = usersById.get(s.user_id);
        const scoreRows = (data.scores || [])
          .filter((sc) => sc.session_id === s.id)
          .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
        const cqRows = (data.cq || [])
          .filter((c) => c.session_id === s.id)
          .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
        const lastScore = scoreRows[scoreRows.length - 1] || null;
        const lastCq = cqRows[cqRows.length - 1] || null;
        const turns = (data.messages || []).filter((m) => m.session_id === s.id).length;
        return {
          id: s.id,
          userId: s.user_id,
          userName: user?.display_name || user?.id?.slice(0, 8) || "Unknown",
          sessionNumber: s.session_number,
          startedAt: s.started_at,
          mins: durationMin(s.started_at, s.ended_at),
          turns,
          trust: lastScore?.trust_score,
          depth: lastScore?.depth_score,
          readiness: lastScore?.readiness_score,
          cq: cqOverall(lastCq),
        };
      })
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  }, [data]);

  return (
    <div style={{ ...S.card, marginTop: 12 }}>
      <div style={S.cardTitle}>All conversations</div>
      <div style={S.tableWrap}>
        <div style={{ ...S.tableRow, ...S.tableHeader }}>
          <div style={{ flex: 1.5 }}>User</div>
          <div style={{ flex: 0.7 }}>Session</div>
          <div style={{ flex: 1.1 }}>Date</div>
          <div style={{ flex: 0.7, textAlign: "right" }}>Turns</div>
          <div style={{ flex: 0.7, textAlign: "right" }}>Time</div>
          <div style={{ flex: 0.7, textAlign: "right" }}>Trust</div>
          <div style={{ flex: 0.7, textAlign: "right" }}>Depth</div>
          <div style={{ flex: 0.8, textAlign: "right" }}>CQ</div>
        </div>
        {rows.map((r) => (
          <div
            key={r.id}
            style={S.tableRow}
            className="va-table-row"
            onClick={() => onOpenSession(r.id, r.userId)}
          >
            <div style={{ flex: 1.5, fontWeight: 500 }}>{r.userName}</div>
            <div style={{ flex: 0.7 }}>#{r.sessionNumber}</div>
            <div style={{ flex: 1.1, color: "#815f55" }}>{formatDate(r.startedAt)}</div>
            <div style={{ flex: 0.7, textAlign: "right" }}>{r.turns}</div>
            <div style={{ flex: 0.7, textAlign: "right", color: "#815f55" }}>{r.mins || 0}m</div>
            <div style={{ flex: 0.7, textAlign: "right" }}>{r.trust ?? "-"}</div>
            <div style={{ flex: 0.7, textAlign: "right" }}>{r.depth ?? "-"}</div>
            <div style={{ flex: 0.8, textAlign: "right" }}>{r.cq != null ? r.cq.toFixed(1) : "-"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserHeaderStrip({ user, sessions, totalMins, latestSession }) {
  return (
    <div style={S.headerStrip}>
      <div style={S.headerCell}>
        <div style={S.headerLabel}>Name</div>
        <div style={S.headerValue}>{user.display_name || user.id.slice(0, 8)}</div>
      </div>
      <div style={S.headerCell}>
        <div style={S.headerLabel}>Stage</div>
        <div style={S.headerValue}>{labelForStage(user.stage)}</div>
      </div>
      <div style={S.headerCell}>
        <div style={S.headerLabel}>Level</div>
        <div style={S.headerValue}>{labelForLevel(user.level)}</div>
      </div>
      <div style={S.headerCell}>
        <div style={S.headerLabel}>Last active</div>
        <div style={S.headerValue}>{timeAgo(latestSession?.started_at)}</div>
      </div>
      <div style={S.headerCell}>
        <div style={S.headerLabel}>Total sessions</div>
        <div style={S.headerValue}>{sessions.length}</div>
      </div>
      <div style={S.headerCell}>
        <div style={S.headerLabel}>Total time</div>
        <div style={S.headerValue}>{totalMins}m</div>
      </div>
      <div style={{ ...S.headerCell, minWidth: 230 }}>
        <div style={S.headerLabel}>Joined / Inviter</div>
        <div style={S.headerValue}>
          {formatDate(user.created_at)}
          {user.invited_by_name ? ` - ${user.invited_by_name}` : ""}
        </div>
      </div>
    </div>
  );
}

const RES_ORDER = ["unvisited", "emerging", "forming", "clear", "tested"];
const RES_COLORS = {
  unvisited: "#d8c9c3",
  emerging: "#e8c4a0",
  forming: "#d0a45c",
  clear: "#82bd8b",
  tested: "#4a8c55",
};
const RES_LABELS = { unvisited: "Unvisited", emerging: "Emerging", forming: "Forming", clear: "Clear", tested: "Tested" };

function resolutionBreakdown(dims) {
  const total = dims.length;
  const counts = RES_ORDER.reduce((acc, r) => { acc[r] = dims.filter((d) => d.resolution === r).length; return acc; }, {});
  const touched = total - (counts.unvisited || 0);
  return { total, counts, touched };
}

function NarrativeBlock({ state, onRegenerate }) {
  const loading = state?.loading;
  const text = state?.text;
  const error = state?.error;
  const question = state?.question;
  return (
    <div style={{ marginBottom: 14, padding: "10px 12px", background: "#f9f3ef", borderRadius: 6, border: "1px solid #ede0da" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 10, color: "#a95d49", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {question || "Angelica's answer"}
        </div>
        <button
          onClick={onRegenerate}
          disabled={loading}
          style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, border: "1px solid #d6c4bb", background: "#fff", color: "#5a4540", cursor: loading ? "default" : "pointer" }}
        >
          {loading ? "writing…" : (text ? "regenerate" : "generate")}
        </button>
      </div>
      {loading && !text && <div style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>Angelica is writing…</div>}
      {error && <div style={{ fontSize: 12, color: "#a95d49" }}>Error: {error}</div>}
      {text && (
        <div style={{ fontSize: 13, color: "#3d2b24", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{text}</div>
      )}
    </div>
  );
}

function SubstrateDiffusionCard({ title, dims, totalExpected, emptyNote, children }) {
  const { total, counts, touched } = resolutionBreakdown(dims);
  const pct = totalExpected > 0 ? Math.round((touched / totalExpected) * 100) : 0;
  const isEmpty = dims.length === 0;

  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <div style={S.cardTitle}>{title}</div>
        {!isEmpty && (
          <span style={{ fontSize: 11, color: "#a95d49", fontWeight: 600 }}>
            {touched}/{totalExpected} touched · {pct}%
          </span>
        )}
      </div>

      {isEmpty ? (
        <div style={S.mutedText}>{emptyNote}</div>
      ) : (
        <>
          {/* Segmented resolution bar */}
          <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 8, background: "#e8ddd8" }}>
            {RES_ORDER.filter((r) => counts[r] > 0).map((r) => (
              <div
                key={r}
                title={`${RES_LABELS[r]}: ${counts[r]}`}
                style={{
                  flex: counts[r],
                  background: RES_COLORS[r],
                  transition: "flex 0.3s",
                }}
              />
            ))}
          </div>
          {/* Resolution count row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            {RES_ORDER.filter((r) => counts[r] > 0).map((r) => (
              <span key={r} style={{ fontSize: 11, color: RES_COLORS[r] === "#d8c9c3" ? "#888" : RES_COLORS[r], fontWeight: 500 }}>
                {counts[r]} {RES_LABELS[r].toLowerCase()}
              </span>
            ))}
          </div>
          {children}
        </>
      )}
    </div>
  );
}

function UserOverview({ data, user, sessions, onOpenSession }) {
  const [substrateOpen, setSubstrateOpen] = useState(null); // "portrait" | "partner" | "relationship"
  const [narratives, setNarratives] = useState({}); // { portrait: { text, question, loading, error } }
  const fetchNarrative = useCallback(async (kind) => {
    setNarratives((n) => ({ ...n, [kind]: { ...(n[kind] || {}), loading: true, error: null } }));
    try {
      const pw = sessionStorage.getItem("admin-pw") || "";
      const res = await fetch("/api/admin/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: pw },
        body: JSON.stringify({ userId: user.id, kind }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setNarratives((n) => ({ ...n, [kind]: { text: json.text, question: json.question, loading: false } }));
    } catch (e) {
      setNarratives((n) => ({ ...n, [kind]: { ...(n[kind] || {}), loading: false, error: e.message } }));
    }
  }, [user.id]);
  useEffect(() => {
    if (!substrateOpen) return;
    if (narratives[substrateOpen]?.text || narratives[substrateOpen]?.loading) return;
    fetchNarrative(substrateOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [substrateOpen]);
  const portrait = (data.dimensions || []).filter((d) => d.user_id === user.id);
  const partner = (data.partnerDimensions || []).filter((d) => d.user_id === user.id);
  const relationship = (data.relationshipDimensions || []).filter((d) => d.user_id === user.id);
  const essentialTruth = (data.essentialTruth || []).find((r) => r.user_id === user.id);
  const activeHypotheses = (data.hypotheses || []).filter(
    (h) => h.user_id === user.id && h.status === "active"
  );
  const latestSession = sessions[0] || null;

  const latestScore = useMemo(() => {
    const rows = (data.scores || [])
      .filter((s) => s.user_id === user.id)
      .sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at));
    return rows[0] || null;
  }, [data.scores, user.id]);

  const latestCQ = useMemo(() => {
    const rows = (data.cq || [])
      .filter((c) => c.user_id === user.id)
      .sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at));
    return rows[0] || null;
  }, [data.cq, user.id]);

  const latestObserverNote = useMemo(() => {
    const rows = (data.observerNotes || [])
      .filter((n) => n.user_id === user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return rows[0] || null;
  }, [data.observerNotes, user.id]);

  const portraitGroupSummaries = useMemo(() => {
    const byGroup = portrait.reduce((acc, d) => {
      const k = d.grouping || "other";
      (acc[k] = acc[k] || []).push(d);
      return acc;
    }, {});
    return Object.entries(byGroup)
      .map(([group, dims]) => {
        const formed = dims.filter((d) => ["forming", "clear", "tested"].includes(d.resolution)).length;
        const total = dims.length;
        return { group, total, formed, pct: total > 0 ? Math.round((formed / total) * 100) : 0 };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [portrait]);

  const partnerTop = useMemo(
    () => partner.filter((d) => d.resolution !== "unvisited").sort((a, b) => (b.confidence || 0) - (a.confidence || 0)).slice(0, 6),
    [partner]
  );
  const relTop = useMemo(
    () => relationship.filter((d) => d.resolution !== "unvisited").sort((a, b) => (b.confidence || 0) - (a.confidence || 0)).slice(0, 6),
    [relationship]
  );
  const relTiers = useMemo(
    () => [1, 2, 3].map((tier) => {
      const dims = relationship.filter((d) => d.tier === tier);
      return { tier, total: dims.length, active: dims.filter((d) => d.resolution !== "unvisited").length };
    }),
    [relationship]
  );

  const cqScore = cqOverall(latestCQ);
  const { touched: portraitTouched } = resolutionBreakdown(portrait);
  const portraitPct = Math.round((portraitTouched / 100) * 100);

  // Inline stat helper
  function Stat({ label, value }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 80 }}>
        <span style={{ fontSize: 10, color: "#a95d49", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#3d2b24" }}>{value}</span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>

      {/* ── 3. Portrait / Partner / Relationship — clickable tiles ── */}
      {(() => {
        const portraitBd = resolutionBreakdown(portrait);
        const partnerBd = resolutionBreakdown(partner);
        const relBd = resolutionBreakdown(relationship);
        function SubstrateTile({ id, title, dims, totalExpected, bd }) {
          const touched = bd.touched;
          const pct = Math.round((touched / totalExpected) * 100);
          const isOpen = substrateOpen === id;
          return (
            <div
              onClick={() => setSubstrateOpen(isOpen ? null : id)}
              style={{ ...S.card, cursor: "pointer", outline: isOpen ? "2px solid #a95d49" : "none", userSelect: "none" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={S.cardTitle}>{title}</div>
                <span style={{ fontSize: 11, color: isOpen ? "#a95d49" : "#888", fontWeight: 600 }}>{touched}/{totalExpected} · {pct}%</span>
              </div>
              <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "#e8ddd8" }}>
                {RES_ORDER.filter((r) => bd.counts[r] > 0).map((r) => (
                  <div key={r} title={`${RES_LABELS[r]}: ${bd.counts[r]}`} style={{ flex: bd.counts[r], background: RES_COLORS[r] }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                {RES_ORDER.filter((r) => bd.counts[r] > 0).map((r) => (
                  <span key={r} style={{ fontSize: 10, color: RES_COLORS[r] === "#d8c9c3" ? "#999" : RES_COLORS[r] }}>
                    {bd.counts[r]} {RES_LABELS[r].toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          );
        }
        return (
          <>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
              <SubstrateTile id="self" title="Self image" dims={portrait} totalExpected={100} bd={portraitBd} />
              <SubstrateTile id="partner" title="Partner image" dims={partner} totalExpected={50} bd={partnerBd} />
              <SubstrateTile id="relationship" title="Relationship image" dims={relationship} totalExpected={50} bd={relBd} />
              <div
                onClick={() => setSubstrateOpen(substrateOpen === "match_portrait" ? null : "match_portrait")}
                style={{ ...S.card, cursor: "pointer", outline: substrateOpen === "match_portrait" ? "2px solid #a95d49" : "none", userSelect: "none", display: "flex", flexDirection: "column", justifyContent: "center" }}
              >
                <div style={S.cardTitle}>Portrait</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>For a potential match · 300 words</div>
              </div>
            </div>
            {substrateOpen === "self" && (
              <div style={{ ...S.card, maxHeight: 480, overflowY: "auto" }}>
                <div style={{ fontSize: 11, color: "#a95d49", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Self image — written
                </div>
                <NarrativeBlock state={narratives.self} onRegenerate={() => fetchNarrative("self")} />
                {essentialTruth?.text ? (
                  <div style={{ ...S.quote, marginBottom: 12 }}>"{essentialTruth.text}"</div>
                ) : (
                  <div style={{ ...S.mutedText, marginBottom: 12 }}>No essential truth yet.</div>
                )}
                {(() => {
                  const visible = portrait.filter((d) => d.resolution && d.resolution !== "unvisited");
                  if (!visible.length) return <div style={S.mutedText}>Nothing gathered yet.</div>;
                  const byGroup = visible.reduce((acc, d) => {
                    const k = d.grouping || "other";
                    (acc[k] = acc[k] || []).push(d);
                    return acc;
                  }, {});
                  return Object.entries(byGroup).map(([group, dims]) => {
                    const sorted = dims.sort((a, b) => (b.weight || 0) - (a.weight || 0));
                    const notes = sorted.filter((d) => d.evidence || d.evidence_notes);
                    return (
                      <div key={group} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, color: "#a95d49", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                          {group.replace(/_/g, " ")}
                        </div>
                        <div style={{ fontSize: 13, color: "#3d2b24", lineHeight: 1.6 }}>
                          {sorted.map((d, i) => {
                            const stated = d.position_stated ?? d.stated_position;
                            const revealed = d.position_revealed ?? d.revealed_position ?? d.observed_position;
                            const parts = [];
                            if (stated != null) parts.push(`stated ${stated}`);
                            if (revealed != null) parts.push(`revealed ${revealed}`);
                            const tail = parts.length ? ` (${parts.join(", ")})` : "";
                            return (
                              <span key={d.id}>
                                <span style={{ fontWeight: 600 }}>{d.dimension_name.replace(/_/g, " ")}</span>
                                {tail}
                                {i < sorted.length - 1 ? "; " : "."}
                              </span>
                            );
                          })}
                        </div>
                        {notes.length > 0 && (
                          <div style={{ marginTop: 6, paddingLeft: 10, borderLeft: "2px solid #ede0da" }}>
                            {notes.map((d) => (
                              <div key={d.id} style={{ fontSize: 12, color: "#5a4540", lineHeight: 1.5, marginTop: 3, fontStyle: "italic" }}>
                                <span style={{ fontStyle: "normal", fontWeight: 600 }}>{d.dimension_name.replace(/_/g, " ")}: </span>
                                {d.evidence || d.evidence_notes}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
            {substrateOpen === "partner" && (
              <div style={{ ...S.card, maxHeight: 480, overflowY: "auto" }}>
                <div style={{ fontSize: 11, color: "#a95d49", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Partner image — written
                </div>
                <NarrativeBlock state={narratives.partner} onRegenerate={() => fetchNarrative("partner")} />
                {(() => {
                  const visible = partner.filter((d) => d.resolution && d.resolution !== "unvisited");
                  if (!visible.length) return <div style={S.mutedText}>Nothing gathered yet.</div>;
                  const byGroup = visible.reduce((acc, d) => {
                    const k = d.grouping || d.category || "other";
                    (acc[k] = acc[k] || []).push(d);
                    return acc;
                  }, {});
                  return Object.entries(byGroup).map(([group, rows]) => {
                    const sorted = rows.sort((a, b) => (b.weight || 0) - (a.weight || 0));
                    return (
                      <div key={group} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, color: "#a95d49", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                          {String(group).replace(/_/g, " ")}
                        </div>
                        <div style={{ fontSize: 13, color: "#3d2b24", lineHeight: 1.6 }}>
                          {sorted.map((d, i) => {
                            const stated = d.position_stated;
                            const revealed = d.position_revealed ?? d.position;
                            const parts = [];
                            if (stated != null) parts.push(`stated ${stated}`);
                            if (revealed != null) parts.push(`revealed ${revealed}`);
                            const tail = parts.length ? ` (${parts.join(", ")})` : "";
                            return (
                              <span key={d.id}>
                                <span style={{ fontWeight: 600 }}>{d.dimension_name.replace(/_/g, " ")}</span>
                                {tail}
                                {i < sorted.length - 1 ? "; " : "."}
                              </span>
                            );
                          })}
                        </div>
                        {sorted.filter((d) => d.evidence).length > 0 && (
                          <div style={{ marginTop: 6, paddingLeft: 10, borderLeft: "2px solid #ede0da" }}>
                            {sorted.filter((d) => d.evidence).map((d) => (
                              <div key={d.id} style={{ fontSize: 12, color: "#5a4540", lineHeight: 1.5, marginTop: 3, fontStyle: "italic" }}>
                                <span style={{ fontStyle: "normal", fontWeight: 600 }}>{d.dimension_name.replace(/_/g, " ")}: </span>
                                {d.evidence}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
            {substrateOpen === "relationship" && (
              <div style={{ ...S.card, maxHeight: 480, overflowY: "auto" }}>
                <div style={{ fontSize: 11, color: "#a95d49", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Relationship image — written
                </div>
                <NarrativeBlock state={narratives.relationship} onRegenerate={() => fetchNarrative("relationship")} />
                {(() => {
                  const visible = relationship.filter((d) => d.resolution && d.resolution !== "unvisited");
                  if (!visible.length) return <div style={S.mutedText}>Nothing gathered yet.</div>;
                  const byGroup = visible.reduce((acc, d) => {
                    const k = d.grouping || "other";
                    (acc[k] = acc[k] || []).push(d);
                    return acc;
                  }, {});
                  return Object.entries(byGroup).map(([group, rows]) => {
                    const sorted = rows.sort((a, b) => (b.weight || b.user_weight || b.default_weight || 0) - (a.weight || a.user_weight || a.default_weight || 0));
                    return (
                      <div key={group} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, color: "#a95d49", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                          {String(group).replace(/_/g, " ")}
                        </div>
                        <div style={{ fontSize: 13, color: "#3d2b24", lineHeight: 1.6 }}>
                          {sorted.map((d, i) => {
                            const stated = d.position_stated ?? d.imagined_position;
                            const revealed = d.position_revealed ?? d.evidenced_position;
                            const parts = [];
                            if (stated != null) parts.push(`stated ${stated}`);
                            if (revealed != null) parts.push(`revealed ${revealed}`);
                            const tail = parts.length ? ` (${parts.join(", ")})` : "";
                            return (
                              <span key={d.id}>
                                <span style={{ fontWeight: 600 }}>{d.dimension_name.replace(/_/g, " ")}</span>
                                {tail}
                                {i < sorted.length - 1 ? "; " : "."}
                              </span>
                            );
                          })}
                        </div>
                        {sorted.filter((d) => d.evidence).length > 0 && (
                          <div style={{ marginTop: 6, paddingLeft: 10, borderLeft: "2px solid #ede0da" }}>
                            {sorted.filter((d) => d.evidence).map((d) => (
                              <div key={d.id} style={{ fontSize: 12, color: "#5a4540", lineHeight: 1.5, marginTop: 3, fontStyle: "italic" }}>
                                <span style={{ fontStyle: "normal", fontWeight: 600 }}>{d.dimension_name.replace(/_/g, " ")}: </span>
                                {d.evidence}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
            {substrateOpen === "match_portrait" && (
              <div style={{ ...S.card, maxHeight: 520, overflowY: "auto" }}>
                <div style={{ fontSize: 11, color: "#a95d49", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Portrait — for a potential match
                </div>
                <NarrativeBlock state={narratives.match_portrait} onRegenerate={() => fetchNarrative("match_portrait")} />
              </div>
            )}
          </>
        );
      })()}

      {/* ── 4. Angelica's read + Health ── */}
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1.3fr 0.7fr" }}>
        <div style={{ ...S.card, overflow: "hidden" }}>
          <div style={S.cardTitle}>Angelica's read</div>
          {essentialTruth?.text ? (
            <div style={{ ...S.quote, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
              "{essentialTruth.text}"
            </div>
          ) : (
            <div style={S.mutedText}>No essential truth yet.</div>
          )}
          {activeHypotheses.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, color: "#a95d49", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                Hypotheses ({activeHypotheses.length})
              </div>
              {activeHypotheses.slice(0, 2).map((h) => (
                <div key={h.id} style={{ fontSize: 11, color: "#5a4540", lineHeight: 1.4, marginBottom: 3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{h.text}</div>
              ))}
              {activeHypotheses.length > 2 && <div style={S.mutedText}>+{activeHypotheses.length - 2} more</div>}
            </div>
          )}
          {latestObserverNote?.note && (
            <div style={{ marginTop: 8, borderTop: "1px solid #ede0da", paddingTop: 8 }}>
              <div style={{ fontSize: 10, color: "#a95d49", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Observer note</div>
              <div style={{ fontSize: 12, color: "#5a4540", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{latestObserverNote.note}</div>
            </div>
          )}
        </div>
        <div style={{ ...S.card, overflow: "hidden" }}>
          <div style={S.cardTitle}>
            Health
            {cqScore != null && <span style={{ marginLeft: 6, color: "#a95d49", fontSize: 11 }}>CQ {cqScore.toFixed(1)}/10</span>}
          </div>
          {latestCQ ? (
            CQ_OVERVIEW_KEYS.map((k) => (
              <ScoreBar key={k} label={niceLabel(k)} value={latestCQ[k]} max={10} />
            ))
          ) : (
            <div style={S.mutedText}>No CQ readings yet.</div>
          )}
          {latestScore && (
            <div style={{ marginTop: 6, borderTop: "1px solid #ede0da", paddingTop: 6 }}>
              <ScoreBar label="Trust" value={latestScore.trust_score} />
              <ScoreBar label="Depth" value={latestScore.depth_score} />
              <ScoreBar label="Readiness" value={latestScore.readiness_score} />
            </div>
          )}
        </div>
      </div>

      {/* ── 5. All sessions ── */}
      <div style={S.card}>
        <div style={{ ...S.cardTitle, marginBottom: 8 }}>Sessions ({sessions.length})</div>
        {sessions.length === 0 ? (
          <div style={S.mutedText}>No sessions yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ede0da" }}>
                {["#", "Date", "Turns", "Dur", "Trust", "CQ", "Notes"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "3px 8px 5px 0", fontSize: 10, color: "#a95d49", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const msgs = (data.messages || []).filter((m) => m.session_id === s.id).length;
                const scoreRow = (data.scores || []).filter((r) => r.session_id === s.id).sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))[0] || null;
                const cqRow = (data.cq || []).filter((c) => c.session_id === s.id).sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))[0] || null;
                const dur = durationMin(s.started_at, s.ended_at);
                return (
                  <tr
                    key={s.id}
                    onClick={() => onOpenSession(s.id)}
                    style={{ borderBottom: "1px solid #f3ebe7", cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fdf6f3"}
                    onMouseLeave={(e) => e.currentTarget.style.background = ""}
                  >
                    <td style={{ padding: "5px 8px 5px 0", fontWeight: 600, color: "#3d2b24", whiteSpace: "nowrap" }}>{s.session_number}</td>
                    <td style={{ padding: "5px 8px 5px 0", color: "#815f55", whiteSpace: "nowrap" }}>{formatDate(s.started_at)}</td>
                    <td style={{ padding: "5px 8px 5px 0", color: "#815f55" }}>{msgs}</td>
                    <td style={{ padding: "5px 8px 5px 0", color: "#815f55", whiteSpace: "nowrap" }}>{dur != null ? `${dur}m` : "—"}</td>
                    <td style={{ padding: "5px 8px 5px 0", color: "#815f55" }}>{scoreRow?.trust_score ?? "—"}</td>
                    <td style={{ padding: "5px 8px 5px 0", color: "#815f55" }}>{cqOverall(cqRow) != null ? cqOverall(cqRow).toFixed(1) : "—"}</td>
                    <td style={{ padding: "5px 0", color: "#5a4540", maxWidth: 260, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{s.notes || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function UserSubstrate({ data, user }) {
  const portrait = (data.dimensions || []).filter((d) => d.user_id === user.id);
  const silences = (data.silences || [])
    .filter((s) => s.user_id === user.id)
    .sort((a, b) => (b.sessions_absent || 0) - (a.sessions_absent || 0));
  const partner = (data.partnerDimensions || []).filter((d) => d.user_id === user.id);
  const relationship = (data.relationshipDimensions || []).filter((d) => d.user_id === user.id);

  const portraitByGroup = portrait.reduce((acc, d) => {
    const key = d.grouping || "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  for (const key of Object.keys(portraitByGroup)) {
    portraitByGroup[key].sort((a, b) => (b.weight || 0) - (a.weight || 0));
  }

  return (
    <div className="va-substrate-grid" style={{ marginTop: 14, display: "grid", gap: 14, gridTemplateColumns: "1fr 1fr 1fr" }}>
      <div style={S.card}>
        <div style={S.cardTitle}>Portrait</div>
        {!portrait.length && <div style={S.mutedText}>No portrait dimensions captured yet.</div>}
        {Object.entries(portraitByGroup).map(([group, rows]) => (
          <div key={group} style={{ marginBottom: 10 }}>
            <div style={S.groupTitle}>{group}</div>
            {rows.slice(0, 12).map((d) => (
              <div key={d.id} style={S.keyValueRow}>
                <span>{d.dimension_name}</span>
                <span style={S.dimMeta}>{d.resolution || "-"} / w{d.weight || 0}</span>
              </div>
            ))}
          </div>
        ))}

        <div style={{ ...S.cardTitle, marginTop: 12 }}>Silences</div>
        {!silences.length && <div style={S.mutedText}>No silences tracked yet.</div>}
        {silences.map((s) => (
          <div key={s.id} style={S.keyValueRow}>
            <span>{s.topic}</span>
            <span style={S.dimMeta}>absent {s.sessions_absent || 0}</span>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Partner image</div>
        {!partner.length && (
          <div style={S.mutedText}>
            Empty until Stage 3 work begins. This is expected and not missing data.
          </div>
        )}
        {partner.map((d) => (
          <div key={d.id} style={S.keyValueRow}>
            <span>{d.dimension_name}</span>
            <span style={S.dimMeta}>{d.dimension_type || "-"}</span>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Relationship image</div>
        {!relationship.length && (
          <div style={S.mutedText}>
            Empty until Stage 3 work begins. This is expected and not missing data.
          </div>
        )}
        {relationship.map((d) => (
          <div key={d.id} style={S.keyValueRow}>
            <span>{d.dimension_name}</span>
            <span style={S.dimMeta}>tier {d.tier || "-"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserConversations({ data, user, sessions, onOpenSession }) {
  const sorted = sessions.slice().sort((a, b) => new Date(a.started_at) - new Date(b.started_at));

  return (
    <div style={{ marginTop: 14 }}>
      {!sorted.length && <div style={S.card}>No sessions for this user yet.</div>}
      {sorted.length > 0 && (
        <div style={S.card}>
          <div style={S.tableWrap}>
            <div style={{ ...S.tableRow, ...S.tableHeader }}>
              <div style={{ flex: 0.5 }}>#</div>
              <div style={{ flex: 1.4 }}>Date</div>
              <div style={{ flex: 0.7, textAlign: "right" }}>Turns</div>
              <div style={{ flex: 0.7, textAlign: "right" }}>Time</div>
              <div style={{ flex: 0.7, textAlign: "right" }}>Trust</div>
              <div style={{ flex: 0.7, textAlign: "right" }}>Depth</div>
              <div style={{ flex: 0.7, textAlign: "right" }}>CQ</div>
              <div style={{ flex: 1 }}>Stage</div>
              <div style={{ flex: 1.6 }}>What emerged</div>
            </div>
            {sorted.map((s) => {
              const msgs = (data.messages || []).filter((m) => m.session_id === s.id).length;
              const scoreRow = (data.scores || [])
                .filter((sc) => sc.session_id === s.id)
                .sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))[0] || null;
              const cqRow = (data.cq || [])
                .filter((c) => c.session_id === s.id)
                .sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))[0] || null;
              const keyMoments = (data.keyMoments || []).filter(
                (k) => k.user_id === s.user_id && Number(k.session_number) === Number(s.session_number)
              );
              const hypotheses = (data.hypotheses || []).filter(
                (h) => h.user_id === s.user_id && Number(h.created_session) === Number(s.session_number)
              );
              const emerged = [
                ...hypotheses.map((h) => h.text),
                ...keyMoments.map((k) => k.description),
              ][0] || null;

              return (
                <div
                  key={s.id}
                  style={{ ...S.tableRow, cursor: "pointer", alignItems: "flex-start" }}
                  className="va-table-row"
                  onClick={() => onOpenSession(s.id)}
                >
                  <div style={{ flex: 0.5, fontWeight: 600, color: "#a95d49" }}>#{s.session_number}</div>
                  <div style={{ flex: 1.4 }}>
                    <div>{formatDate(s.started_at)}</div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>{formatTime(s.started_at)}</div>
                  </div>
                  <div style={{ flex: 0.7, textAlign: "right" }}>{msgs}</div>
                  <div style={{ flex: 0.7, textAlign: "right", color: "#815f55" }}>
                    {durationMin(s.started_at, s.ended_at) || 0}m
                  </div>
                  <div style={{ flex: 0.7, textAlign: "right" }}>{scoreRow?.trust_score ?? "-"}</div>
                  <div style={{ flex: 0.7, textAlign: "right" }}>{scoreRow?.depth_score ?? "-"}</div>
                  <div style={{ flex: 0.7, textAlign: "right" }}>
                    {cqOverall(cqRow) != null ? cqOverall(cqRow).toFixed(1) : "-"}
                  </div>
                  <div style={{ flex: 1, color: "#815f55" }}>{labelForStage(s.stage)}</div>
                  <div style={{ flex: 1.6, color: "#666", fontSize: 12, whiteSpace: "normal", lineHeight: 1.4 }}>
                    {emerged || <span style={{ color: "#bbb" }}>—</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionCard({ session, data, onOpen }) {
  const messages = (data.messages || []).filter((m) => m.session_id === session.id);
  const fragments = (data.fragments || []).filter(
    (f) => f.user_id === session.user_id && Number(f.session_number) === Number(session.session_number)
  );
  const hypotheses = (data.hypotheses || []).filter(
    (h) =>
      h.user_id === session.user_id &&
      (Number(h.created_session) === Number(session.session_number) ||
        Number(h.resolved_session) === Number(session.session_number))
  );
  const keyMoments = (data.keyMoments || []).filter(
    (k) => k.user_id === session.user_id && Number(k.session_number) === Number(session.session_number)
  );
  const territory = (data.territory || []).filter(
    (t) => t.user_id === session.user_id && Number(t.last_visited_session) === Number(session.session_number)
  );
  const dimensions = (data.dimensions || []).filter(
    (d) => d.user_id === session.user_id && Number(d.last_evidence_session) === Number(session.session_number)
  );

  const scoreRows = (data.scores || [])
    .filter((s) => s.session_id === session.id)
    .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
  const trailingScore = scoreRows[scoreRows.length - 1] || null;

  const cqRows = (data.cq || [])
    .filter((c) => c.session_id === session.id)
    .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
  const trailingCQ = cqRows[cqRows.length - 1] || null;

  const transitions = stageTransitionsForSession(data.stageTransitions || [], session);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>
          Session {session.session_number}
          <span style={{ marginLeft: 10, color: "#a95d49", fontSize: 12 }}>
            Stage {session.stage ?? "-"} - Level {session.level ?? "-"}
          </span>
        </div>
        <div style={S.mutedText}>
          {timeAgo(session.started_at)} - {durationMin(session.started_at, session.ended_at) || 0}m - {messages.length} turns
        </div>
      </div>

      {!!transitions.length && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#b8b4af" }}>
          Transitions: {transitions.map((t) => `${t.from_stage || "?"}->${t.to_stage || "?"}`).join(", ")}
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <div style={S.groupTitle}>What emerged</div>
        <ul style={S.simpleList}>
          {fragments.slice(0, 3).map((f) => (
            <li key={f.id}>Fragment: "{f.text}"</li>
          ))}
          {hypotheses.map((h) => (
            <li key={h.id}>Hypothesis {Number(h.created_session) === Number(session.session_number) ? "added" : h.status}: {h.text}</li>
          ))}
          {keyMoments.map((k) => (
            <li key={k.id}>Key moment: {k.description}</li>
          ))}
          {territory.map((t) => (
            <li key={t.id}>Territory: {t.territory} (depth {t.depth || 0}/5)</li>
          ))}
          {!!dimensions.length && <li>{dimensions.length} dimensions evidenced</li>}
          {!fragments.length && !hypotheses.length && !keyMoments.length && !territory.length && !dimensions.length && (
            <li style={{ color: "#8e8882" }}>No substrate updates recorded for this session.</li>
          )}
        </ul>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center", fontSize: 12 }}>
        <span>Trust {trailingScore?.trust_score ?? "-"}</span>
        <span>Depth {trailingScore?.depth_score ?? "-"}</span>
        <span>Readiness {trailingScore?.readiness_score ?? "-"}</span>
        <span>CQ {cqOverall(trailingCQ) != null ? cqOverall(trailingCQ).toFixed(1) : "-"}</span>
        <button onClick={onOpen} style={{ ...S.secondaryBtn, marginLeft: "auto" }}>Open conversation</button>
      </div>
    </div>
  );
}

function UserCQ({ data, user, sessions }) {
  const cqRows = (data.cq || [])
    .filter((c) => c.user_id === user.id)
    .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));

  const sessionOrder = sessions
    .slice()
    .sort((a, b) => new Date(a.started_at) - new Date(b.started_at))
    .map((s) => s.id);

  const notes = (data.observerNotes || [])
    .filter((n) => n.user_id === user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="va-cq-grid" style={{ marginTop: 14, display: "grid", gap: 14, gridTemplateColumns: "1.5fr 1fr" }}>
      <div style={S.card}>
        <div style={S.cardTitle}>CQ dimensions across sessions</div>
        {!cqRows.length && <div style={S.mutedText}>No CQ rows yet.</div>}
        {CQ_GROUPS.map((g) => (
          <div key={g.label} style={{ marginBottom: 14 }}>
            <div style={S.groupTitle}>{g.label}</div>
            {g.keys.map((key) => {
              const values = sessionOrder.map((sid) => {
                const row = cqRows.find((r) => r.session_id === sid);
                return row ? Number(row[key]) : null;
              });
              const latestVal = [...values].reverse().find((v) => v != null);
              return (
                <div key={key} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11 }}>{niceLabel(key)}</span>
                    <span style={{ ...S.dimMeta, color: "#a95d49" }}>
                      {latestVal != null ? `${latestVal}/10` : "-"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {values.map((v, i) => (
                      <div
                        key={`${key}-${i}`}
                        title={v == null ? "No reading" : `${v}/10`}
                        style={{
                          height: 20,
                          flex: 1,
                          borderRadius: 3,
                          background:
                            v == null
                              ? "#25211e"
                              : i === values.length - 1
                                ? "#a95d49"
                                : `rgba(214, 171, 108, ${Math.max(0.2, v / 10)})`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Observer notes</div>
        {!notes.length && <div style={S.mutedText}>No observer notes yet.</div>}
        {notes.map((n) => (
          <div key={n.id} style={S.noteCard}>
            <div style={S.noteText}>{n.note}</div>
            <div style={S.noteMeta}>
              {n.rubric_version || "-"} - {formatDate(n.created_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionSurface({
  data,
  user,
  session,
  activePane,
  onSelectPane,
  onOpenSession,
  sessionNoteDraft,
  setSessionNoteDraft,
  addSessionNote,
  messageNoteDraft,
  setMessageNoteDraft,
  addMessageNote,
}) {
  const messages = (data.messages || [])
    .filter((m) => m.session_id === session.id)
    .sort((a, b) => {
      const t = new Date(a.created_at) - new Date(b.created_at);
      if (t !== 0) return t;
      // Same timestamp: user message comes before assistant reply.
      if (a.role !== b.role) return a.role === "user" ? -1 : 1;
      return (a.id || "").localeCompare(b.id || "");
    });

  const substrate = buildSessionSubstrate(data, user.id, session);

  const cqRows = (data.cq || [])
    .filter((c) => c.user_id === user.id)
    .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
  const cqRow = cqRows.find((r) => r.session_id === session.id) || null;
  const previousCq = cqRows.find((r) => new Date(r.measured_at) < new Date(cqRow?.measured_at || 0)) || null;

  const observerNotes = (data.observerNotes || [])
    .filter((n) => n.session_id === session.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const messageNotes = (data.messageNotes || [])
    .filter((n) => messages.some((m) => m.id === n.message_id))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const messageById = new Map(messages.map((m) => [m.id, m]));

  const nudges = cqNudgesFor(cqRow);

  // Sibling sessions for this user, ordered by session_number
  const userSessions = (data.sessions || [])
    .filter((s) => s.user_id === user.id)
    .sort((a, b) => Number(a.session_number) - Number(b.session_number));
  const idx = userSessions.findIndex((s) => s.id === session.id);
  const prevSession = idx > 0 ? userSessions[idx - 1] : null;
  const nextSession = idx >= 0 && idx < userSessions.length - 1 ? userSessions[idx + 1] : null;

  return (
    <div style={S.section}>
      <div
        style={{
          position: "sticky",
          top: 142, // sits below The Balcony + tabs + breadcrumbs
          zIndex: 40,
          background: "#efdcd5",
          margin: "-16px -20px 12px",
          padding: "10px 20px",
          borderBottom: "1px solid #dcc1b7",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => prevSession && onOpenSession?.(prevSession.id)}
            disabled={!prevSession}
            style={{ ...S.secondaryBtn, opacity: prevSession ? 1 : 0.4, cursor: prevSession ? "pointer" : "default" }}
            title={prevSession ? `Session ${prevSession.session_number}` : ""}
          >
            ← Prev
          </button>
          <select
            value={session.id}
            onChange={(e) => onOpenSession?.(e.target.value)}
            style={{ ...S.input, padding: "6px 10px", fontWeight: 600, color: "#3d2b24" }}
          >
            {userSessions.map((s) => (
              <option key={s.id} value={s.id}>
                Session {s.session_number} — {formatDate(s.started_at)}
              </option>
            ))}
          </select>
          <button
            onClick={() => nextSession && onOpenSession?.(nextSession.id)}
            disabled={!nextSession}
            style={{ ...S.secondaryBtn, opacity: nextSession ? 1 : 0.4, cursor: nextSession ? "pointer" : "default" }}
            title={nextSession ? `Session ${nextSession.session_number}` : ""}
          >
            Next →
          </button>
        </div>
        <div style={S.mutedText}>
          {durationMin(session.started_at, session.ended_at) || 0}m · {messages.length} turns · stage {session.stage ?? "-"} / level {session.level ?? "-"}
        </div>
      </div>

      {/* Conversation + observer notes aligned by message */}
      {(() => {
        // Build a map from anchor message id to the latest CQ reading for that anchor
        const sortedCq = [...cqRows].sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
        const anchorByCq = new Map(); // cq.id -> message
        for (const cq of sortedCq) {
          const cqT = new Date(cq.measured_at).getTime();
          let anchor = null;
          for (let i = messages.length - 1; i >= 0; i--) {
            if (new Date(messages[i].created_at).getTime() <= cqT) { anchor = messages[i]; break; }
          }
          anchorByCq.set(cq.id, anchor);
        }
        const cqByAnchorId = new Map(); // message.id -> latest cq
        for (const cq of sortedCq) {
          const a = anchorByCq.get(cq.id);
          if (a) cqByAnchorId.set(a.id, cq);
        }

        return (
          <div style={{ ...S.card, marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", columnGap: 14, marginBottom: 8 }}>
              <div style={S.cardTitle}>Conversation</div>
              <div style={{ ...S.cardTitle, color: "#6b8e7f", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span>Observer ({sortedCq.length})</span>
                <CopyObserverButton user={user} session={session} messages={messages} sortedCq={sortedCq} anchorByCq={anchorByCq} observerNotes={observerNotes} />
              </div>
            </div>
            {!messages.length && <div style={S.mutedText}>No messages in this session.</div>}
            <div className="va-msg-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", columnGap: 14, rowGap: 10, alignItems: "start" }}>
              {messages.map((m) => {
                const isUser = m.role === "user";
                const cq = cqByAnchorId.get(m.id) || null;
                const isGuest = (user.invited_by_name || "").toLowerCase().includes("guest");
                const wordCount = isUser
                  ? (m.content || "").trim().split(/\s+/).filter(Boolean).length
                  : 0;
                return (
                  <Fragment key={m.id}>
                    <div style={{ ...S.messageCard, ...(isUser ? S.userMessageCard : S.assistantMessageCard) }}>
                      <div style={S.messageMeta}>
                        <span>{isUser ? (user.display_name || "User") : "Angelica"}</span>
                        <span>{formatTime(m.created_at)}</span>
                      </div>
                      {isUser && !isGuest ? (
                        <div
                          style={{
                            background: "#fff",
                            border: "1px solid #e5e0d8",
                            borderRadius: 8,
                            minHeight: 44,
                            padding: "10px 12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            color: "#9a9285",
                            fontSize: 12,
                            fontStyle: "italic",
                            letterSpacing: "0.02em",
                          }}
                          title="User message hidden from admin"
                        >
                          {wordCount} {wordCount === 1 ? "word" : "words"}
                        </div>
                      ) : (
                        <div style={S.messageBody}>{m.content}</div>
                      )}
                    </div>
                    <div>
                      {cq ? (
                        <ObserverFeedCard cq={cq} anchor={null} userName={user.display_name || "User"} />
                      ) : null}
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Panels below the conversation */}
      <div style={{ marginTop: 14, display: "grid", gap: 14, gridTemplateColumns: "1fr 1fr 1fr", alignItems: "start" }}>
        <CQVerdictPane cqRow={cqRow} previousCq={previousCq} observerNotes={observerNotes} />
        <SubstrateSnapshotPane substrate={substrate} />
        <NotesPane
          session={session}
          observerNotes={observerNotes}
          messageNotes={messageNotes}
          messageById={messageById}
          sessionNoteDraft={sessionNoteDraft}
          setSessionNoteDraft={setSessionNoteDraft}
          addSessionNote={addSessionNote}
        />
      </div>
    </div>
  );
}

function buildSessionSubstrate(data, userId, session) {
  return {
    fragments: (data.fragments || []).filter(
      (f) => f.user_id === userId && Number(f.session_number) === Number(session.session_number)
    ),
    hypotheses: (data.hypotheses || []).filter(
      (h) =>
        h.user_id === userId &&
        (Number(h.created_session) === Number(session.session_number) ||
          Number(h.resolved_session) === Number(session.session_number))
    ),
    keyMoments: (data.keyMoments || []).filter(
      (k) => k.user_id === userId && Number(k.session_number) === Number(session.session_number)
    ),
    dimensions: (data.dimensions || []).filter(
      (d) => d.user_id === userId && Number(d.last_evidence_session) === Number(session.session_number)
    ),
    territory: (data.territory || []).filter(
      (t) => t.user_id === userId && Number(t.last_visited_session) === Number(session.session_number)
    ),
  };
}

function ObserverFeedPane({ cqRows, messages, userName }) {
  const sorted = [...(cqRows || [])].sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));

  // For each reading, find the last message at or before its timestamp,
  // so we can show the user a turn anchor (e.g. "after Kim's reply at 8:34")
  const anchored = sorted.map((cq) => {
    const cqT = new Date(cq.measured_at).getTime();
    let anchor = null;
    for (let i = (messages || []).length - 1; i >= 0; i--) {
      const m = messages[i];
      if (new Date(m.created_at).getTime() <= cqT) { anchor = m; break; }
    }
    return { cq, anchor };
  });

  return (
    <div style={S.card}>
      <div style={{ ...S.cardTitle, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span>Observer feed</span>
        <span style={{ fontSize: 10, color: "#815f55", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
          {sorted.length} reading{sorted.length === 1 ? "" : "s"}
        </span>
      </div>
      {sorted.length === 0 && <div style={S.mutedText}>No Observer readings for this session yet.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 720, overflowY: "auto", paddingRight: 4 }}>
        {anchored.map(({ cq, anchor }) => (
          <ObserverFeedCard key={cq.id} cq={cq} anchor={anchor} userName={userName} />
        ))}
      </div>
    </div>
  );
}

function roomLabel(r) {
  if (!r) return null;
  return r.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}
function roomColor(r) {
  if (r === "therapy" || r === "confessional") return "#6b8e7f"; // receptive — green
  if (r === "studio" || r === "dating_admin" || r === "matchmaker") return "#a95d49"; // generative — terracotta
  return "#8a7a6b"; // arrival — taupe
}

function ObserverFeedCard({ cq, anchor, userName }) {
  const dims = [
    "honesty","trust","safety","investment",
    "anticipation","momentum","progress_belief","frustration",
    "return_signal","depth_signal","arrival_state",
    "orientation","goal_aliveness","agency","dependency_risk",
  ];
  const lowGood = new Set(["frustration","dependency_risk"]);
  // Only flag the most extreme few — concerns or breakthrough highs
  const concerns = dims
    .filter((k) => cq[k] != null)
    .map((k) => ({ k, v: cq[k], concern: lowGood.has(k) ? cq[k] >= 7 : cq[k] <= 4 }))
    .filter((d) => d.concern)
    .slice(0, 3);

  return (
    <div style={{
      borderLeft: "3px solid #6b8e7f",
      background: "#f4f0eb",
      borderRadius: 3,
      padding: "10px 12px",
      fontSize: 12,
      color: "#3d2b24",
      lineHeight: 1.5,
    }}>
      {(cq.room || cq.conversation_level || cq.alert) && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5, flexWrap: "wrap" }}>
          {cq.room && (
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
              color: "#fff", background: roomColor(cq.room),
              padding: "1px 6px", borderRadius: 2,
            }}>
              {roomLabel(cq.room)}
            </span>
          )}
          {cq.conversation_level && (
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
              color: "#3d2b24", background: "#fff", border: "1px solid #d6c4b3",
              padding: "1px 6px", borderRadius: 2,
            }}>
              L{cq.conversation_level}
            </span>
          )}
          {cq.alert && (
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
              color: "#a95d49",
            }}>
              ⚠ {cq.alert.replace(/_/g, " ")}
            </span>
          )}
        </div>
      )}

      {cq.delta_summary && (
        <div style={{ marginBottom: concerns.length ? 6 : 0 }}>
          {cq.delta_summary}
        </div>
      )}

      {concerns.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {concerns.map(({ k, v }) => (
            <span key={k} style={{
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: 2,
              background: "#a95d49",
              color: "#fff",
            }}>
              {niceLabel(k)} {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ObserverInline({ cq }) {
  const dims = [
    "honesty","trust","safety","investment",
    "anticipation","momentum","progress_belief","frustration",
    "return_signal","depth_signal","arrival_state",
    "orientation","goal_aliveness","agency","dependency_risk",
  ];
  const lowGood = new Set(["frustration","dependency_risk"]);
  const highlights = dims
    .filter((k) => cq[k] != null)
    .map((k) => ({ k, v: cq[k] }))
    .filter(({ k, v }) => (lowGood.has(k) ? v >= 7 : v <= 4 || v >= 8))
    .slice(0, 4);
  const rationale = cq.rationale || {};
  return (
    <div style={{
      margin: "2px 0",
      padding: "8px 10px",
      borderLeft: "3px solid #6b8e7f",
      background: "#f4f0eb",
      borderRadius: 3,
      fontSize: 11,
      color: "#3d2b24",
      lineHeight: 1.45,
    }}>
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#6b8e7f",
        marginBottom: 4,
        display: "flex",
        justifyContent: "space-between",
      }}>
        <span>Observer</span>
        {cq.alert && (
          <span style={{ color: "#a95d49" }}>⚠ {cq.alert.replace(/_/g, " ")}</span>
        )}
      </div>
      {cq.delta_summary && (
        <div style={{ fontStyle: "italic", marginBottom: highlights.length ? 5 : 0 }}>
          {cq.delta_summary}
        </div>
      )}
      {highlights.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
          {highlights.map(({ k, v }) => {
            const concern = lowGood.has(k) ? v >= 7 : v <= 4;
            return (
              <span key={k} style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 2,
                background: concern ? "#a95d49" : "#6b8e7f",
                color: "#fff",
              }}>
                {niceLabel(k)} {v}
              </span>
            );
          })}
        </div>
      )}
      {Object.keys(rationale).length > 0 && (
        <div style={{ fontSize: 10, color: "#5a4540" }}>
          {Object.entries(rationale).slice(0, 2).map(([k, txt]) => (
            <div key={k} style={{ marginTop: 2 }}>
              <strong style={{ color: "#6b8e7f" }}>{niceLabel(k)}:</strong> {txt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubstrateSnapshotPane({ substrate }) {
  const { fragments, hypotheses, keyMoments, dimensions, territory } = substrate;
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>What emerged this session</div>

      <SectionList title={`Key moments (${keyMoments.length})`}>
        {keyMoments.map((k) => <li key={k.id}>{k.description}</li>)}
      </SectionList>

      <SectionList title={`Fragments (${fragments.length})`}>
        {fragments.map((f) => <li key={f.id}>"{f.text}"</li>)}
      </SectionList>

      <SectionList title={`Hypotheses (${hypotheses.length})`}>
        {hypotheses.map((h) => (
          <li key={h.id}>
            {Number(h.created_session) === Number(h.session_number) ? "new" : h.status}: {h.text}
          </li>
        ))}
      </SectionList>

      <SectionList title={`Dimensions evidenced (${dimensions.length})`}>
        {dimensions.map((d) => <li key={d.id}>{d.dimension_name}</li>)}
      </SectionList>

      <SectionList title={`Territory updated (${territory.length})`}>
        {territory.map((t) => <li key={t.id}>{t.territory} (depth {t.depth || 0}/5)</li>)}
      </SectionList>

      {!fragments.length && !hypotheses.length && !keyMoments.length && !dimensions.length && !territory.length && (
        <div style={S.mutedText}>No extraction data for this session yet.</div>
      )}
    </div>
  );
}

function CQVerdictPane({ cqRow, previousCq, observerNotes }) {
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>CQ verdict</div>
      {!cqRow && <div style={S.mutedText}>No CQ reading for this session.</div>}

      {cqRow && (
        <>
          {CQ_GROUPS.map((g) => (
            <div key={g.label} style={{ marginBottom: 10 }}>
              <div style={S.groupTitle}>{g.label}</div>
              {g.keys.map((key) => {
                const nowVal = cqRow[key];
                if (nowVal == null) return null;
                const prevVal = previousCq?.[key];
                const delta = prevVal == null ? null : Number(nowVal) - Number(prevVal);
                return (
                  <div key={key} style={S.keyValueRow}>
                    <span>{niceLabel(key)}</span>
                    <span>
                      {nowVal}/10
                      {delta != null && (
                        <span style={{ marginLeft: 6, color: delta >= 0 ? "#82bd8b" : "#d7958b" }}>
                          {delta >= 0 ? "+" : ""}
                          {delta.toFixed(1)}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}

      <div style={{ marginTop: 12 }}>
        <div style={S.groupTitle}>Observer note</div>
        {!observerNotes.length && <div style={S.mutedText}>No observer note for this session.</div>}
        {observerNotes.map((n) => (
          <div key={n.id} style={S.noteCard}>
            <div style={S.noteText}>{n.note}</div>
            <div style={S.noteMeta}>
              rubric {n.rubric_version || "-"} - model {n.model_identifier || "-"} - {formatDate(n.created_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesPane({
  session,
  observerNotes,
  messageNotes,
  messageById,
  sessionNoteDraft,
  setSessionNoteDraft,
  addSessionNote,
}) {
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Notes</div>

      <div style={S.groupTitle}>Session notes</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={sessionNoteDraft}
          onChange={(e) => setSessionNoteDraft(e.target.value)}
          placeholder="Add note for this session"
          style={S.input}
        />
        <button onClick={() => addSessionNote(session.id)} style={S.secondaryBtn}>Save</button>
      </div>

      <div style={{ marginTop: 10 }}>
        {observerNotes.map((n) => (
          <div key={n.id} style={S.noteCard}>
            <div style={S.noteText}>{n.note}</div>
            <div style={S.noteMeta}>{formatDate(n.created_at)}</div>
          </div>
        ))}
      </div>

      <div style={{ ...S.groupTitle, marginTop: 14 }}>Per-message notes</div>
      {!messageNotes.length && <div style={S.mutedText}>No per-message notes yet.</div>}
      {messageNotes.map((n) => {
        const message = messageById.get(n.message_id);
        return (
          <div key={n.id} style={S.noteCard}>
            <div style={S.noteMeta}>
              {message ? `${message.role} at ${formatTime(message.created_at)}` : "Message"}
            </div>
            <div style={S.noteText}>{n.note}</div>
            <div style={S.noteMeta}>{formatDate(n.created_at)}</div>
          </div>
        );
      })}
    </div>
  );
}

function InvitesTab({
  invites,
  newInviteName,
  setNewInviteName,
  newInviterName,
  setNewInviterName,
  createInvite,
  deleteInvite,
  reinvite,
}) {
  const origin = "https://verona-demo.vercel.app";

  return (
    <div style={S.section}>
      <div style={S.card}>
        <div style={S.cardTitle}>Create invite</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newInviteName}
            onChange={(e) => setNewInviteName(e.target.value)}
            placeholder="Name"
            style={S.input}
          />
          <input
            value={newInviterName}
            onChange={(e) => setNewInviterName(e.target.value)}
            placeholder="Inviter name (optional)"
            style={S.input}
          />
          <button onClick={createInvite} style={S.primaryBtn}>Create</button>
        </div>
      </div>

      <div style={{ ...S.card, marginTop: 14 }}>
        <div style={S.cardTitle}>Invites</div>
        {!invites.length && <div style={S.mutedText}>No invites yet.</div>}
        {invites.map((inv) => {
          const url = `${origin}/?invite=${inv.token}`;
          return (
            <div key={inv.id} style={S.inviteRow}>
              <div style={{ minWidth: 170 }}>
                <div style={{ fontWeight: 600 }}>{inv.name}</div>
                <div style={S.mutedText}>
                  {inv.inviter_name ? `from ${inv.inviter_name}` : "-"}
                </div>
                <div style={S.mutedText}>{inv.used_at ? `Used ${timeAgo(inv.used_at)}` : "Unused"}</div>
              </div>

              <input
                value={url}
                readOnly
                onClick={(e) => {
                  e.target.select();
                  navigator.clipboard.writeText(e.target.value);
                }}
                style={{ ...S.input, fontSize: 11 }}
              />

              <button onClick={() => navigator.clipboard.writeText(url)} style={S.secondaryBtn}>Copy</button>
              {inv.used_at && <button onClick={() => reinvite(inv.id)} style={S.secondaryBtn}>Reinvite</button>}
              <button onClick={() => deleteInvite(inv.id)} style={S.dangerBtn}>Delete</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ANGELICA_SECTIONS = [
  { id: "core", label: "Core persona" },
  { id: "levels", label: "Levels" },
  { id: "rooms", label: "Rooms" },
  { id: "images", label: "Images" },
];

function AngelicaTab() {
  const [section, setSection] = useState("core");
  return (
    <div>
      <div style={{
        display: "flex",
        gap: 6,
        padding: "12px 20px",
        borderBottom: "1px solid #dcc1b7",
        background: "#f6e5df",
      }}>
        {ANGELICA_SECTIONS.map((s) => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                background: active ? "#a95d49" : "transparent",
                color: active ? "#fff" : "#8e6a60",
                border: active ? "1px solid #a95d49" : "1px solid #e2c9bf",
                borderRadius: 4,
                padding: "7px 16px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.04em",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      {section === "core" && <PromptManager promptKey="angelica" />}
      {section === "levels" && <LevelsTab />}
      {section === "rooms" && <RoomsTab />}
      {section === "images" && <ImagesTab />}
    </div>
  );
}

const LEVEL_SUBTABS = [
  { id: "level1", key: "level_1", label: "1 — Warm stranger" },
  { id: "level2", key: "level_2", label: "2 — Knows them" },
  { id: "level3", key: "level_3", label: "3 — Trusted advisor" },
];

const ROOM_SUBTABS = [
  { id: "entrance",     key: "room_entrance",     label: "Entrance" },
  { id: "lounge",       key: "room_lounge",       label: "Lounge" },
  { id: "therapy",      key: "room_therapy",      label: "Therapy" },
  { id: "studio",       key: "room_studio",       label: "Studio" },
  { id: "confessional", key: "room_confessional", label: "Confessional" },
  { id: "dating_admin", key: "room_dating_admin", label: "Dating Admin" },
  { id: "matchmaker",   key: "room_matchmaker",   label: "Matchmaker" },
];

const ROOM_SPECS = {
  entrance: {
    kind: "Arrival",
    question: "Who has just walked in?",
    description:
      "The Entrance is where Angelica meets the user for the first time, or for the first time in a while. First impressions are formed here — provisional, light-touch. Nothing is fixed in substrate from the Entrance alone; everything observed here is held until a real conversation in another room confirms or revises it.",
    behaviour: "Warm, curious, unhurried. Ask what brings them today; do not push.",
    notAllowed: "Extracting strong claims about who they are. Treating an opening line as substrate.",
    closing: "Light — a small step into whichever room feels right next.",
    recording: "Standard. Provisional only.",
  },
  lounge: {
    kind: "Arrival",
    question: "What does she want from a quiet conversation?",
    description:
      "The Lounge is where the user goes when they don't want to do work. Nothing is built here, by design. Angelica is companionable, warm, present. The Lounge produces no substrate — it produces continuity of relationship.",
    behaviour: "Easy presence. Match their energy. Keep it small.",
    notAllowed: "Steering toward Studio work. Reading depth into casual remarks.",
    closing: "Stay open. Do not push toward another room.",
    recording: "Standard. No substrate writes from the Lounge.",
  },
  therapy: {
    kind: "Receptive",
    question: "What is unmetabolised that needs to be heard?",
    description:
      "The Therapy room is where the user brings something unmetabolised — grief, an unprocessed past, a fear that has been there a while. Angelica's job is to listen, not to build. Material from this room is RECEPTIVE: it is held, not extracted, and only crosses into the user's substrate with explicit consent.",
    behaviour: "Quiet. Slow. Do not move first. Hold rather than analyse. When you speak, name what you heard, gently, without diagnosis.",
    notAllowed: "Coaching, building, producing. Treating what is said as substrate. Pushing toward integration before they have been heard. Suggesting other rooms unless invited.",
    closing: "Do not close on a forward-looking question. Hold rather than advance: \"Thank you for trusting me with this. We don't need to talk about anyone else for a while.\"",
    recording: "Receptive. Writes to receptive_material, not substrate. Consent required to cross.",
  },
  studio: {
    kind: "Generative",
    question: "What recognition or image are we shaping together?",
    description:
      "The Studio is where the user does the work of seeing themselves and imagining the partner and life they want. Recognitions are surfaced. Partner image and Relationship image are shaped here. Specificity matters — concrete scenes, not abstractions.",
    behaviour: "Curious, generative, willing to push gently for texture. Reflect, ask for the concrete, build images alongside.",
    notAllowed: "Vague affirmations in place of specificity. Producing horoscope prose.",
    closing: "Forward-looking is fine here. Name what was learned. Invite the next layer.",
    recording: "Standard. Writes to portrait / partner / relationship dimensions.",
  },
  confessional: {
    kind: "Receptive",
    question: "What single true sentence wants to be said?",
    description:
      "The Confessional is for the truths that are hard to say and want only to be said — once, plainly. Single sentences. Angelica receives them. They do not become substrate unless the user explicitly says they should.",
    behaviour: "Receive, do not analyse. Acknowledge cleanly. Do not unpack.",
    notAllowed: "Probing. Extracting. Linking the truth to a dimension.",
    closing: "Hold. \"I've heard it. It stays here unless you want it to go further.\"",
    recording: "Receptive. Writes to receptive_material. Consent required to cross.",
  },
  dating_admin: {
    kind: "Generative (practical)",
    question: "What does a good evening look like, concretely?",
    description:
      "The Dating Admin room is the practical workshop for evenings — logistics, plans, what would actually be enjoyed, what would not. Concrete, light, useful.",
    behaviour: "Practical, warm, specific. Sketch evenings together. Test for what fits her real life.",
    notAllowed: "Drifting into Studio territory. Treating logistics as identity work.",
    closing: "Forward-looking. Land a concrete next step if there is one.",
    recording: "Standard. Writes to evenings / preferences as appropriate.",
  },
  matchmaker: {
    kind: "Generative (practical)",
    question: "Is there a match worth introducing?",
    description:
      "The Matchmaker room is where introductions happen. It is only meaningful when the Portrait gate is clear — resolution, specificity, and consent are all present. Until then the room exists but has nothing in it.",
    behaviour: "Specific, careful, honest about why a match is being suggested.",
    notAllowed: "Suggesting matches before the Portrait is ready. Inventing fit.",
    closing: "Concrete next step or honest \"not yet\".",
    recording: "Standard. Writes introductions only.",
  },
};

function SubTabBar({ items, value, onChange }) {
  return (
    <div style={{
      display: "flex",
      gap: 6,
      padding: "10px 20px",
      borderBottom: "1px solid #dcc1b7",
      flexWrap: "wrap",
    }}>
      {items.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              background: active ? "#a95d49" : "transparent",
              color: active ? "#fff" : "#8e6a60",
              border: active ? "1px solid #a95d49" : "1px solid #e2c9bf",
              borderRadius: 4,
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function LevelsTab() {
  const [sub, setSub] = useState("level1");
  const item = LEVEL_SUBTABS.find((t) => t.id === sub);
  return (
    <div>
      <SubTabBar items={LEVEL_SUBTABS} value={sub} onChange={setSub} />
      <PromptManager key={sub} promptKey={item.key} />
    </div>
  );
}

function RoomsTab() {
  const [sub, setSub] = useState("entrance");
  const item = ROOM_SUBTABS.find((t) => t.id === sub);
  const spec = ROOM_SPECS[sub];
  return (
    <div>
      <SubTabBar items={ROOM_SUBTABS} value={sub} onChange={setSub} />
      {spec && <RoomSpecPanel spec={spec} />}
      <PromptManager key={sub} promptKey={item.key} />
    </div>
  );
}

function RoomSpecPanel({ spec }) {
  const kindColor = spec.kind.startsWith("Receptive")
    ? "#6b8e7f"
    : spec.kind.startsWith("Generative")
    ? "#a95d49"
    : "#8a7a6b";
  return (
    <div style={{ ...S.card, marginTop: 8, marginBottom: 12, background: "#fbf6f1" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
        <div style={{ ...S.cardTitle, marginBottom: 0 }}>{spec.question}</div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: kindColor }}>
          {spec.kind}
        </div>
      </div>
      <div style={{ fontSize: 13, color: "#3d2b24", lineHeight: 1.5, marginBottom: 10 }}>{spec.description}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 12, color: "#3d2b24" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b8e7f", marginBottom: 4 }}>How Angelica shows up</div>
          <div style={{ marginBottom: 8 }}>{spec.behaviour}</div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a95d49", marginBottom: 4 }}>What she must not do</div>
          <div>{spec.notAllowed}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b8e7f", marginBottom: 4 }}>Closing ritual</div>
          <div style={{ marginBottom: 8 }}>{spec.closing}</div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8a7a6b", marginBottom: 4 }}>Recording rule</div>
          <div>{spec.recording}</div>
        </div>
      </div>
    </div>
  );
}

const IMAGE_SUBTABS = [
  { id: "self", key: "artefact_self", label: "Self image" },
  { id: "partner", key: "artefact_partner", label: "Partner image" },
  { id: "relationship", key: "artefact_relationship", label: "Relationship image" },
  { id: "portrait", key: "artefact_portrait", label: "Portrait (for a match)" },
];

const IMAGE_SPECS = {
  self: {
    question: "Who is this person?",
    description:
      "The Self image is Angelica's working understanding of the user — what she is like, what she cares about, fears, and hopes for. It is built turn by turn from what the user says and from what their behaviour reveals. The written self image is a 2\u20133 paragraph plain-English description used internally and as a building block of the Portrait.",
    table: "portrait_dimensions",
    totalDimensions: 100,
    parameters: [
      { name: "dimension_name", desc: "e.g. independence, conflict_style, ambition" },
      { name: "grouping", desc: "thematic cluster (values, temperament, history, etc.)" },
      { name: "position_stated", desc: "1\u201310. What she says about herself." },
      { name: "position_revealed", desc: "1\u201310. What her words & history reveal." },
      { name: "weight", desc: "1\u201310. How load-bearing this dimension is for her." },
      { name: "vector", desc: "stable | moving_up | moving_down" },
      { name: "evidence", desc: "Short quote or note grounding the read." },
      { name: "confidence", desc: "1\u20135. How sure Angelica is." },
      { name: "resolution", desc: "unvisited \u2192 emerging \u2192 forming \u2192 clear \u2192 tested" },
    ],
  },
  partner: {
    question: "What kind of partner does she want?",
    description:
      "The Partner image describes the qualities the user is looking for in a partner. Stated values are what she says she wants; revealed values are what her own portrait and history actually point to. The two often differ \u2014 the gap is itself useful information.",
    table: "partner_dimensions",
    totalDimensions: 50,
    parameters: [
      { name: "dimension_name", desc: "e.g. emotional_intelligence, ambition, kindness" },
      { name: "grouping", desc: "thematic cluster (values, temperament, lifestyle, etc.)" },
      { name: "position_stated", desc: "1\u201310. What she says she wants." },
      { name: "position_revealed", desc: "1\u201310. What her self image / history suggest she actually needs." },
      { name: "weight", desc: "1\u201310. How important this is to her." },
      { name: "flexibility", desc: "rigid | moderate | flexible \u2014 how negotiable this is." },
      { name: "evidence", desc: "Short quote or note." },
      { name: "confidence", desc: "1\u20135." },
      { name: "resolution", desc: "unvisited \u2192 emerging \u2192 forming \u2192 clear \u2192 tested" },
    ],
  },
  relationship: {
    question: "What kind of relationship does she want?",
    description:
      "The Relationship image is the shape of the shared life she wants \u2014 not personality traits, but how the two lives fit together. Stated = what she imagines wanting. Revealed = what her history and current life actually evidence about the shape that fits her.",
    table: "relationship_dimensions",
    totalDimensions: 50,
    parameters: [
      { name: "dimension_name", desc: "e.g. shared_finances, time_alone, pace_of_life" },
      { name: "grouping", desc: "thematic cluster (rhythm, money, family, intimacy, etc.)" },
      { name: "position_stated", desc: "1\u201310. What she imagines wanting." },
      { name: "position_revealed", desc: "1\u201310. What her history actually evidences." },
      { name: "weight", desc: "1\u201310. How load-bearing this is for the shared life." },
      { name: "flexibility", desc: "rigid | moderate | flexible." },
      { name: "evidence", desc: "Short quote or note." },
      { name: "confidence", desc: "1\u20135." },
      { name: "resolution", desc: "unvisited \u2192 emerging \u2192 forming \u2192 clear \u2192 tested" },
    ],
  },
  portrait: {
    question: "Portrait \u2014 for a potential match",
    description:
      "The Portrait is a ~300-word piece of prose written for someone who has not yet met her, but might. It weaves the Self, Partner and Relationship images into a single coherent description \u2014 warm, observant, honest. It is not a dating profile and not a marketing blurb. It is the artefact a real human reader could form a true sense of her from.",
    sources: ["portrait_dimensions", "partner_dimensions", "relationship_dimensions"],
    parameters: [
      { name: "name", desc: "User's display name. Use {name} in the instruction text to interpolate." },
      { name: "length", desc: "~300 words, 2\u20134 paragraphs, no headings or lists." },
      { name: "voice", desc: "Warm, observant, honest. First-person-omniscient about her, not first-person from her." },
    ],
  },
};

function ImageSpecPanel({ id }) {
  const spec = IMAGE_SPECS[id];
  if (!spec) return null;
  return (
    <div style={{ padding: "16px 20px", background: "#fbf6f3", borderBottom: "1px solid #ede0da" }}>
      <div style={{ fontSize: 11, color: "#a95d49", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {spec.question}
      </div>
      <div style={{ fontSize: 13, color: "#3d2b24", lineHeight: 1.6, marginBottom: 12 }}>{spec.description}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, color: "#a95d49", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Parameters</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {spec.parameters.map((p) => (
              <div key={p.name} style={{ fontSize: 12, color: "#5a4540", lineHeight: 1.4 }}>
                <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#3d2b24" }}>{p.name}</span>
                <span style={{ color: "#888" }}> — {p.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#a95d49", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Data model</div>
          {spec.table && (
            <div style={{ fontSize: 12, color: "#5a4540", lineHeight: 1.5 }}>
              <div>Table: <span style={{ fontFamily: "monospace", color: "#3d2b24" }}>{spec.table}</span></div>
              <div>Capacity: {spec.totalDimensions} dimensions per user.</div>
              <div style={{ marginTop: 4, color: "#888" }}>Written turn-by-turn by the portrait analyzer ({"PORTRAIT_ANALYSIS_PROMPT"}). Resolution advances as confidence grows.</div>
            </div>
          )}
          {spec.sources && (
            <div style={{ fontSize: 12, color: "#5a4540", lineHeight: 1.5 }}>
              <div>Sources:</div>
              {spec.sources.map((s) => (
                <div key={s} style={{ fontFamily: "monospace", color: "#3d2b24", marginLeft: 8 }}>• {s}</div>
              ))}
              <div style={{ marginTop: 4, color: "#888" }}>Composed at request time — no separate table. Will be persisted to <span style={{ fontFamily: "monospace" }}>artefacts</span> at session-end (planned).</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ImagesTab() {
  const [sub, setSub] = useState("self");
  const item = IMAGE_SUBTABS.find((t) => t.id === sub);
  return (
    <div>
      <SubTabBar items={IMAGE_SUBTABS} value={sub} onChange={setSub} />
      <ImageSpecPanel id={sub} />
      <PromptManager key={sub} promptKey={item.key} />
    </div>
  );
}

function PromptManager({ promptKey }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editContent, setEditContent] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [activatingId, setActivatingId] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);

  const pw = () => sessionStorage.getItem("admin-pw");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/prompts?key=${encodeURIComponent(promptKey)}`, { headers: { authorization: pw() } });
    const { versions: v } = await res.json();
    setVersions(v || []);
    const active = (v || []).find((x) => x.is_active);
    if (active) setEditContent(active.content || "");
    setLoading(false);
  }

  useEffect(() => { load(); }, [promptKey]);

  useEffect(() => {
    if (versions.length > 0 && !selectedVersion) {
      const active = versions.find((v) => v.is_active) || versions[0];
      setSelectedVersion(active);
      setEditContent(active?.content || "");
    }
  }, [versions, selectedVersion]);

  const activeVersion = versions.find((v) => v.is_active);
  const baseContent = selectedVersion?.content || activeVersion?.content || "";
  const isDirty = editContent !== baseContent;

  function nextRevisionLabel(baseLabel) {
    const root = (baseLabel || "v").replace(/\.\d+$/, "");
    const revisionPattern = new RegExp(`^${root.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\.(\\d+)$`);
    let maxRev = 0;
    for (const v of versions) {
      const m = (v.label || "").match(revisionPattern);
      if (m) maxRev = Math.max(maxRev, parseInt(m[1], 10));
    }
    return `${root}.${maxRev + 1}`;
  }

  async function saveRevision() {
    if (!selectedVersion || !isDirty) return;
    setSaving(true);
    setSaveError(null);
    const revLabel = nextRevisionLabel(selectedVersion.label || "v");
    const res = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: pw() },
      body: JSON.stringify({
        content: editContent,
        label: revLabel,
        notes: `Revision of ${selectedVersion.label || "active"}`,
        key: promptKey,
      }),
    });
    const json = await res.json();
    if (json.error) {
      setSaveError(json.error);
      setSaving(false);
      return;
    }
    setSelectedVersion(null);
    await load();
    setSaving(false);
  }

  async function saveNewVersion() {
    if (!editLabel.trim()) {
      setSaveError("Give this version a label before saving");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const res = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: pw() },
      body: JSON.stringify({ content: editContent, label: editLabel, notes: editNotes, key: promptKey }),
    });
    const json = await res.json();
    if (json.error) {
      setSaveError(json.error);
      setSaving(false);
      return;
    }
    setEditLabel("");
    setEditNotes("");
    await load();
    setSaving(false);
  }

  async function activateVersion(id) {
    setActivatingId(id);
    await fetch("/api/prompts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", authorization: pw() },
      body: JSON.stringify({ id, key: promptKey }),
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

  if (loading) return <div style={{ ...S.section, color: "#9ca29f" }}>Loading prompt manager...</div>;

  return (
    <div style={S.section}>
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14 }}>
        <div style={S.card}>
          <div style={S.cardTitle}>Prompt versions ({versions.length})</div>

          <div style={{ marginBottom: 12 }}>
            <input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              placeholder="New version label"
              style={{ ...S.input, marginBottom: 6 }}
            />
            <input
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Notes (optional)"
              style={S.input}
            />
            <button
              onClick={saveNewVersion}
              disabled={saving || !editLabel.trim()}
              style={{ ...S.primaryBtn, width: "100%", marginTop: 8, opacity: saving ? 0.6 : 1 }}
            >
              Save new + activate
            </button>
          </div>

          {versions.map((v) => {
            const isSelected = selectedVersion?.id === v.id;
            return (
              <div
                key={v.id || "seed"}
                onClick={() => { setSelectedVersion(v); setEditContent(v.content || ""); }}
                style={{
                  border: `1px solid ${v.is_active ? "#6b8e7f" : isSelected ? "#a95d49" : "#e2c9bf"}`,
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 8,
                  background: isSelected ? "#fbeae3" : "#fffdfb",
                  cursor: "pointer",
                  color: "#3d2722",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 600, color: "#3d2722" }}>{v.label}</div>
                  {v.is_active && (
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      color: "#fff",
                      background: "#6b8e7f",
                      padding: "2px 6px",
                      borderRadius: 3,
                    }}>LIVE</span>
                  )}
                </div>
                <div style={S.noteMeta}>
                  {v.created_at ? timeAgo(v.created_at) : "from code"}
                  {v.notes ? ` - ${v.notes}` : ""}
                </div>
              </div>
            );
          })}
          {saveError && <div style={S.errorText}>{saveError}</div>}
        </div>

        <div style={S.card}>
          {selectedVersion && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>{selectedVersion.label}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => navigator.clipboard.writeText(editContent)} style={S.secondaryBtn}>Copy</button>
                {!selectedVersion.is_active && selectedVersion.id && (
                  <button
                    onClick={() => activateVersion(selectedVersion.id)}
                    disabled={activatingId === selectedVersion.id}
                    style={S.secondaryBtn}
                  >
                    {activatingId === selectedVersion.id ? "Activating..." : "Make live"}
                  </button>
                )}
                {!selectedVersion.is_active && selectedVersion.id && (
                  <button onClick={() => deleteVersion(selectedVersion.id)} style={S.dangerBtn}>Delete</button>
                )}
              </div>
            </div>
          )}

          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            style={{
              width: "100%",
              minHeight: 560,
              background: "#111",
              color: "#d8d1c8",
              border: `1px solid ${isDirty ? "#6a5631" : "#2a3331"}`,
              borderRadius: 8,
              padding: 12,
              fontFamily: "monospace",
              lineHeight: 1.5,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <div style={S.mutedText}>{editContent.length.toLocaleString()} chars</div>
            {selectedVersion && isDirty && (
              <button onClick={saveRevision} disabled={saving} style={S.primaryBtn}>
                {saving ? "Saving..." : `Save as ${nextRevisionLabel(selectedVersion.label || "v")}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max = 10 }) {
  if (value == null) return null;
  const pct = Math.max(0, Math.min(100, (Number(value) / max) * 100));
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 11 }}>{label}</span>
        <span style={S.dimMeta}>{value}/{max}</span>
      </div>
      <div style={S.barTrack}>
        <div style={{ ...S.barFill, width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SectionList({ title, children }) {
  const list = Array.isArray(children) ? children.filter(Boolean) : children;
  if (!list || (Array.isArray(list) && !list.length)) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={S.groupTitle}>{title}</div>
      <ul style={S.simpleList}>{children}</ul>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={S.statCard}>
      <div style={S.statValue}>{value}</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: "#efdcd5",
    color: "#3d2722",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
  },
  section: { padding: "16px 20px" },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #d6b9af",
    background: "linear-gradient(180deg, #f6e5df 0%, #f2dfd8 100%)",
  },
  title: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 30,
    color: "#8f4634",
    letterSpacing: "0.01em",
  },
  tabStrip: {
    display: "flex",
    gap: 4,
    padding: "0 20px",
    borderBottom: "1px solid #d6b9af",
  },
  tabBtn: {
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    color: "#8e6a60",
    fontSize: 12,
    fontWeight: 600,
    padding: "10px 14px",
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  tabBtnActive: {
    borderBottomColor: "#a95d49",
    color: "#a95d49",
  },
  breadcrumbs: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 20px",
    borderBottom: "1px solid #dcc1b7",
    color: "#9d756a",
    fontSize: 12,
  },
  crumbLink: { color: "#a95d49", cursor: "pointer" },
  crumbCurrent: { color: "#5a3b34" },
  crumbSep: { color: "#b78e84" },

  loginCard: {
    width: 320,
    margin: "100px auto",
    background: "#fffdfb",
    border: "1px solid #e2c9bf",
    borderRadius: 10,
    padding: 22,
    boxShadow: "0 10px 30px rgba(139, 74, 58, 0.08)",
  },

  card: {
    background: "#fffdfb",
    border: "1px solid #e2c9bf",
    borderRadius: 10,
    padding: 14,
    boxShadow: "0 4px 14px rgba(139, 74, 58, 0.05)",
  },
  cardTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#a35d4c",
    marginBottom: 10,
    fontWeight: 600,
  },

  statsRow: { display: "grid", gap: 10, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" },
  statCard: {
    background: "#fffdfb",
    border: "1px solid #e2c9bf",
    borderRadius: 10,
    padding: 14,
    textAlign: "center",
    boxShadow: "0 4px 14px rgba(139, 74, 58, 0.05)",
  },
  statValue: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 34,
    color: "#9b5443",
    lineHeight: 1,
  },
  statLabel: {
    marginTop: 6,
    fontSize: 11,
    color: "#987268",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },

  tableWrap: {
    display: "flex",
    flexDirection: "column",
    border: "1px solid #e4cbc2",
    borderRadius: 8,
    overflow: "hidden",
  },
  tableRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: "10px 12px",
    borderBottom: "1px solid #efdad2",
    cursor: "pointer",
  },
  tableHeader: {
    background: "#f7ece7",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#9d756a",
    fontWeight: 600,
    cursor: "default",
  },

  headerStrip: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    padding: 12,
    background: "#fffdfb",
    border: "1px solid #e2c9bf",
    borderRadius: 10,
  },
  headerCell: { minWidth: 140 },
  headerLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#9a7469",
    marginBottom: 4,
  },
  headerValue: { fontSize: 13, color: "#5a3c34" },

  innerTabs: { display: "flex", gap: 4, marginTop: 12, borderBottom: "1px solid #dcc2b8" },
  innerTabBtn: {
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: "8px 12px",
    color: "#927066",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
  },
  innerTabBtnActive: {
    borderBottomColor: "#a95d49",
    color: "#a95d49",
  },

  quote: {
    fontFamily: "'Cormorant Garamond', serif",
    fontStyle: "italic",
    fontSize: 24,
    color: "#5f3f37",
    lineHeight: 1.3,
  },

  chip: {
    background: "#fff7f3",
    border: "1px solid #e6cec5",
    borderRadius: 6,
    padding: "8px 10px",
    marginBottom: 6,
  },

  groupTitle: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#9a7469",
    marginBottom: 6,
  },
  keyValueRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 12,
    padding: "4px 0",
    borderBottom: "1px solid #f0ddd6",
  },
  dimMeta: { color: "#9c766b", fontSize: 11 },

  paneTabs: { display: "flex", gap: 4, marginBottom: 8 },
  paneTabBtn: {
    background: "#fff7f3",
    border: "1px solid #e4c9c0",
    borderRadius: 6,
    color: "#947066",
    fontSize: 11,
    cursor: "pointer",
    padding: "6px 8px",
  },
  paneTabBtnActive: {
    borderColor: "#a95d49",
    color: "#a95d49",
  },

  messageCard: {
    borderRadius: 8,
    padding: 10,
    border: "1px solid #e4cbc2",
  },
  userMessageCard: { background: "#fff8f5", borderLeft: "3px solid #c28673" },
  assistantMessageCard: { background: "#fdf4ef", borderLeft: "3px solid #a35d4c" },
  messageMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 10,
    color: "#9a756b",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 6,
  },
  messageBody: { whiteSpace: "pre-wrap", lineHeight: 1.55, color: "#4f362f" },

  noteCard: {
    background: "#fff7f3",
    border: "1px solid #e6cec5",
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
  },
  noteText: { fontSize: 12, whiteSpace: "pre-wrap", lineHeight: 1.5 },
  noteMeta: { marginTop: 4, fontSize: 10, color: "#9a756b" },

  inviteRow: {
    display: "grid",
    gridTemplateColumns: "170px 1fr auto auto auto",
    gap: 8,
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #efdad2",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#ffffff",
    color: "#4f362f",
    border: "1px solid #e2c9bf",
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 12,
    outline: "none",
    fontFamily: "inherit",
  },

  primaryBtn: {
    background: "#a95d49",
    color: "#fff8f4",
    border: "none",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryBtn: {
    background: "#fff7f3",
    color: "#7e5a4f",
    border: "1px solid #e1c7be",
    borderRadius: 6,
    padding: "7px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
  secondaryBtnActive: {
    borderColor: "#a95d49",
    color: "#a95d49",
    background: "#fceee8",
  },
  dangerBtn: {
    background: "#fff3f2",
    color: "#b04f46",
    border: "1px solid #efc3bf",
    borderRadius: 6,
    padding: "7px 10px",
    fontSize: 12,
    cursor: "pointer",
  },

  barTrack: {
    height: 5,
    borderRadius: 999,
    background: "#f1dcd3",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    background: "#a95d49",
  },

  simpleList: {
    margin: 0,
    paddingLeft: 18,
    color: "#5a3c34",
    lineHeight: 1.5,
    fontSize: 12,
  },

  mutedText: { fontSize: 11, color: "#9b7468" },
  warnBar: {
    margin: "10px 20px 0 20px",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #e4c2a0",
    background: "#fff5e8",
    color: "#9b6a2e",
    fontSize: 11,
  },
  errorText: { color: "#b04f46", fontSize: 12, marginTop: 10 },
};
