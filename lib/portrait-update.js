// Applies portrait analysis results to Supabase
export async function applyPortraitUpdate(supabase, userId, sessionNumber, analysis) {
  const promises = [];

  // Update portrait dimensions
  if (analysis.dimensions) {
    for (const [name, data] of Object.entries(analysis.dimensions)) {
      promises.push(
        supabase.from("portrait_dimensions").upsert({
          user_id: userId,
          dimension_name: name,
          grouping: data.grouping || "uncategorised",
          stated_position: data.stated ? parseFloat(data.stated) || null : undefined,
          revealed_position: data.revealed ? parseFloat(data.revealed) || null : undefined,
          confidence: data.confidence || 1,
          resolution: data.confidence >= 4 ? "clear" : data.confidence >= 2 ? "forming" : "emerging",
          last_evidence_session: sessionNumber,
        }, { onConflict: "user_id,dimension_name", ignoreDuplicates: false })
      );
    }
  }

  // Update partner image
  if (analysis.partner_image) {
    for (const [name, data] of Object.entries(analysis.partner_image)) {
      const update = {
        user_id: userId,
        dimension_name: name,
        category: data.category || "uncategorised",
        dimension_type: data.type || "stated",
      };
      if (data.type === "stated") update.stated_value = data.value;
      else if (data.type === "derived") update.inferred_value = data.value;
      else update.stated_value = data.value;

      promises.push(
        supabase.from("partner_dimensions").upsert(update, { onConflict: "user_id,dimension_name", ignoreDuplicates: false })
      );
    }
  }

  // Memory updates
  if (analysis.memory) {
    // Fragments
    if (analysis.memory.fragments?.length) {
      for (const f of analysis.memory.fragments) {
        promises.push(
          supabase.from("fragments").insert({
            user_id: userId,
            text: typeof f === "string" ? f : f.text,
            context: typeof f === "object" ? f.context : null,
            session_number: sessionNumber,
          })
        );
      }
    }

    // Hypotheses
    if (analysis.memory.hypotheses?.length) {
      for (const h of analysis.memory.hypotheses) {
        promises.push(
          supabase.from("hypotheses").insert({
            user_id: userId,
            text: h,
            status: "active",
            created_session: sessionNumber,
          })
        );
      }
    }

    // Silences
    if (analysis.memory.silences?.length) {
      for (const s of analysis.memory.silences) {
        promises.push(
          supabase.from("silences").upsert({
            user_id: userId,
            topic: s,
            sessions_absent: sessionNumber,
          }, { onConflict: "user_id,topic", ignoreDuplicates: false })
        );
      }
    }

    // Key moments
    if (analysis.memory.key_moments?.length) {
      for (const m of analysis.memory.key_moments) {
        promises.push(
          supabase.from("key_moments").insert({
            user_id: userId,
            session_number: sessionNumber,
            description: typeof m === "string" ? m : m.description,
            moment_type: typeof m === "object" ? m.type : null,
          })
        );
      }
    }

    // Territory map
    if (analysis.memory.territory) {
      for (const [territory, depth] of Object.entries(analysis.memory.territory)) {
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

    // Shared history
    if (analysis.memory.shared_history?.length) {
      for (const s of analysis.memory.shared_history) {
        promises.push(
          supabase.from("shared_history").insert({
            user_id: userId,
            reference: s,
            session_number: sessionNumber,
          })
        );
      }
    }
  }

  // Scores
  if (analysis.scores) {
    promises.push(
      supabase.from("scores").insert({
        user_id: userId,
        trust_score: analysis.scores.trust,
        depth_score: analysis.scores.depth,
        readiness_score: analysis.scores.readiness,
        self_knowledge_gap: analysis.scores.self_knowledge_gap,
        emotional_availability: analysis.scores.emotional_availability,
        preference_reliability: analysis.scores.preference_reliability,
      })
    );
  }

  // CQ dimensions are owned by the Observer (lib/observer.js), not Portrait Scribe.
  // Intentionally NOT writing analysis.cq here.

  // Personality params
  if (analysis.params) {
    promises.push(
      supabase.from("personality_params").upsert({
        user_id: userId,
        ...analysis.params,
      }, { onConflict: "user_id", ignoreDuplicates: false })
    );
  }

  // Meta layer
  if (analysis.meta) {
    promises.push(
      supabase.from("meta_layer").upsert({
        user_id: userId,
        ...analysis.meta,
      }, { onConflict: "user_id", ignoreDuplicates: false })
    );
  }

  // Essential truth
  if (analysis.essential_truth) {
    promises.push(
      supabase.from("essential_truth").upsert({
        user_id: userId,
        text: analysis.essential_truth,
      }, { onConflict: "user_id", ignoreDuplicates: false })
    );
  }

  // Execute all updates
  const results = await Promise.allSettled(promises);
  const errors = results.filter(r => r.status === "rejected");
  if (errors.length) {
    console.error("Portrait update errors:", errors.map(e => e.reason));
  }

  return { updated: results.length - errors.length, errors: errors.length };
}
