"use client";
import { useState } from "react";

export default function Welcome() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data.userId) {
        throw new Error(data.error || "Something went wrong");
      }
      localStorage.setItem("verona-user-id", data.userId);
      localStorage.setItem("verona-guest", "1");
      localStorage.removeItem("verona-invite");
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4ece4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Georgia, serif",
        color: "#3d2b24",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          background: "#fbf6f1",
          border: "1px solid #e0d2c4",
          borderRadius: 8,
          padding: "32px 28px",
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 2px 12px rgba(61, 43, 36, 0.06)",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            marginBottom: 6,
            letterSpacing: "0.01em",
          }}
        >
          Verona
        </div>
        <div style={{ fontSize: 14, color: "#7a6258", marginBottom: 22, lineHeight: 1.5 }}>
          Welcome. Before we begin, what should I call you?
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your first name"
          autoFocus
          maxLength={60}
          style={{
            width: "100%",
            padding: "12px 14px",
            fontSize: 16,
            fontFamily: "inherit",
            color: "#3d2b24",
            background: "#fff",
            border: "1px solid #d6c4b3",
            borderRadius: 6,
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {error && (
          <div style={{ marginTop: 10, color: "#a95d49", fontSize: 13 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={busy || !name.trim()}
          style={{
            marginTop: 18,
            width: "100%",
            padding: "12px 16px",
            fontSize: 15,
            fontFamily: "inherit",
            color: "#fbf6f1",
            background: busy || !name.trim() ? "#c9b8a8" : "#3d2b24",
            border: "none",
            borderRadius: 6,
            cursor: busy || !name.trim() ? "default" : "pointer",
            letterSpacing: "0.02em",
          }}
        >
          {busy ? "Just a moment…" : "Begin"}
        </button>

        <div style={{ marginTop: 18, fontSize: 11, color: "#9a8a7d", lineHeight: 1.5 }}>
          Conversations stay private to your session. You can leave any time.
        </div>
      </form>
    </div>
  );
}
