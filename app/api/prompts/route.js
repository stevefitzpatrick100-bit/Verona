import { getSupabaseServer } from "@/lib/supabase";
import { ANGELICA_SYSTEM_PROMPT } from "@/lib/prompts";

function authCheck(req) {
  return req.headers.get("authorization") === process.env.ADMIN_PASSWORD;
}

// GET — list all versions for a prompt_key (default: angelica)
export async function GET(req) {
  if (!authCheck(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key") || "angelica";

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("prompt_versions")
    .select("id, version_number, label, notes, is_active, created_at, content")
    .eq("prompt_key", key)
    .order("version_number", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // If no DB versions yet, return the hardcoded one as a virtual v0
  if (!data || data.length === 0) {
    return Response.json({
      versions: [{
        id: null,
        version_number: 1,
        label: "v1 — original (from code)",
        notes: "Hardcoded in lib/prompts.js — save a new version to begin tracking",
        is_active: true,
        created_at: null,
        content: ANGELICA_SYSTEM_PROMPT,
      }],
    });
  }

  return Response.json({ versions: data });
}

// POST — save a new version (becomes active immediately)
export async function POST(req) {
  if (!authCheck(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { content, label, notes, key = "angelica" } = await req.json();
  if (!content?.trim()) return Response.json({ error: "content is required" }, { status: 400 });

  const supabase = getSupabaseServer();

  // Get next version number
  const { data: latest } = await supabase
    .from("prompt_versions")
    .select("version_number")
    .eq("prompt_key", key)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (latest?.version_number || 0) + 1;

  // Deactivate all existing versions
  await supabase.from("prompt_versions").update({ is_active: false }).eq("prompt_key", key);

  // Insert new active version
  const { data, error } = await supabase
    .from("prompt_versions")
    .insert({
      prompt_key: key,
      version_number: nextVersion,
      label: label?.trim() || `v${nextVersion}`,
      content: content.trim(),
      notes: notes?.trim() || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ version: data });
}

// PATCH — activate an existing version by id
export async function PATCH(req) {
  if (!authCheck(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, key = "angelica" } = await req.json();
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const supabase = getSupabaseServer();
  await supabase.from("prompt_versions").update({ is_active: false }).eq("prompt_key", key);
  const { error } = await supabase.from("prompt_versions").update({ is_active: true }).eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

// DELETE — delete a non-active version
export async function DELETE(req) {
  if (!authCheck(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const supabase = getSupabaseServer();

  // Safety: don't allow deleting the active version
  const { data: v } = await supabase.from("prompt_versions").select("is_active").eq("id", id).single();
  if (v?.is_active) return Response.json({ error: "Cannot delete the active version" }, { status: 400 });

  const { error } = await supabase.from("prompt_versions").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

