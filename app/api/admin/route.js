import { getSupabaseServer } from "@/lib/supabase";

export async function GET(req) {
  const auth = req.headers.get("authorization");
  if (auth !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();

  try {
    const [
      { data: users },
      { data: sessions },
      { data: messages },
      { data: scores },
      { data: fragments },
      { data: hypotheses },
      { data: dims },
      { data: keyMoments },
      { data: silences },
      { data: territory },
      { data: essentialTruth },
      { data: invites },
    ] = await Promise.all([
      supabase.from("users").select("*").order("created_at", { ascending: false }),
      supabase.from("sessions").select("*").order("started_at", { ascending: false }),
      supabase.from("messages").select("*").order("created_at", { ascending: false }),
      supabase.from("scores").select("*").order("measured_at", { ascending: false }),
      supabase.from("fragments").select("*").order("created_at", { ascending: false }),
      supabase.from("hypotheses").select("*").order("created_at", { ascending: false }),
      supabase.from("portrait_dimensions").select("*").neq("resolution", "unvisited").order("weight", { ascending: false }),
      supabase.from("key_moments").select("*").order("created_at", { ascending: false }),
      supabase.from("silences").select("*"),
      supabase.from("territory_map").select("*").gt("depth", 0),
      supabase.from("essential_truth").select("*"),
      supabase.from("invites").select("*").order("created_at", { ascending: false }),
    ]);

    return Response.json({
      users: users || [],
      sessions: sessions || [],
      messages: messages || [],
      scores: scores || [],
      fragments: fragments || [],
      hypotheses: hypotheses || [],
      dimensions: dims || [],
      keyMoments: keyMoments || [],
      silences: silences || [],
      territory: territory || [],
      essentialTruth: essentialTruth || [],
      invites: invites || [],
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const auth = req.headers.get("authorization");
  if (auth !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await req.json();
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });

  const supabase = getSupabaseServer();

  // Clear the invite link so the token can't be reused to recreate the user
  await supabase.from("invites").update({ user_id: null, used_at: null }).eq("user_id", userId);

  // Delete the user — cascades to all sessions, messages, scores, dimensions, etc.
  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
