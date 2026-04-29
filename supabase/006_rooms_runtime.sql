-- 006_rooms_runtime.sql
-- Runtime support for rooms: receptive material storage and consent tracking.
-- See Verona Migration: Stages -> Rooms (April 2026), Deploy B.

-- Material from Therapy and Confessional rooms is RECEPTIVE: it is held here
-- and does NOT cross into the user's substrate (portrait/partner/relationship
-- dimensions, essential_truth, hypotheses) unless the user explicitly consents.
create table if not exists receptive_material (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  room text not null check (room in ('therapy', 'confessional')),
  user_message text not null,
  assistant_message text,
  recorded_at timestamptz not null default now(),
  consent_to_cross boolean not null default false,
  consent_recorded_at timestamptz,
  crossed_to_substrate boolean not null default false,
  crossed_at timestamptz
);

create index if not exists idx_receptive_user on receptive_material(user_id, recorded_at desc);
create index if not exists idx_receptive_session on receptive_material(session_id);
create index if not exists idx_receptive_pending_consent on receptive_material(user_id)
  where not crossed_to_substrate;
