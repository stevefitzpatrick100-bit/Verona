import { getSupabaseServer } from "@/lib/supabase";

function unauthorized(req) {
  const auth = req.headers.get("authorization");
  return auth !== process.env.ADMIN_PASSWORD;
}

const SINGLE_KINDS = {
  self: {
    title: "Who is this person?",
    table: "portrait_dimensions",
    instruction:
      "Write a short, plain-English description of this person (2–3 paragraphs). Answer the question: who is she? What is she like? What does she care about, fear, hope for? Use the dimensions and evidence below as raw material — do not list them, weave them into prose. If something is unknown, do not invent it. Use her name where natural.",
  },
  // legacy alias — keep so older clients still work
  portrait: {
    title: "Who is this person?",
    table: "portrait_dimensions",
    instruction:
      "Write a short, plain-English description of this person (2–3 paragraphs). Answer the question: who is she? What is she like? What does she care about, fear, hope for? Use the dimensions and evidence below as raw material — do not list them, weave them into prose. If something is unknown, do not invent it. Use her name where natural.",
  },
  partner: {
    title: "What kind of partner does she want?",
    table: "partner_dimensions",
    instruction:
      "Write a short, plain-English description (2–3 paragraphs) of the kind of partner this person seems to want or need. Answer the question: what kind of partner is she looking for? What qualities matter most, what does she say versus what the evidence reveals, what is non-negotiable, what is flexible? Weave the dimensions into prose. If something is unknown, do not invent it.",
  },
  relationship: {
    title: "What kind of relationship does she want?",
    table: "relationship_dimensions",
    instruction:
      "Write a short, plain-English description (2–3 paragraphs) of the kind of relationship this person seems to want. Answer the question: what shape of shared life is she imagining? How much overlap, what does daily life look like, what is sacred, what is flexible? Weave the dimensions into prose. If something is unknown, do not invent it.",
  },
};

function dimLines(dims) {
  return (dims || [])
    .filter((d) => d.resolution && d.resolution !== "unvisited")
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .map((d) => {
      const stated = d.position_stated ?? d.stated_position ?? d.imagined_position ?? null;
      const revealed = d.position_revealed ?? d.revealed_position ?? d.observed_position ?? d.evidenced_position ?? d.position ?? null;
      const grouping = d.grouping || d.category || "other";
      const evidence = d.evidence || d.evidence_notes || "";
      const parts = [`- ${d.dimension_name} [${grouping}]`];
      if (stated != null) parts.push(`stated ${stated}`);
      if (revealed != null) parts.push(`revealed ${revealed}`);
      if (d.weight != null) parts.push(`weight ${d.weight}`);
      if (d.resolution) parts.push(d.resolution);
      const head = parts.join(" · ");
      return evidence ? `${head}\n  evidence: ${evidence}` : head;
    })
    .join("\n");
}

async function callClaude(prompt, maxTokens = 800) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text?.trim() || "";
}

export async function POST(req) {
  if (unauthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, kind } = await req.json();
  if (!userId || !kind) {
    return Response.json({ error: "userId and kind required" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const [{ data: user }, { data: truth }, { data: hyps }] = await Promise.all([
    supabase.from("users").select("id, display_name").eq("id", userId).single(),
    supabase.from("essential_truth").select("text").eq("user_id", userId).maybeSingle(),
    supabase.from("hypotheses").select("text, status").eq("user_id", userId).eq("status", "active"),
  ]);

  const name = user?.display_name || "She";
  const truthLine = truth?.text ? `Essential truth: "${truth.text}"\n\n` : "";
  const hypLines = (hyps || []).slice(0, 8).map((h) => `- ${h.text}`).join("\n");

  // ── Combined match-facing portrait ─────────────────────────
  if (kind === "match_portrait") {
    const [{ data: selfDims }, { data: partnerDims }, { data: relDims }] = await Promise.all([
      supabase.from("portrait_dimensions").select("*").eq("user_id", userId),
      supabase.from("partner_dimensions").select("*").eq("user_id", userId),
      supabase.from("relationship_dimensions").select("*").eq("user_id", userId),
    ]);

    const self = dimLines(selfDims);
    const partner = dimLines(partnerDims);
    const rel = dimLines(relDims);

    if (!self && !partner && !rel) {
      return Response.json({ text: "Not enough gathered yet to write a portrait.", question: "Portrait — for a potential match" });
    }

    const prompt = `You are Angelica writing a portrait of ${name} for a potential match — someone who has not yet met her, but might.

Write approximately 300 words (a single piece of prose, 2–4 paragraphs). The aim is to give the reader a real sense of who she is, what she is looking for in a partner, and the kind of life she wants to share. Weave self, partner-ideal and relationship-shape together into one coherent portrait — not three separate sections.

Voice: warm, observant, honest. Not a dating-profile, not a marketing blurb. The reader should come away thinking "I understand her." Use her name naturally. Do not list dimensions or numbers. Do not invent specifics that are not supported by the evidence below. If something is genuinely unknown, leave it out rather than guess.

${truthLine}${hypLines ? `Active hypotheses about ${name}:\n${hypLines}\n\n` : ""}── Self (who she is) ──
${self || "(nothing gathered)"}

── Partner image (what she wants in a partner) ──
${partner || "(nothing gathered)"}

── Relationship image (the shape of life she wants) ──
${rel || "(nothing gathered)"}

Write the portrait now. Aim for ~300 words. No headings, no bullet lists.`;

    const text = await callClaude(prompt, 1200);
    return Response.json({ text, question: "Portrait — for a potential match" });
  }

  // ── Single-image narratives ────────────────────────────────
  const cfg = SINGLE_KINDS[kind];
  if (!cfg) {
    return Response.json({ error: "invalid kind" }, { status: 400 });
  }

  const { data: dims } = await supabase.from(cfg.table).select("*").eq("user_id", userId);
  const lines = dimLines(dims);

  if (!lines) {
    return Response.json({
      text: `Not enough gathered yet to write about ${kind === "self" || kind === "portrait" ? "who she is" : kind === "partner" ? "the partner she wants" : "the relationship she wants"}.`,
      question: cfg.title,
    });
  }

  const prompt = `${cfg.instruction}

Subject: ${name}

${truthLine}${hypLines ? `Active hypotheses:\n${hypLines}\n\n` : ""}Dimensions and evidence:
${lines}

Write the prose now. No headings, no bullet lists, no numeric scores in the prose itself.`;

  const text = await callClaude(prompt, 800);
  return Response.json({ text, question: cfg.title });
}
