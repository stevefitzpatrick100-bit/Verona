import { getSupabaseServer } from "@/lib/supabase";

// GET /api/messages?sessionId=... — messages for a single session (scripted opening)
// GET /api/messages?userId=...   — all messages for a user across sessions (history)
export async function GET(req) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  const userId = url.searchParams.get("userId");

  const supabase = getSupabaseServer();

  if (sessionId) {
    const { data, error } = await supabase
      .from("messages")
      .select("role, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ messages: data || [] });
  }

  if (userId) {
    const { data, error } = await supabase
      .from("messages")
      .select("id, role, content, created_at, sessions(session_number, started_at)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ messages: data || [] });
  }

  return Response.json({ error: "sessionId or userId required" }, { status: 400 });
}
