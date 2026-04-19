/**
 * One-time migration: creates prompt_versions table and seeds it with
 * the current Angelica system prompt from lib/prompts.js.
 *
 * Run once:  node scripts/create-prompt-versions.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env manually (Next.js doesn't run here)
const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ---------- 1. Create table via raw SQL ----------
const createSQL = `
create table if not exists prompt_versions (
  id uuid primary key default uuid_generate_v4(),
  prompt_key text not null default 'angelica',
  version_number int not null,
  label text,
  content text not null,
  notes text,
  is_active boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists idx_prompt_versions_key on prompt_versions(prompt_key, version_number);
`;

console.log("Checking prompt_versions table...");

// ---------- 2. Check if table already has data ----------
const { data: existing } = await supabase.from("prompt_versions").select("id").limit(1);
if (existing && existing.length > 0) {
  console.log("prompt_versions already has data — skipping seed.");
  process.exit(0);
}

// ---------- 3. Read current prompt from lib/prompts.js ----------
const promptsFile = readFileSync(resolve(__dirname, "../lib/prompts.js"), "utf8");
const match = promptsFile.match(/ANGELICA_SYSTEM_PROMPT\s*=\s*`([\s\S]*?)`\s*;/);
if (!match) {
  console.error("Could not parse ANGELICA_SYSTEM_PROMPT from lib/prompts.js");
  process.exit(1);
}
const promptContent = match[1];

// ---------- 4. Seed first version ----------
const { error: insertErr } = await supabase.from("prompt_versions").insert({
  prompt_key: "angelica",
  version_number: 1,
  label: "v1 — original",
  content: promptContent,
  notes: "Initial version seeded from lib/prompts.js",
  is_active: true,
});

if (insertErr) {
  console.error("Insert error:", insertErr.message);
  console.log("\nThe table likely doesn't exist yet. Run this SQL in the Supabase dashboard first:\n");
  console.log(`
CREATE TABLE prompt_versions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_key text NOT NULL DEFAULT 'angelica',
  version_number int NOT NULL,
  label text,
  content text NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_prompt_versions_key ON prompt_versions(prompt_key, version_number);
  `);
  process.exit(1);
}

console.log("✓ prompt_versions created and seeded with v1 (active)");
