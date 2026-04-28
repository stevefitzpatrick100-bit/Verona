import { getSupabaseServer } from "@/lib/supabase";

// Public endpoint — creates a guest user from a generic /welcome URL.
// No invite token required. The user's name is supplied client-side.
//
// Body: { name }
// Returns: { userId, name }
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const rawName = (body?.name || "").toString().trim();
  if (!rawName) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  // Light hygiene: cap length, strip control chars
  const name = rawName.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 60);
  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const userId = crypto.randomUUID();

  const { error } = await supabase.from("users").insert({
    id: userId,
    display_name: name,
    invited_by_name: "Guest signup",
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ userId, name });
}
