// Backfill partner_dimensions and relationship_dimensions for all users
// (and refresh portrait_dimensions) by re-running the portrait analysis
// prompt against each user's full historic conversation.
//
// Usage:
//   node scripts/backfill-images.mjs                  # all users
//   node scripts/backfill-images.mjs --user=<uuid>    # one user
//   node scripts/backfill-images.mjs --dry            # log only, no writes
//
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { PORTRAIT_ANALYSIS_PROMPT } from "../lib/prompts.js";
import { applyPortraitUpdate } from "../lib/portrait-update.js";
import { buildPortraitContext } from "../lib/portrait.js";

const env = readFileSync(".env.local", "utf8");
const vars = Object.fromEntries(
  env.split("\n").filter((l) => l.includes("=")).map((l) => l.split("=").map((s) => s.trim()))
);
const SUPABASE_URL = vars["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_KEY = vars["SUPABASE_SERVICE_ROLE_KEY"];
const ANTHROPIC_API_KEY = vars["ANTHROPIC_API_KEY"];

const args = process.argv.slice(2);
const userArg = args.find((a) => a.startsWith("--user="))?.split("=")[1];
const DRY = args.includes("--dry");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// chunk size of message turns to feed Claude per pass
const CHUNK_TURNS = 40;
const CHUNK_OVERLAP = 6;

async function runAnalysis(snippet, portraitContext) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `${PORTRAIT_ANALYSIS_PROMPT}\n\nCurrent portrait context:\n${portraitContext}\n\nConversation:\n${snippet}`,
        },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.content?.[0]?.text || "{}";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function processUser(user) {
  console.log(`\n── ${user.display_name} (${user.id})`);
  const { data: messages } = await supabase
    .from("messages")
    .select("role, content, session_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (!messages || messages.length === 0) {
    console.log("  (no messages, skipping)");
    return;
  }
  console.log(`  ${messages.length} messages`);

  const { data: sessionsList } = await supabase
    .from("sessions")
    .select("id, session_number")
    .eq("user_id", user.id)
    .order("session_number", { ascending: false })
    .limit(1);
  const sessionNumber = sessionsList?.[0]?.session_number || 1;

  // chunk messages with small overlap so context flows
  const chunks = [];
  for (let i = 0; i < messages.length; i += CHUNK_TURNS - CHUNK_OVERLAP) {
    chunks.push(messages.slice(i, i + CHUNK_TURNS));
    if (i + CHUNK_TURNS >= messages.length) break;
  }

  for (let c = 0; c < chunks.length; c++) {
    const snippet = chunks[c].map((m) => `${m.role}: ${m.content}`).join("\n");
    const portraitContext = await buildPortraitContext(supabase, user.id);
    console.log(`  chunk ${c + 1}/${chunks.length} (${chunks[c].length} msgs)…`);
    try {
      const analysis = await runAnalysis(snippet, portraitContext);
      const counts = {
        portrait: Object.keys(analysis.dimensions || {}).length,
        partner: Object.keys(analysis.partner_image || {}).length,
        relationship: Object.keys(analysis.relationship_image || {}).length,
      };
      console.log(`    → portrait:${counts.portrait}  partner:${counts.partner}  relationship:${counts.relationship}`);
      if (!DRY) {
        await applyPortraitUpdate(supabase, user.id, sessionNumber, analysis);
      }
    } catch (e) {
      console.error(`    ! chunk failed: ${e.message}`);
    }
  }
}

async function main() {
  let users;
  if (userArg) {
    const { data } = await supabase.from("users").select("id, display_name").eq("id", userArg);
    users = data;
  } else {
    const { data } = await supabase.from("users").select("id, display_name").order("created_at");
    // filter to users with ≥10 messages so we don't burn tokens on stubs
    const withCounts = await Promise.all(
      data.map(async (u) => {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("user_id", u.id);
        return { ...u, msgCount: count || 0 };
      })
    );
    users = withCounts.filter((u) => u.msgCount >= 10);
  }
  console.log(`Backfilling ${users.length} user(s)${DRY ? " [DRY RUN]" : ""}`);
  for (const u of users) {
    await processUser(u);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
