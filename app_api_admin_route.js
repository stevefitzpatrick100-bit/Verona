import { getSupabaseServer } from "@/lib/supabase";

// -----------------------------------------------------------------
// GET /api/admin
// Returns everything the three admin views need.
// At ~10 users this is fine to send as one payload. Refactor to
// scoped endpoints when volume grows.
// -----------------------------------------------------------------
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
      { data: dimensions },
      { data: keyMoments },
      { data: silences },
      { data: territory },
      { data: essentialTruth },
      { data: invites },
    ] = await Promise.all([
      supabase.from("users").select("*").order("created_at", { ascending: false }),
      supabase.from("sessions").select("*").order("started_at", { ascending: false }),
      supabase.from("messages").select("*").order("created_at", { ascending: true }),
      supabase.from("scores").select("*").order("measured_at", { ascending: true }),
      supabase.from("fragments").select("*").order("created_at", { ascending: true }),
      supabase.from("hypotheses").select("*").order("created_at", { ascending: true }),
      supabase.from("portrait_dimensions").select("*").neq("resolution", "unvisited"),
      supabase.from("key_moments").select("*").order("created_at", { ascending: true }),
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
      dimensions: dimensions || [],
      keyMoments: keyMoments || [],
      silences: silences || [],
      territory: territory || [],
      essentialTruth: essentialTruth || [],
      invites: invites || [],
    });
  } catch (e) {
    console.error("Admin GET error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
