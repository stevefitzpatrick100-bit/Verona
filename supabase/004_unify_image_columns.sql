-- ============================================================
-- 004 — Unify portrait / partner / relationship image columns
-- ============================================================
-- Goal: give all three image tables the same shape so the app can
-- read/write them through one path. Strictly additive: no DROP,
-- no DELETE, no ALTER on existing columns. Old columns stay
-- exactly as they are; the app can migrate to the new columns
-- at its own pace.
--
-- Unified shape (the slim 10-column design):
--   position_stated   numeric(3,1)  1..10
--   position_revealed numeric(3,1)  1..10
--   evidence          text
--   weight            int           1..10
--   vector            text          stable | moving_up | moving_down
--
-- Existing per-table columns this maps from:
--   portrait      stated_position    -> position_stated
--                 revealed_position  -> position_revealed
--                 evidence_notes     -> evidence
--                 weight, vector     (already present)
--
--   partner       position           -> position_revealed (no separate stated scalar today)
--                 (weight)             (NEW — partner had no weight)
--                 (vector)             (NEW — partner had no vector)
--
--   relationship  imagined_position  -> position_stated
--                 evidenced_position -> position_revealed
--                 user_weight        -> weight (fallback to default_weight)
--                 (no evidence text today)
-- ============================================================

-- ── PORTRAIT ────────────────────────────────────────────────
alter table portrait_dimensions
  add column if not exists position_stated   numeric(3,1) check (position_stated   between 1 and 10),
  add column if not exists position_revealed numeric(3,1) check (position_revealed between 1 and 10),
  add column if not exists evidence          text;

update portrait_dimensions
  set position_stated   = coalesce(position_stated,   stated_position),
      position_revealed = coalesce(position_revealed, revealed_position, observed_position),
      evidence          = coalesce(evidence,          evidence_notes);

-- ── PARTNER ─────────────────────────────────────────────────
alter table partner_dimensions
  add column if not exists position_stated   numeric(3,1) check (position_stated   between 1 and 10),
  add column if not exists position_revealed numeric(3,1) check (position_revealed between 1 and 10),
  add column if not exists evidence          text,
  add column if not exists grouping          text,
  add column if not exists weight            int default 5 check (weight between 1 and 10),
  add column if not exists vector            text default 'stable' check (vector in ('stable','moving_up','moving_down'));

-- partner has a single numeric `position` today; treat it as the revealed
-- position (Angelica's read), since stated values are stored as text.
update partner_dimensions
  set position_revealed = coalesce(position_revealed, position),
      grouping          = coalesce(grouping, category);

-- ── RELATIONSHIP ────────────────────────────────────────────
alter table relationship_dimensions
  add column if not exists position_stated   numeric(3,1) check (position_stated   between 1 and 10),
  add column if not exists position_revealed numeric(3,1) check (position_revealed between 1 and 10),
  add column if not exists evidence          text,
  add column if not exists weight            int default 5 check (weight between 1 and 10),
  add column if not exists vector            text default 'stable' check (vector in ('stable','moving_up','moving_down'));

update relationship_dimensions
  set position_stated   = coalesce(position_stated,   imagined_position),
      position_revealed = coalesce(position_revealed, evidenced_position),
      weight            = coalesce(weight,            user_weight, default_weight, 5);

-- ── Helpful indexes for the new shape (cheap, additive) ─────
create index if not exists idx_portrait_weight
  on portrait_dimensions(user_id, weight desc);
create index if not exists idx_partner_weight
  on partner_dimensions(user_id, weight desc);
create index if not exists idx_relationship_weight
  on relationship_dimensions(user_id, weight desc);

-- ============================================================
-- Done. Old columns retained, new columns populated.
-- Verification queries (manual):
--
--   select count(*) filter (where position_stated is null) as missing_stated,
--          count(*) filter (where position_revealed is null) as missing_revealed
--   from portrait_dimensions;
--
-- Same for partner_dimensions and relationship_dimensions.
-- ============================================================
