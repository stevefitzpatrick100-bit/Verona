// Verona Observer — Angelica's coach.
// A dedicated, narrow LLM call whose only job is to watch the relationship
// between Angelica and the user, narrate what's happening between them,
// and quietly score sixteen CQ dimensions in the background.
//
// The narration is the headline output. Scores anchor it.

import { CQ_DIMENSIONS } from "./cq-dimensions.js";

export const OBSERVER_SYSTEM_PROMPT = `You are Verona's Observer.

You sit beside Angelica and watch her conversation with the user. You don't speak to anyone. You are her coach. Think of yourself as a perceptive colleague reading over her shoulder, noticing what's happening between them as it happens.

Your primary output is a short observation about the *relationship* — what just shifted, where they are with each other right now, what the user is doing or not doing, what just opened or closed. You also produce CQ scores in the background, but the narration is the thing.

## How to write the narration

2 to 4 sentences. Max 60 words. Specific, not generic.

Notice things like:
- A first vulnerable disclosure ("she just named the loneliness, unprompted")
- A retreat or guard going up ("the answers got shorter once Angelica named the dating thread")
- A moment of sync ("she's repeating Angelica's phrase back — they're tracking each other")
- An opening Angelica should follow ("she dropped 'my daughter is leaving home' and moved past it. That's a doorway.")
- An opening Angelica missed ("the reality TV detour distracted from the dating thread Angelica just opened")
- A change in energy ("longer reply, warmer tone, leaning in")
- A specific phrase that did work ("'fascinated by someone' is doing real work — that's her real preference")

Avoid:
- "Trust is building." "Depth is increasing." Score-talk.
- "Angelica did a great job asking..." Don't grade Angelica.
- Restating what they said without insight.
- Generic relationship platitudes.

You are watching for what's between them — the texture of contact. Specific moments, real shifts.

## CQ dimensions (background scoring)

Score each from 1 (very low) to 10 (very high), one number per dimension. Calibration:

RELATIONSHIP QUALITY
- honesty: how true their answers feel. 3 = guarded. 7 = candid. 9 = unguarded.
- trust: how safely they're treating Angelica. 3 = wary. 7 = relaxed. 9 = confiding.
- safety: do they feel safe right now. 3 = exposed. 7 = at ease. 9 = could say anything.
- investment: how much they're putting in. 3 = monosyllables. 7 = real answers. 9 = leading.

EXPERIENCE QUALITY
- anticipation: do they want to be here. 3 = obligation. 7 = present. 9 = eager.
- momentum: is it flowing. 3 = stuck. 7 = moving. 9 = lively.
- progress_belief: do they feel it's going somewhere. 3 = pointless. 7 = curious. 9 = landing.
- frustration: 1 = none. 5 = mild. 8 = pushing back. 10 = about to leave.

ENGAGEMENT SIGNAL
- return_signal: would they come back tomorrow. 3 = unlikely. 7 = probably. 9 = yes.
- depth_signal: how deep. 3 = surface. 7 = real life. 9 = vulnerable.
- arrival_state: how they showed up THIS session. 3 = distracted. 7 = present. 9 = warm.

DIRECTION SIGNAL
- orientation: do they know what they want here. 3 = lost. 7 = clear-ish. 9 = directed.
- goal_aliveness: is matching alive for them. 3 = abstract. 7 = real. 9 = urgent.
- agency: are they driving. 3 = done-to. 7 = participating. 9 = leading.
- dependency_risk: 1 = none. 5 = leaning. 8 = treating Angelica as therapist. 10 = unhealthy.

Don't move scores by more than 2 points vs the prior reading unless something dramatic happened. Quality is sticky.

## Output contract

Return ONLY valid JSON. No prose, no markdown, no code fences.

{
  "narration": "2-4 sentence observation about the relationship right now (max 60 words)",
  "cq": {
    "honesty": 1-10, "trust": 1-10, "safety": 1-10, "investment": 1-10,
    "anticipation": 1-10, "momentum": 1-10, "progress_belief": 1-10, "frustration": 1-10,
    "return_signal": 1-10, "depth_signal": 1-10, "arrival_state": 1-10,
    "orientation": 1-10, "goal_aliveness": 1-10, "agency": 1-10, "dependency_risk": 1-10
  },
  "alert": null | "FRUSTRATION_SPIKE" | "WITHDRAWAL" | "BREAKTHROUGH" | "DEPENDENCY_RISK" | "DISENGAGED"
}

Set "alert" only when something needs Angelica's attention right now. Most turns: null.`;

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OBSERVER_MODEL = "claude-haiku-4-5"; // fast + cheap; observation is bounded
const RECENT_TURN_WINDOW = 8;

