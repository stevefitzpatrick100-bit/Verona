import { getSupabaseServer } from "@/lib/supabase";

// GET: list all invites
export async function GET(req) {
  const auth = req.headers.get("authorization");
  if (auth !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("invites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ invites: data });
}

// POST: create a new invite
// Body: { name, inviter_name }
//   name         = who is being invited (e.g. "Tracey")
//   inviter_name = who is introducing them (e.g. "Sarah")
export async function POST(req) {
  const auth = req.headers.get("authorization");
  if (auth !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, inviter_name } = await req.json();
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });

  const supabase = getSupabaseServer();

  // Generate a short random token
  const token = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 8);

  const { data, error } = await supabase
    .from("invites")
    .insert({ token, name, inviter_name: inviter_name || null })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ invite: data });
}

// PATCH: reinvite — create a new unused invite linked to same user
// Body: { id } (the id of the used invite to reinvite)
export async function PATCH(req) {
  const auth = req.headers.get("authorization");
  if (auth !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return Response.json({ error: "ID required" }, { status: 400 });

  const supabase = getSupabaseServer();

  // Fetch the original invite
  const { data: original, error: fetchErr } = await supabase
    .from("invites")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !original) {
    return Response.json({ error: "Invite not found" }, { status: 404 });
  }

  // Generate a new token
  const token = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 8);

  // Create new invite pre-linked to the same user
  const { data, error } = await supabase
    .from("invites")
    .insert({
      token,
      name: original.name,
      inviter_name: original.inviter_name,
      user_id: original.user_id,
      used_at: null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ invite: data });
}

// DELETE: remove an invite
export async function DELETE(req) {
  const auth = req.headers.get("authorization");
  if (auth !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return Response.json({ error: "ID required" }, { status: 400 });

  const supabase = getSupabaseServer();
  const { error } = await supabase.from("invites").delete().eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
