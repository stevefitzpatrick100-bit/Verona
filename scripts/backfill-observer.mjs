// Retroactively run the Observer over existing sessions.
//
// Usage:
//   node scripts/backfill-observer.mjs                  # one reading per session (at end)
//   node scripts/backfill-observer.mjs --user kim       # only users matching display_name
//   node scripts/backfill-observer.mjs --force          # delete prior CQ rows for each session first
//   node scripts/backfill-observer.mjs --limit 5        # cap sessions per user (oldest first)
//   node scripts/backfill-observer.mjs --every 4        # running commentary: read every 4 assistant turns

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { runObserver } from "../lib/observer.js";

// Load .env.local into process.env
const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const i = line.indexOf("=");
  if (i === -1) continue;
  const k = line.slice(0, i).trim();
  const v = line.slice(i + 1).trim();
  if (k && !process.env[k]) process.env[k] = v;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Args
const args = process.argv.slice(2);
const userFilter = (() => {
  const i = args.indexOf("--user");
  return i !== -1 ? args[i + 1] : null;
})();
const force = args.includes("--force");
const limit = (() => {
  const i = args.indexOf("--limit");
  return i !== -1 ? Number(args[i + 1]) : null;
})();
const every = (() => {
  const i = args.indexOf("--every");
  return i !== -1 ? Number(args[i + 1]) : 0; // 0 = single reading at session end
})();

// Pull users
let userQuery = supabase.from("users").select("id, display_name");
if (userFilter) userQuery = userQuery.ilike("display_name", `%${userFilter}%`);
const { data: users, error: uErr } = await userQuery;
if (uErr) { console.error(uErr); process.exit(1); }
console.log(`Users to process: ${users.length}`);

let totalSessions = 0;
let scored = 0;
let readings = 0;
let skipped = 0;
let failed = 0;

for (const user of users) {
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, session_number, started_at")
    .eq("user_id", user.id)
    .order("started_at", { ascending: true });

  if (!sessions?.length) continue;

  const slice = limit ? sessions.slice(0, limit) : sessions;
  console.log(`\n${user.display_name || user.id} — ${slice.length} sessions`);

  for (const s of slice) {
    totalSessions++;

    if (force) {
      await supabase.from("cq_dimensions").delete().eq("session_id", s.id);
    } else {
      const { data: existing } = await supabase
        .from("cq_dimensions")
        .select("id")
        .eq("session_id", s.id)
        .limit(1);
      if (existing?.length) {
        console.log(`  #${s.session_number}: skip (already scored — use --force to replace)`);
        skipped++;
        continue;
      }
    }

    const { data: messages } = await supabase
      .from("messages")
      .select("role, content, created_at")
      .eq("session_id", s.id)
      .order("created_at", { ascending: true });

    if (!messages?.length) {
      console.log(`  #${s.session_number}: skip (no messages)`);
      skipped++;
      continue;
    }

    // Build checkpoint indices: end-of-session (every=0) or every N assistant turns
    const checkpoints = [];
    if (every > 0) {
      let assistantSeen = 0;
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].role === "assistant") {
          assistantSeen++;
          if (assistantSeen % every === 0) checkpoints.push(i);
        }
      }
      // Always include the final message
      if (checkpoints[checkpoints.length - 1] !== messages.length - 1) {
        checkpoints.push(messages.length - 1);
      }
    } else {
      checkpoints.push(messages.length - 1);
    }

    let sessionReadings = 0;
    for (const idx of checkpoints) {
      const upTo = messages.slice(0, idx + 1);
      const measuredAt = messages[idx].created_at;
      try {
        const result = await runObserver(supabase, {
          userId: user.id,
          sessionId: s.id,
          messages: upTo,
          lastReply: null,
          measuredAt,
        });
        if (result) {
          sessionReadings++;
          readings++;
        } else {
          failed++;
        }
      } catch (e) {
        failed++;
        console.log(`     checkpoint @ msg ${idx + 1} failed — ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    if (sessionReadings) {
      scored++;
      console.log(`  #${s.session_number}: ${sessionReadings} reading(s) across ${messages.length} msgs`);
    } else {
      console.log(`  #${s.session_number}: no readings produced`);
    }
  }
}

console.log(`\nDone. ${scored}/${totalSessions} sessions scored, ${readings} total readings, ${skipped} skipped, ${failed} failed.`);
process.exit(0);
