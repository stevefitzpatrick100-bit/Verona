import { getSupabaseServer } from "@/lib/supabase";

function unauthorized(req) {
  const auth = req.headers.get("authorization");
  return auth !== process.env.ADMIN_PASSWORD;
}

const QUESTIONS = {
  portrait: {
    title: "Who is this person?",
    table: "portrait_dimensions",
    instruction:
      "Write a short, plain-English portrait of this person (2–3 paragraphs). Answer the question: who is she? What is she like? What does she care about, fear, hope for? Use the dimensions and evidence below as raw material — do not list them, weave them into prose. If something is unknown, do not invent it. Use her name where natural.",
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

export async function POST(req) {
  if (unauthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, kind } = await req.json();
  const cfg = QUESTIONS[kind];
  if (!userId || !cfg) {
    return Response.json({ error: "userId and valid kind required" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  const [{ data: user }, { data: dims }, { data: truth }, { data: hyps }] =
    await Promise.all([
      supabase.from("users").select("id, display_name").eq("id", userId).single(),
      supabase.from(cfg.table).select("*").eq("user_id", userId),
      supabase.from("essential_truth").select("text").eq("user_id", userId).maybeSingle(),
      supabase.from("hypotheses").select("text, status").eq("user_id", userId).eq("status", "active"),
    ]);

  const visible = (dims || []).filter(
    (d) => d.resolution && d.resolution !== "unvisited"
  );

  if (!visible.length) {
    return Response.json({
      text: `Not enough gathered yet to write about ${kind === "portrait" ? "who she is" : kind === "partner" ? "the partner she wants" : "the relationship she wants"}.`,
    });
  }

  const dimLines = visible
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

  const name = user?.display_name || "She";
  const truthLine = truth?.text ? `Essential truth: "${truth.text}"\n\n` : "";
  const hypLines = (hyps || []).slice(0, 8).map((h) => `- ${h.text}`).join("\n");

  const prompt = `${cfg.instruction}

Subject: ${name}

${truthLine}${hypLines ? `Active hypotheses:\n${hypLines}\n\n` : ""}Dimensions and evidence:
${dimLines}

Write the prose now. No headings, no bullet lists, no numeric scores in the prose itself.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  if (data.error) {
    return Response.json({ error: data.error.message }, { status: 500 });
  }
  const text = data.content?.[0]?.text?.trim() || "";

  return Response.json({ text, question: cfg.title });
}
