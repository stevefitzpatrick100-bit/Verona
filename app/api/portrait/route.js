import { getSupabaseServer } from "@/lib/supabase";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return Response.json({ error: "No user ID" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  try {
    const [
      { data: dims },
      { data: scores },
      { data: params },
      { data: hyps },
      { data: frags },
      { data: terr },
      { data: truth },
      { data: cq },
    ] = await Promise.all([
      supabase.from("portrait_dimensions").select("*").eq("user_id", userId).neq("resolution", "unvisited").order("weight", { ascending: false }),
      supabase.from("scores").select("*").eq("user_id", userId).order("measured_at", { ascending: false }).limit(1),
      supabase.from("personality_params").select("*").eq("user_id", userId).single(),
      supabase.from("hypotheses").select("*").eq("user_id", userId).eq("status", "active"),
      supabase.from("fragments").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
      supabase.from("territory_map").select("*").eq("user_id", userId).gt("depth", 0),
      supabase.from("essential_truth").select("*").eq("user_id", userId).single(),
      supabase.from("cq_dimensions").select("*").eq("user_id", userId).order("measured_at", { ascending: false }).limit(1),
    ]);

    return Response.json({
      dimensions: dims || [],
      scores: scores?.[0] || null,
      params: params || null,
      hypotheses: hyps || [],
      fragments: frags || [],
      territory: terr || [],
      essentialTruth: truth?.text || null,
      cq: cq?.[0] || null,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
