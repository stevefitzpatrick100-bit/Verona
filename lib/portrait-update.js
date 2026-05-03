// Applies portrait analysis results to Supabase.
//
// Slim-shape writer (April 2026 design). The prompt now returns three image
// arrays (portrait / partner / relationship) sharing one 10-column shape,
// plus memory / params. CQ is owned by the Observer (lib/observer.js); this
// function intentionally does NOT write cq_dimensions.
//
// Backwards-compat: legacy NOT NULL columns category (partner_dimensions)
// and tier (relationship_dimensions) are still written defensively in case
// migration 009_slim_refactor.sql has not been applied yet. Legacy input
// shapes (analysis.dimensions / partner_image / relationship_image as
// dimension_name → object maps) are also accepted.

const IMAGES = [
  { key: "portrait",     table: "portrait_dimensions" },
  { key: "partner",      table: "partner_dimensions" },
  { key: "relationship", table: "relationship_dimensions" },
];

function num(v) {
  if (v == null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function legacyExtras(imageKey, grouping, weight) {
  if (imageKey === "partner") return { category: grouping };
  if (imageKey === "relationship") {
    const w = Number(weight) || 5;
    const tier = w >= 8 ? 1 : w >= 5 ? 2 : 3;
    return { tier };
  }
  return {};
}

function normaliseRow(imageKey, d, sessionNumber) {
  if (!d?.dimension_name) return null;
  const grouping = d.grouping || d.category || "uncategorised";
  const weight = d.weight ?? 5;
  const confidence = d.confidence ?? 1;
  return {
    dimension_name: d.dimension_name,
    grouping,
    position_stated: num(d.position_stated ?? d.stated),
    position_revealed: num(d.position_revealed ?? d.revealed),
    flexibility: d.flexibility || "moderate",
    confidence,
    weight,
    vector: d.vector || "stable",
    evidence: d.evidence || null,
    last_evidence_session: sessionNumber,
    resolution: confidence >= 4 ? "clear" : confidence >= 2 ? "forming" : "emerging",
    updated_at: new Date().toISOString(),
    ...legacyExtras(imageKey, grouping, weight),
  };
}

export async function applyPortraitUpdate(supabase, userId, sessionNumber, analysis) {
  if (!analysis) return { updated: 0, errors: 0 };
  const promises = [];

  const legacyMap = {
    portrait: analysis.dimensions,
    partner: analysis.partner_image,
    relationship: analysis.relationship_image,
  };
  for (const { key, table } of IMAGES) {
    let rows = [];
    if (Array.isArray(analysis[key])) {
      rows = analysis[key];
    } else if (legacyMap[key] && typeof legacyMap[key] === "object") {
      rows = Object.entries(legacyMap[key]).map(([dimension_name, v]) => ({ dimension_name, ...v }));
    }
    for (const d of rows) {
      const row = normaliseRow(key, d, sessionNumber);
      if (!row) continue;
      promises.push(
        supabase.from(table).upsert(
          { user_id: userId, ...row },
          { onConflict: "user_id,dimension_name", ignoreDuplicates: false }
        )
      );
    }
  }

  const m = analysis.memory;
  if (m) {
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
            moment_type: typeof k === "object" ? (k.moment_type || k.type) : null,
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

  if (analysis.essential_truth && !m?.essential_truth) {
    promises.push(
      supabase.from("essential_truth").upsert({
        user_id: userId,
        text: analysis.essential_truth,
      }, { onConflict: "user_id", ignoreDuplicates: false })
    );
  }

  // CQ — INTENTIONALLY NOT WRITTEN. Owned by lib/observer.js.

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
  const errors = [];
  for (const r of results) {
    if (r.status === "rejected") errors.push(r.reason);
    else if (r.value?.error) errors.push(r.value.error);
  }
  if (errors.length) {
    console.error("Portrait update errors:", errors.map(e => e?.message || e));
  }
  return { updated: results.length - errors.length, errors: errors.length };
}
