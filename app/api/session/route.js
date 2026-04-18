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
