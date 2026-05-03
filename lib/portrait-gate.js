// Verona — Portrait gate
//
// The Portrait writer must refuse to write when the substrate doesn't support
// a Portrait. Three checks:
//   - resolution: is observer state metabolised, or still raw?
//   - specificity: does the partner/relationship image have concrete texture?
//   - consent: is any receptive material the user has flagged for crossing
//              actually crossed (or are there pending uncrossed entries)?
// See: Verona — The Rooms and the Portrait.

export const GATE_RESULT_READY = "ready";
export const GATE_MISSING_RESOLUTION = "resolution";
export const GATE_MISSING_SPECIFICITY = "specificity";
export const GATE_MISSING_CONSENT = "consent";

export async function canWritePortrait(supabase, userId) {
  // 1. Resolution — read the most recent Observer signal.
  const { data: latestCq } = await supabase
    .from("cq_dimensions")
    .select("dependency_risk, investment, frustration, room, measured_at")
    .eq("user_id", userId)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Recent frustration spikes (>=8 in the last 5 readings)
  const { data: recentRows } = await supabase
    .from("cq_dimensions")
    .select("frustration")
    .eq("user_id", userId)
    .order("measured_at", { ascending: false })
    .limit(5);
  const frustrationSpikes = (recentRows || []).filter((r) => (r.frustration ?? 0) >= 8).length;

  if (latestCq) {
    const dep = latestCq.dependency_risk ?? 0;
    const investment = latestCq.investment ?? 10;
    if (dep > 6 || investment < 4 || frustrationSpikes >= 2) {
      return {
        ready: false,
        missing: GATE_MISSING_RESOLUTION,
        reason: "observer_signal_indicates_unmetabolised_state",
        what_is_needed: "time_in_therapy_room",
        signal: { dependency_risk: dep, investment, frustration_spikes: frustrationSpikes },
      };
    }
  }

  // 2. Specificity — does the Studio have concrete texture?
  const [{ data: partnerDims }, { data: relDims }] = await Promise.all([
    supabase.from("partner_dimensions").select("evidence, position_revealed, weight").eq("user_id", userId),
    supabase.from("relationship_dimensions").select("evidence, position_revealed, weight").eq("user_id", userId),
  ]);

  const partnerScene = hasConcreteScenes(partnerDims);
  const relScene = hasConcreteScenes(relDims);
  if (!partnerScene || !relScene) {
    return {
      ready: false,
      missing: GATE_MISSING_SPECIFICITY,
      reason: "studio_images_lack_imagined_texture",
      what_is_needed: "studio_session_on_imagined_life",
      signal: {
        partner_concrete: partnerScene,
        relationship_concrete: relScene,
        partner_dims: partnerDims?.length || 0,
        relationship_dims: relDims?.length || 0,
      },
    };
  }

  // 3. Consent — are there receptive entries the user has flagged but we
  // haven't yet crossed? Pending consent blocks the Portrait.
  const { data: pending } = await supabase
    .from("receptive_material")
    .select("id")
    .eq("user_id", userId)
    .eq("consent_to_cross", true)
    .eq("crossed_to_substrate", false)
    .limit(1);
  if (pending && pending.length) {
    return {
      ready: false,
      missing: GATE_MISSING_CONSENT,
      reason: "uncrossed_receptive_material_with_consent",
      what_is_needed: "cross_pending_receptive_material",
    };
  }

  return { ready: true, missing: null };
}

// Heuristic specificity check. Prefer false negatives over false positives —
// it's better to refuse to write a Portrait than to write a horoscope.
//
// Concrete = there is at least one dimension with weight >= 6 whose evidence
// contains a long-enough sentence (>= 8 words) and at least some texture
// (numbers, time-of-day, named activity, or a sensory verb).
function hasConcreteScenes(dims) {
  if (!Array.isArray(dims) || !dims.length) return false;
  const TEXTURE = /\b(morning|evening|afternoon|saturday|sunday|kitchen|garden|coffee|breakfast|dinner|laughs?|hugs?|reads?|cooks?|drives?|walks?|holds?|sits?|stands?|asleep|awake|alone|together|argued?|cried?|smiled?|tired|warm|quiet|loud)\b/i;
  for (const d of dims) {
    if ((d.weight ?? 0) < 6) continue;
    const ev = (d.evidence || "").trim();
    if (!ev) continue;
    const words = ev.split(/\s+/).filter(Boolean);
    if (words.length >= 8 && TEXTURE.test(ev)) return true;
  }
  return false;
}
