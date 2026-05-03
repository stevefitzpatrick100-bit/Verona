-- 009_slim_refactor.sql
-- Slim image-table refactor (April 2026 design).
--
-- The three image tables already share `grouping` and `vector` columns
-- (added in 004_unify_image_columns.sql). This migration relaxes the
-- legacy NOT NULL constraints on `partner_dimensions.category` and
-- `relationship_dimensions.tier` so the new applyPortraitUpdate can
-- write the slim shape without supplying them.
--
-- Conversation history (users / sessions / messages) is untouched.
-- meta_layer / scores / shared_history tables are intentionally left
-- in place so existing admin views can still read historical data —
-- the slim portrait-update no longer writes to them.

alter table partner_dimensions
  alter column category drop not null;

alter table relationship_dimensions
  alter column tier drop not null;
