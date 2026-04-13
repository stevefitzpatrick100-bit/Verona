// Builds the portrait context string that gets injected into Angelica's system prompt
export async function buildPortraitContext(supabase, userId) {
  let ctx = "";

  // Get session count
  const { count } = await supabase
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  
  const sessionCount = count || 0;

  if (sessionCount <= 1) {
    return "This is your first conversation with this person. You know nothing about them yet. Open warmly and simply.";
  }

  ctx += `Session count: ${sessionCount}\n\n`;

  // Get scores (latest)
  const { data: scores } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", userId)
    .order("measured_at", { ascending: false })
    .limit(1)
    .single();

  if (scores) {
    ctx += `## Current Scores\n`;
    ctx += `Trust: ${scores.trust_score || "?"}/10\n`;
    ctx += `Depth: ${scores.depth_score || "?"}/10\n`;
    ctx += `Readiness: ${scores.readiness_score || "?"}/10\n`;
    ctx += `Self-knowledge gap: ${scores.self_knowledge_gap || "?"}/10\n`;
    ctx += `Emotional availability: ${scores.emotional_availability || "?"}/10\n\n`;
  }

  // Get portrait dimensions (non-unvisited only)
  const { data: dims } = await supabase
    .from("portrait_dimensions")
    .select("*")
    .eq("user_id", userId)
    .neq("resolution", "unvisited")
    .order("weight", { ascending: false });

  if (dims?.length) {
    ctx += `## Known Dimensions\n`;
    for (const d of dims) {
      ctx += `- ${d.dimension_name} [${d.grouping}, w${d.weight}]: `;
      ctx += `stated=${d.stated_position || "?"}, revealed=${d.revealed_position || "?"}, observed=${d.observed_position || "?"}`;
      ctx += ` (${d.resolution}, conf ${d.confidence})\n`;
    }
    ctx += "\n";
  }

  // Get partner image
  const { data: partner } = await supabase
    .from("partner_dimensions")
    .select("*")
    .eq("user_id", userId)
    .neq("resolution", "unvisited");

  if (partner?.length) {
    ctx += `## Partner Image\n`;
    for (const p of partner) {
      const val = p.tested_value || p.inferred_value || p.stated_value || "?";
      ctx += `- ${p.dimension_name} [${p.category}]: ${val} (${p.dimension_type}, ${p.flexibility})\n`;
    }
    ctx += "\n";
  }

  // Get hypotheses
  const { data: hyps } = await supabase
    .from("hypotheses")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active");

  if (hyps?.length) {
    ctx += `## Active Hypotheses\n`;
    for (const h of hyps) {
      ctx += `- ${h.text}\n`;
    }
    ctx += "\n";
  }

  // Get fragments (last 20)
  const { data: frags } = await supabase
    .from("fragments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (frags?.length) {
    ctx += `## Fragments\n`;
    for (const f of frags) {
      ctx += `- "${f.text}" (session ${f.session_number}${f.significance ? ", " + f.significance : ""})\n`;
    }
    ctx += "\n";
  }

  // Get silences
  const { data: sils } = await supabase
    .from("silences")
    .select("*")
    .eq("user_id", userId);

  if (sils?.length) {
    ctx += `## Silences (topics not raised)\n`;
    for (const s of sils) {
      ctx += `- ${s.topic} (absent ${s.sessions_absent} sessions)\n`;
    }
    ctx += "\n";
  }

  // Get territory map
  const { data: terr } = await supabase
    .from("territory_map")
    .select("*")
    .eq("user_id", userId)
    .gt("depth", 0);

  if (terr?.length) {
    ctx += `## Territory Map\n`;
    for (const t of terr) {
      ctx += `- ${t.territory}: depth ${t.depth}/5\n`;
    }
    ctx += "\n";
  }

  // Get key moments (last 10)
  const { data: moments } = await supabase
    .from("key_moments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (moments?.length) {
    ctx += `## Key Moments\n`;
    for (const m of moments) {
      ctx += `- [${m.moment_type}] ${m.description} (session ${m.session_number})\n`;
    }
    ctx += "\n";
  }

  // Get shared history
  const { data: shared } = await supabase
    .from("shared_history")
    .select("*")
    .eq("user_id", userId);

  if (shared?.length) {
    ctx += `## Shared History\n`;
    for (const s of shared) {
      ctx += `- ${s.reference}\n`;
    }
    ctx += "\n";
  }

  // Get essential truth
  const { data: truth } = await supabase
    .from("essential_truth")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (truth?.text) {
    ctx += `## The Essential Truth (emerging)\n${truth.text}\n\n`;
  }

  // Get personality params
  const { data: params } = await supabase
    .from("personality_params")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (params) {
    ctx += `## Personality Parameters\n`;
    const paramNames = [
      "warmth", "pace", "emotional_mirroring", "validation",
      "response_length", "question_length", "use_of_silence", "precision_of_language", "humour",
      "directness", "challenge_level", "challenge_framing", "probing_depth", "hypothesis_visibility",
      "intellectual_engagement", "reflection_frequency",
      "intimacy", "reference_to_history", "forward_orientation", "urgency"
    ];
    for (const p of paramNames) {
      if (params[p] != null) ctx += `${p}: ${params[p]}/10\n`;
    }
  }

  return ctx;
}

// Format personality params for system prompt
export function formatParams(params) {
  if (!params) return "Using defaults — first session.";
  const lines = [];
  const names = {
    warmth: ["Cool and precise", "Visibly warm, emotionally present"],
    pace: ["Slow and spacious", "Fast-moving, momentum-driven"],
    directness: ["Indirect, through story", "Direct, names what she notices"],
    challenge_level: ["Soft, no friction", "Sharp, pushes back"],
    humour: ["Entirely serious", "Dry wit, playful"],
    intimacy: ["Formal distance", "Deep familiarity, inside language"],
    probing_depth: ["Surface only", "Reaches under — the avoided question"],
    reflection_frequency: ["Rarely reflects back", "Regularly offers observations"],
  };
  for (const [key, desc] of Object.entries(names)) {
    const val = params[key] || 5;
    lines.push(`${key}: ${val}/10 (1="${desc[0]}", 10="${desc[1]}")`);
  }
  return lines.join("\n");
}
