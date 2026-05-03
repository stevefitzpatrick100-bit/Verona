-- 011_slim_cq.sql
-- Slim CQ schema: 15 → 10 dimensions.
--
-- Dropped (folded into remaining signals):
--   safety           — covered by trust + frustration
--   anticipation     — covered by return_signal + arrival_state
--   progress_belief  — covered by momentum + depth_signal
--   goal_aliveness   — covered by orientation
--   agency           — covered by dependency_risk + investment
--
-- Observer (lib/observer.js) is the sole writer of cq_dimensions and has
-- been updated to emit only the 10 retained dimensions. This migration is
-- destructive of the dropped columns' historical values.

alter table cq_dimensions
  drop column if exists safety,
  drop column if exists anticipation,
  drop column if exists progress_belief,
  drop column if exists goal_aliveness,
  drop column if exists agency;
