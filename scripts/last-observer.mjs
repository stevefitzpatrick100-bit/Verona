import { getSupabaseServer } from "../lib/supabase.js";

const userQuery = process.argv[2] || "Sophie";
const s = getSupabaseServer();

const { data: users } = await s
  .from("users").select("id, display_name")
  .ilike("display_name", `%${userQuery}%`);
if (!users?.length) { console.error("no user"); process.exit(1); }
const user = users[0];
console.log("User:", user.display_name, user.id);

const { data: rows } = await s
  .from("cq_dimensions")
  .select("*")
  .eq("user_id", user.id)
  .order("measured_at", { ascending: false })
  .limit(5);

for (const r of rows || []) {
  console.log("---");
  console.log("at:", r.measured_at);
  console.log("room:", r.room, "  level:", r.conversation_level);
  console.log("delta:", r.delta_summary);
  console.log("narration:", r.narration);
  if (r.alert) console.log("ALERT:", r.alert);
}
