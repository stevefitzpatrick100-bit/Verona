-- 008_pinned_room.sql
-- Admin-set room override. When non-null, lib/rooms.getCurrentRoom returns this
-- value instead of the Observer's most recent classification, so Angelica
-- behaves per the pinned room until the operator clears it.

alter table users
  add column if not exists pinned_room text
  check (pinned_room is null or pinned_room in (
    'entrance', 'lounge', 'therapy', 'studio',
    'confessional', 'dating_admin', 'matchmaker'
  ));

create index if not exists idx_users_pinned_room on users(pinned_room) where pinned_room is not null;
