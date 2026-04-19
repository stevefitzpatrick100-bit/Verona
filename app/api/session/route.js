import { getSupabaseServer } from "@/lib/supabase";

export async function POST(req) {
  const { userId, action, sessionId } = await req.json();

  if (!userId) {
    return Response.json({ error: "No user ID" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  if (action === "start") {
    // Ensure the user record exists
    await supabase.from("users").upsert(
      { id: userId },
      { onConflict: "id", ignoreDuplicates: true }
    );

    // Fetch user details (names for the opening message)
    const { data: user } = await supabase
      .from("users")
      .select("display_name, invited_by_name")
      .eq("id", userId)
      .single();

    // Check if there is a recent session within the 4-hour continuation window
    const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
    const { data: recentSessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(1);

    const lastSession = recentSessions?.[0];
    const lastActivity = lastSession?.ended_at || lastSession?.started_at;

    if (lastSession && lastActivity && (Date.now() - new Date(lastActivity).getTime()) < FOUR_HOURS_MS) {
      // Resume the existing session — not a new session
      return Response.json({ session: lastSession, isFirstSession: false });
    }

    // Count existing sessions to determine session_number
    const { count } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    const sessionNumber = (count || 0) + 1;
    const isFirstSession = sessionNumber === 1;

    // Create the new session
    const { data: session, error } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        session_number: sessionNumber,
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ session, isFirstSession });
  }

  if (action === "end") {
    if (sessionId) {
      await supabase
        .from("sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", sessionId);
    }
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
