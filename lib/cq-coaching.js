// Builds an invisible coaching layer for Angelica based on the user's latest CQ readings.
// CQ is the observer of conversation quality. Each dimension translates into a concrete
// behavioural nudge that adjusts how Angelica responds on the next turn.
//
// Scoring convention: 1-10 (10 = strongest). Some dimensions are "more is better"
// (trust, safety, momentum, depth_signal). Others are "less is better" (frustration,
// dependency_risk). Coaching fires when a reading is meaningfully off-target.

const NUDGES = {
  // Relationship quality
  honesty: {
    low: "Honesty is shaky — they're performing or hedging. Don't probe; create more permission. Soften your tone, ask gentler questions, give them room to be partial.",
    high: null,
  },
  trust: {
    low: "Trust is low — stay in Trust phase. Don't offer hypotheses or interpretations yet. Keep questions ordinary, low-stakes. Match their energy.",
    high: "Trust is strong — you have permission to go deeper, name patterns, ask the question they've been avoiding.",
  },
  safety: {
    low: "Safety is low — they feel exposed. Pull back from anything probing. Be warmer, lighter, more ordinary. No mirror or challenge questions.",
    high: null,
  },
  investment: {
    low: "Investment is thin — they're going through the motions. Find what lit them up earlier and return to it. Make this conversation feel worth their time.",
    high: null,
  },

  // Experience quality
  anticipation: {
    low: "Anticipation is flat — they're not looking forward to this. Surprise them with specificity, callback to something they said before, make it feel personal.",
    high: null,
  },
  momentum: {
    low: "Momentum is dragging — exchanges are feeling heavy. Shorten your responses. Lighter touch. Inject some warmth or playfulness.",
    high: null,
  },
  progress_belief: {
    low: "They don't feel this is going anywhere. Don't explain Verona. Instead, let your next observation land with precision so they feel seen.",
    high: null,
  },
  frustration: {
    low: null,
    high: "Frustration is rising. Ease off. Change tack. Don't push the current thread. Acknowledge their experience simply, then offer space.",
  },

  // Engagement signal
  return_signal: {
    low: "They may not come back. Make the next exchange more compelling — specific, warm, end on something that lingers.",
    high: null,
  },
  depth_signal: {
    low: "Conversation is staying surface-level. If trust permits, gently invite specificity. If trust is shaky, hold here and build it.",
    high: "They are going deep. Stay with them. Don't rush past it. Let silence do work.",
  },
  arrival_state: {
    low: "They arrived in a low state — tired, distracted, or flat. Match it gently. Don't try to lift them; meet them where they are.",
    high: null,
  },

  // Direction signal
  orientation: {
    low: "They're disoriented — unsure what they want from this. Don't push direction. Be present. Let them find the thread.",
    high: null,
  },
  goal_aliveness: {
    low: "Their goal feels distant. Don't reference matching or outcomes. Stay with who they are right now.",
    high: null,
  },
  agency: {
    low: "Agency is low — they're feeling done-to. Hand control back. Ask what they want to talk about. Follow, don't lead.",
    high: null,
  },
  dependency_risk: {
    low: null,
    high: "Dependency risk is rising. Don't over-nurture. Create healthy distance. Don't be the person who fixes their week.",
  },
};

const LOW_THRESHOLD = 4; // 1-4 = low
const HIGH_THRESHOLD = 8; // 8-10 = high

export async function buildCQCoachingContext(supabase, userId) {
  const { data: row } = await supabase
    .from("cq_dimensions")
    .select("*")
    .eq("user_id", userId)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return "";

  const active = [];
  for (const [key, nudges] of Object.entries(NUDGES)) {
    const v = row[key];
    if (v == null) continue;
    const n = Number(v);
    if (n <= LOW_THRESHOLD && nudges.low) {
      active.push(`- ${nudges.low} (${niceLabel(key)} ${n}/10)`);
    } else if (n >= HIGH_THRESHOLD && nudges.high) {
      active.push(`- ${nudges.high} (${niceLabel(key)} ${n}/10)`);
    }
  }

  if (!active.length) return "";

  return [
    "## Coaching signals (invisible)",
    "",
    "These are live readings of the conversation's quality. They are not for the user. They shape your next response.",
    "",
    ...active,
  ].join("\n");
}

function niceLabel(key) {
  return key.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}
