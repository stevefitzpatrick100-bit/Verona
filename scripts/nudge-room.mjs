// One-shot: pin or unpin a user's room.
// Inserts a synthetic cq_dimensions row with a "[PIN]" or "[UNPIN]" marker in
// delta_summary. lib/rooms.getCurrentRoom prefers the most recent PIN over the
// Observer's reads, so Angelica stays put until the operator clears it.
//
// Usage:
//   node --env-file=.env.local scripts/nudge-room.mjs --user "Sophie" --room studio
//   node --env-file=.env.local scripts/nudge-room.mjs --user "Sophie" --clear

import { getSupabaseServer } from "../lib/supabase.js";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}
function flag(name) {
  return process.argv.includes(`--${name}`);
}

const userQuery = arg("user");
const room = arg("room");
const doClear = flag("clear");
const VALID = ["entrance","lounge","therapy","studio","confessional","dating_admin","matchmaker"];

if (!userQuery || (!doClear && !VALID.includes(room))) {
  console.error("Usage:");
  console.error("  --user <name|id> --room <room>     pin to that room");
  console.error("  --user <name|id> --clear           clear the pin");
  console.error("Rooms:", VALID.join(", "));
  process.exit(1);
}

const s = getSupabaseServer();

const isUuid = /^[0-9a-f-]{36}$/i.test(userQuery);
const { data: users } = isUuid
  ? await s.from("users").select("id, display_name").eq("id", userQuery)
  : await s.from("users").select("id, display_name").ilike("display_name", `%${userQuery}%`);

if (!users?.length) { console.error("No users found for", userQuery); process.exit(1); }
if (users.length > 1) {
  console.error("Multiple users — be specific:");
  for (const u of users) console.error(" ", u.id, u.display_name);
  process.exit(1);
}
const user = users[0];

const { data: sessions } = await s
  .from("sessions").select("id, session_number")
  .eq("user_id", user.id).order("started_at", { ascending: false }).limit(1);
if (!sessions?.length) { console.error("No sessions for", user.display_name); process.exit(1); }
const session = sessions[0];

const insert = doClear
  ? { user_id: user.id, session_id: session.id, room: null, delta_summary: "[UNPIN] manual clear" }
  : { user_id: user.id, session_id: session.id, room, conversation_level: 2, delta_summary: `[PIN] room=${room}` };

const { error } = await s.from("cq_dimensions").insert(insert);
if (error) { console.error("Insert failed:", error.message); process.exit(1); }

console.log(doClear
  ? `OK — ${user.display_name} unpinned. Observer's classification will resume.`
  : `OK — ${user.display_name} pinned to room=${room}. Observer is overridden until you --clear.`);

