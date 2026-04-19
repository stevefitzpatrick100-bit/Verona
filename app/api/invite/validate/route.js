import { getSupabaseServer } from "@/lib/supabase";

// Validate an invite token and return/create the associated user.
// On first use, also copies the inviter's name onto the user so
// Angelica can reference them in her opening message.
export async function POST(req) {
  const { token } = await req.json();
  if (!token) return Response.json({ error: "No token" }, { status: 400 });

  const supabase = getSupabaseServer();

  // Look up the invite
  const { data: invite, error } = await supabase
    .from("invites")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !invite) {
    return Response.json({ error: "Invalid invite" }, { status: 404 });
  }

  // Reinvite: user_id is set but used_at is null — let them back in
  if (invite.user_id && !invite.used_at) {
    await supabase
      .from("invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);
    return Response.json({ userId: invite.user_id, name: invite.name });
  }

  // Single-use: if already fully claimed, reject
  if (invite.user_id) {
    return Response.json({ error: "This invite has already been used" }, { status: 403 });
  }

  // First use — create a user and link it
  const userId = crypto.randomUUID();
  await supabase.from("users").upsert(
    {
      id: userId,
      display_name: invite.name,
      invited_by_name: invite.inviter_name || null,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  await supabase
    .from("invites")
    .update({ user_id: userId, used_at: new Date().toISOString() })
    .eq("id", invite.id);

  return Response.json({ userId, name: invite.name });
}
