-- 005_observer_room.sql
-- The Observer narrates which room Angelica is currently in.
-- Rooms are admin-side architecture; the user never hears the names.
-- See Verona Migration: Stages -> Rooms (April 2026).

alter table cq_dimensions
  add column if not exists room text
  check (room is null or room in (
    'entrance', 'lounge', 'therapy', 'studio',
    'confessional', 'dating_admin', 'matchmaker'
  ));

create index if not exists idx_cq_room on cq_dimensions(room);
