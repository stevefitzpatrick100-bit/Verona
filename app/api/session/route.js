import { getSupabaseServer } from "@/lib/supabase";

export async function POST(req) {
  const { userId, action } = await req.json();

  if (!userId) {
    return Response.json({ error: "No user ID" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  if (action === "start") {
    // Ensure the user record exists
    await supabase.from("users").upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });

    // Get session count
    const { count } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // Create new session
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        session_number: (count || 0) + 1,
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ session: data });
  }

  if (action === "end") {
    const { sessionId } = await req.json().catch(() => ({}));
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
