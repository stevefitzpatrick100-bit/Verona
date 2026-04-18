-- =================================================================
-- VERONA — Add inviter_name to users
-- Captures who introduced this user so Angelica can reference them
-- in her opening message.
-- =================================================================

-- Add column to users
alter table users
  add column if not exists invited_by_name text;

-- Add column to invites so the admin can capture the inviter's name
-- when creating the invite token. The value gets copied to users on
-- first validation.
alter table invites
  add column if not exists inviter_name text;
