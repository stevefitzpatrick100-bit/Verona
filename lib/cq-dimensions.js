// Canonical list of CQ dimensions. Single source of truth for client + server.
// Keep keys in sync with the cq_dimensions table columns.
//
// Slim 10-dimension set (April 2026). Five dimensions were folded out:
// safety, anticipation, progress_belief, goal_aliveness, agency.

export const CQ_DIMENSIONS = {
  // Relationship quality
  honesty: { group: "relationship_quality", direction: "high_good" },
  trust: { group: "relationship_quality", direction: "high_good" },
  investment: { group: "relationship_quality", direction: "high_good" },

  // Experience quality
  momentum: { group: "experience_quality", direction: "high_good" },
  frustration: { group: "experience_quality", direction: "low_good" },

  // Engagement signal
  return_signal: { group: "engagement_signal", direction: "high_good" },
  depth_signal: { group: "engagement_signal", direction: "high_good" },
  arrival_state: { group: "engagement_signal", direction: "high_good" },

  // Direction signal
  orientation: { group: "direction_signal", direction: "high_good" },
  dependency_risk: { group: "direction_signal", direction: "low_good" },
};
