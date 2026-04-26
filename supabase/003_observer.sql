-- 003_observer.sql
-- Adds Observer output columns to cq_dimensions so each CQ row carries
-- the evidence and shifts behind its scores.

alter table cq_dimensions
  add column if not exists rationale jsonb,
  add column if not exists delta_summary text,
  add column if not exists alert text;

-- alert values: FRUSTRATION_SPIKE | WITHDRAWAL | BREAKTHROUGH | DEPENDENCY_RISK | DISENGAGED | null
