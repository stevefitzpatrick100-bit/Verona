import { getSupabaseServer } from "@/lib/supabase";

function unauthorized(req) {
  const auth = req.headers.get("authorization");
  return auth !== process.env.ADMIN_PASSWORD;
}

async function selectSafe(queryPromise, tableName, missingTables) {
  const { data, error } = await queryPromise;
  if (!error) return data || [];

  const missingTable = error.code === "42P01" || /does not exist/i.test(error.message || "");
  if (missingTable) {
    missingTables.add(tableName);
    return [];
  }

  throw error;
}

export async function GET(req) {
  if (unauthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  const missingTables = new Set();

  try {
    const [
      users,
      sessions,
      messages,
      scores,
      fragments,
      hypotheses,
      dimensions,
      keyMoments,
      silences,
      territory,
      essentialTruth,
      invites,
      cq,
      partnerDimensions,
      relationshipDimensions,
      observerNotes,
      messageNotes,
      stageTransitions,
    ] = await Promise.all([
      selectSafe(
        supabase.from("users").select("*").order("created_at", { ascending: false }),
        "users",
        missingTables
      ),
      selectSafe(
        supabase.from("sessions").select("*").order("started_at", { ascending: false }),
        "sessions",
        missingTables
      ),
      selectSafe(
        supabase.from("messages").select("*").order("created_at", { ascending: true }),
        "messages",
        missingTables
      ),
      selectSafe(
        supabase.from("scores").select("*").order("measured_at", { ascending: true }),
        "scores",
        missingTables
      ),
      selectSafe(
        supabase.from("fragments").select("*").order("created_at", { ascending: true }),
        "fragments",
        missingTables
      ),
      selectSafe(
        supabase.from("hypotheses").select("*").order("created_at", { ascending: true }),
        "hypotheses",
        missingTables
      ),
      selectSafe(
        supabase
          .from("portrait_dimensions")
          .select("*")
          .neq("resolution", "unvisited")
          .order("weight", { ascending: false }),
        "portrait_dimensions",
        missingTables
      ),
      selectSafe(
        supabase.from("key_moments").select("*").order("created_at", { ascending: true }),
        "key_moments",
        missingTables
      ),
      selectSafe(supabase.from("silences").select("*"), "silences", missingTables),
      selectSafe(
        supabase.from("territory_map").select("*").gt("depth", 0),
        "territory_map",
        missingTables
      ),
      selectSafe(
        supabase.from("essential_truth").select("*"),
        "essential_truth",
        missingTables
      ),
      selectSafe(
        supabase.from("invites").select("*").order("created_at", { ascending: false }),
        "invites",
        missingTables
      ),
      selectSafe(
        supabase.from("cq_dimensions").select("*").order("measured_at", { ascending: true }),
        "cq_dimensions",
        missingTables
      ),
      selectSafe(
        supabase.from("partner_dimensions").select("*").order("updated_at", { ascending: false }),
        "partner_dimensions",
        missingTables
      ),
      selectSafe(
        supabase
          .from("relationship_dimensions")
          .select("*")
          .order("updated_at", { ascending: false }),
        "relationship_dimensions",
        missingTables
      ),
      selectSafe(
        supabase.from("observer_notes").select("*").order("created_at", { ascending: false }),
        "observer_notes",
        missingTables
      ),
      selectSafe(
        supabase.from("message_notes").select("*").order("created_at", { ascending: false }),
        "message_notes",
        missingTables
      ),
      selectSafe(
        supabase.from("stage_transitions").select("*").order("created_at", { ascending: false }),
        "stage_transitions",
        missingTables
      ),
    ]);

    return Response.json({
      users,
      sessions,
      messages,
      scores,
      fragments,
      hypotheses,
      dimensions,
      keyMoments,
      silences,
      territory,
      essentialTruth,
      invites,
      cq,
      partnerDimensions,
      relationshipDimensions,
      observerNotes,
      messageNotes,
      stageTransitions,
      missingTables: [...missingTables],
    });
  } catch (e) {
    return Response.json({ error: e.message || "Admin GET failed" }, { status: 500 });
  }
}

export async function POST(req) {
  if (unauthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;
  const supabase = getSupabaseServer();

  if (action !== "add_observer_note") {
    return Response.json({ error: "Unsupported action" }, { status: 400 });
  }

  const { sessionId, note, rubricVersion, modelIdentifier } = body;
  if (!sessionId || !note) {
    return Response.json({ error: "sessionId and note are required" }, { status: 400 });
  }

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("id, user_id")
    .eq("id", sessionId)
    .single();

  if (sessionErr || !session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("observer_notes")
    .insert({
      session_id: sessionId,
      user_id: session.user_id,
      note,
      rubric_version: rubricVersion || null,
      model_identifier: modelIdentifier || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "42P01") {
      return Response.json(
        { error: "observer_notes table missing. Run migration 002_admin_v1_1.sql" },
        { status: 400 }
      );
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ observerNote: data });
}

export async function PATCH(req) {
  if (unauthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;
  const supabase = getSupabaseServer();

  if (action !== "add_message_note") {
    return Response.json({ error: "Unsupported action" }, { status: 400 });
  }

  const { messageId, note } = body;
  if (!messageId || !note) {
    return Response.json({ error: "messageId and note are required" }, { status: 400 });
  }

  const { data: message, error: msgErr } = await supabase
    .from("messages")
    .select("id, user_id, session_id")
    .eq("id", messageId)
    .single();

  if (msgErr || !message) {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("message_notes")
    .insert({
      message_id: messageId,
      user_id: message.user_id,
      session_id: message.session_id,
      note,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "42P01") {
      return Response.json(
        { error: "message_notes table missing. Run migration 002_admin_v1_1.sql" },
        { status: 400 }
      );
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ messageNote: data });
}

export async function DELETE(req) {
  if (unauthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await req.json();
  if (!userId) {
    return Response.json({ error: "userId required" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  await supabase.from("invites").update({ user_id: null, used_at: null }).eq("user_id", userId);

  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
