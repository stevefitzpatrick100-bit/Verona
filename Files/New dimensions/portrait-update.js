// lib/portrait-update.js — slim version
// Writes the analysis JSON into the database.
// Drop-in replacement for the existing applyPortraitUpdate.

export async function applyPortraitUpdate(supabase, userId, sessionNumber, analysis) {
  const promises = [];

  // The three images — same shape, one helper
  for (const image of ["portrait", "partner", "relationship"]) {
    const table = `${image}_dimensions`;
    const rows = analysis[image] || [];
    for (const d of rows) {
      promises.push(
        supabase.from(table).upsert({
          user_id: userId,
          dimension_name: d.dimension_name,
          grouping: d.grouping || "uncategorised",
          position_stated: d.position_stated ?? null,
          position_revealed: d.position_revealed ?? null,
          flexibility: d.flexibility || "moderate",
          confidence: d.confidence ?? 1,
          weight: d.weight ?? 5,
          vector: d.vector || "stable",
          evidence: d.evidence || null,
          last_evidence_session: sessionNumber,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,dimension_name", ignoreDuplicates: false })
      );
    }
  }

  // Memory
  if (analysis.memory) {
    const m = analysis.memory;

    if (m.fragments?.length) {
      for (const f of m.fragments) {
        promises.push(
          supabase.from("fragments").insert({
            user_id: userId,
            text: typeof f === "string" ? f : f.text,
            context: typeof f === "object" ? f.context : null,
            significance: typeof f === "object" ? f.significance : null,
            session_number: sessionNumber,
          })
        );
      }
    }

    if (m.hypotheses?.length) {
      for (const h of m.hypotheses) {
        promises.push(
          supabase.from("hypotheses").insert({
            user_id: userId,
            text: typeof h === "string" ? h : h.text,
            status: "active",
            created_session: sessionNumber,
          })
        );
      }
    }

    if (m.silences?.length) {
      for (const s of m.silences) {
        promises.push(
          supabase.from("silences").upsert({
            user_id: userId,
            topic: s,
            sessions_absent: sessionNumber,
          }, { onConflict: "user_id,topic", ignoreDuplicates: false })
        );
      }
    }

    if (m.key_moments?.length) {
      for (const k of m.key_moments) {
        promises.push(
          supabase.from("key_moments").insert({
            user_id: userId,
            session_number: sessionNumber,
            description: typeof k === "string" ? k : k.description,
            moment_type: typeof k === "object" ? k.moment_type : null,
          })
        );
      }
    }

    if (m.territory) {
      for (const [territory, depth] of Object.entries(m.territory)) {
        promises.push(
          supabase.from("territory_map").upsert({
            user_id: userId,
            territory,
            depth: parseInt(depth),
            last_visited_session: sessionNumber,
          }, { onConflict: "user_id,territory", ignoreDuplicates: false })
        );
      }
    }

    if (m.essential_truth) {
      promises.push(
        supabase.from("essential_truth").upsert({
          user_id: userId,
          text: m.essential_truth,
        }, { onConflict: "user_id", ignoreDuplicates: false })
      );
    }
  }

  // CQ — time series
  if (analysis.cq) {
    promises.push(
      supabase.from("cq_dimensions").insert({
        user_id: userId,
        ...analysis.cq,
      })
    );
  }

  // Personality params — latest values
  if (analysis.params) {
    promises.push(
      supabase.from("personality_params").upsert({
        user_id: userId,
        ...analysis.params,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id", ignoreDuplicates: false })
    );
  }

  const results = await Promise.allSettled(promises);
  const errors = results.filter(r => r.status === "rejected");
  if (errors.length) {
    console.error("Portrait update errors:", errors.map(e => e.reason));
  }
  return { updated: results.length - errors.length, errors: errors.length };
}
