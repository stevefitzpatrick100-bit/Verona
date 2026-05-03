import { getSupabaseServer } from "@/lib/supabase";

function unauthorized(req) {
  const auth = req.headers.get("authorization");
  return auth !== process.env.ADMIN_PASSWORD;
}

export async function GET(req) {
  if (unauthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const messageId = url.searchParams.get("messageId");
  if (!messageId) {
    return Response.json({ error: "messageId required" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("message_prompts")
    .select("message_id, system_prompt, prompt_label, room, model, created_at")
    .eq("message_id", messageId)
    .maybeSingle();

  if (error) {
    if (/does not exist/i.test(error.message || "")) {
      return Response.json({ error: "snapshot table missing" }, { status: 404 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json(data);
}
