// Generate one-line summaries for each Angelica prompt version by diffing
// against its predecessor and writing the result to the notes column.
//
// Usage:
//   node scripts/summarize-prompt-versions.mjs              # only versions missing notes
//   node scripts/summarize-prompt-versions.mjs --force      # rewrite all
//   node scripts/summarize-prompt-versions.mjs --key angelica

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

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
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
if (!SUPABASE_URL || !SERVICE_KEY || !ANTHROPIC_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const keyIdx = args.indexOf("--key");
const promptKey = keyIdx >= 0 ? args[keyIdx + 1] : "angelica";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function summarize(prevContent, currContent, currLabel) {
  const prompt = `You are summarizing the difference between two versions of a system prompt for an AI matchmaker called Angelica.

Write ONE short sentence (max 14 words) describing what changed in this version, focusing on intent not mechanics. No preamble. No quotes. Plain prose.

If the change is trivial (whitespace, typo), say "Minor cleanup." If it's a complete rewrite, say "Full rewrite."

Examples of good summaries:
- Warmer trust phase, no hyphens, handle scepticism better.
- Removed all em dashes from prompt to stop model mimicry.
- Tightened cadence rules; shorter messages, longer pauses.
- Added "follow them" rule; user leads, Angelica follows.

PREVIOUS VERSION:
"""
${prevContent || "(no previous version — this is the first)"}
"""

NEW VERSION (${currLabel}):
"""
${currContent}
"""

One-sentence summary:`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 80,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.content?.[0]?.text || "").trim().replace(/^["']|["']$/g, "");
}

const { data: versions, error } = await supabase
  .from("prompt_versions")
  .select("id, version_number, label, notes, content")
  .eq("prompt_key", promptKey)
  .order("version_number", { ascending: true });

if (error) { console.error(error); process.exit(1); }
if (!versions?.length) { console.log("No versions"); process.exit(0); }

console.log(`Found ${versions.length} versions for "${promptKey}"`);

let updated = 0, skipped = 0;
for (let i = 0; i < versions.length; i++) {
  const v = versions[i];
  const prev = i > 0 ? versions[i - 1] : null;

  if (v.notes && !force) {
    console.log(`  [skip] ${v.label} — already has notes`);
    skipped++;
    continue;
  }

  process.stdout.write(`  [..] ${v.label} ... `);
  try {
    const summary = await summarize(prev?.content || "", v.content || "", v.label);
    await supabase.from("prompt_versions").update({ notes: summary }).eq("id", v.id);
    console.log(summary);
    updated++;
  } catch (e) {
    console.log(`FAILED: ${e.message}`);
  }
}

console.log(`\nDone. ${updated} updated, ${skipped} skipped.`);