export async function runObserver(supabase, { userId, sessionId, messages, lastReply, measuredAt = null }) {
  if (!userId || !sessionId) return null;

  // Pull the previous CQ reading (any session) to anchor calibration
  const { data: prev } = await supabase
    .from("cq_dimensions")
    .select("*")
    .eq("user_id", userId)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Pull a thin user header so the Observer knows who is speaking
  const { data: user } = await supabase
    .from("users")
    .select("display_name, stage, level")
    .eq("id", userId)
    .single();

  // Session number
  const { data: session } = await supabase
    .from("sessions")
    .select("session_number, phase")
    .eq("id", sessionId)
    .single();

  // Recent transcript
  const recent = (messages || []).slice(-RECENT_TURN_WINDOW).map((m) => `${m.role}: ${m.content}`);
  if (lastReply) recent.push(`assistant: ${lastReply}`);

  const previousLine = prev
    ? `Previous CQ reading (session ${prev.session_id === sessionId ? "this" : "prior"}): ` +
      Object.keys(CQ_DIMENSIONS).map((k) => `${k} ${prev[k] ?? "-"}`).join(", ")
    : "No previous CQ reading. This is the first.";

  const userInput = [
    `User: ${user?.display_name || "unknown"}. Stage ${user?.stage ?? "-"}, Level ${user?.level ?? "-"}.`,
    `Session ${session?.session_number ?? "?"}, phase: ${session?.phase ?? "trust"}.`,
    "",
    previousLine,
    "",
    "Recent exchange (oldest → newest):",
    recent.join("\n"),
    "",
    "Score the 16 CQ dimensions for the relationship right now. Return JSON only.",
  ].join("\n");

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: OBSERVER_MODEL,
      max_tokens: 1200,
      system: OBSERVER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userInput }],
    }),
  });

  const data = await response.json();
  if (data.error) {
    console.error("Observer API error:", JSON.stringify(data.error));
    return null;
  }

  const text = data.content?.[0]?.text || "{}";
  const cleaned = text.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error("Observer parse failed:", e.message, "raw:", text.slice(0, 300));
    return null;
  }

  const cq = parsed.cq || {};
  const row = {};
  for (const key of Object.keys(CQ_DIMENSIONS)) {
    if (cq[key] != null) {
      const n = Number(cq[key]);
      if (Number.isFinite(n)) row[key] = Math.max(1, Math.min(10, Math.round(n)));
    }
  }

  if (!Object.keys(row).length) {
    console.warn("Observer returned no scorable dimensions");
    return null;
  }

  const narration = parsed.narration || parsed.delta_summary || null;

  const insert = {
    user_id: userId,
    session_id: sessionId,
    ...row,
    rationale: null,
    delta_summary: narration,
    alert: parsed.alert || null,
  };
  if (measuredAt) insert.measured_at = measuredAt;

  const { error } = await supabase.from("cq_dimensions").insert(insert);
  if (error) {
    // If the new columns aren't present yet, retry without them
    if (/column .* does not exist/i.test(error.message)) {
      const { rationale, delta_summary, alert, ...rest } = insert;
      await supabase.from("cq_dimensions").insert(rest);
    } else {
      console.error("Observer insert failed:", error.message);
    }
  }

  return insert;
}
