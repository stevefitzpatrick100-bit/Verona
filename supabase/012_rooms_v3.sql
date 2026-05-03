-- 012_rooms_v3.sql
-- Verona — The Five Rooms (v3, April 2026)
--
-- Slim seven rooms → five rooms.
--   entrance     → lounge      (lounge becomes the entrance for new users)
--   confessional → therapy     (folded into therapy as a single moment, not a room)
--   lounge, therapy, studio, dating_admin, matchmaker — retained
--
-- Updates:
--   1. Re-map any historical 'entrance' / 'confessional' values in
--      cq_dimensions.room and (if present) users.pinned_room.
--   2. Replace the CHECK constraints with the slim list.
--   3. Deactivate now-obsolete prompt_versions rows (room_entrance,
--      room_confessional). Their content is preserved for audit but
--      they will never load again.
--
-- Safe to re-run. The pinned_room block no-ops if migration 008
-- has not been applied.

-- 1. Re-map values ------------------------------------------------------------

update cq_dimensions
   set room = case room
                when 'entrance'     then 'lounge'
                when 'confessional' then 'therapy'
                else room
              end
 where room in ('entrance', 'confessional');

do $mig$
begin
  if exists (
    select 1 from information_schema.columns
     where table_name = 'users' and column_name = 'pinned_room'
  ) then
    update users
       set pinned_room = case pinned_room
                           when 'entrance'     then 'lounge'
                           when 'confessional' then 'therapy'
                           else pinned_room
                         end
     where pinned_room in ('entrance', 'confessional');
  end if;
end
$mig$;

-- 2. Replace CHECK constraints ------------------------------------------------

-- cq_dimensions.room
do $mig$
declare
  cname text;
begin
  for cname in
    select conname
      from pg_constraint
     where conrelid = 'cq_dimensions'::regclass
       and contype  = 'c'
       and pg_get_constraintdef(oid) ilike '%room%'
       and pg_get_constraintdef(oid) ilike '%entrance%'
  loop
    execute format('alter table cq_dimensions drop constraint %I', cname);
  end loop;
end
$mig$;

alter table cq_dimensions
  drop constraint if exists cq_dimensions_room_check;

alter table cq_dimensions
  add constraint cq_dimensions_room_check
  check (room is null or room in (
    'lounge', 'therapy', 'studio', 'dating_admin', 'matchmaker'
  ));

-- users.pinned_room (only if the column exists)
do $mig$
declare
  cname text;
begin
  if not exists (
    select 1 from information_schema.columns
     where table_name = 'users' and column_name = 'pinned_room'
  ) then
    return;
  end if;

  for cname in
    select conname
      from pg_constraint
     where conrelid = 'users'::regclass
       and contype  = 'c'
       and pg_get_constraintdef(oid) ilike '%pinned_room%'
       and pg_get_constraintdef(oid) ilike '%entrance%'
  loop
    execute format('alter table users drop constraint %I', cname);
  end loop;

  execute 'alter table users drop constraint if exists users_pinned_room_check';
  execute 'alter table users add constraint users_pinned_room_check '
       || 'check (pinned_room is null or pinned_room in ('
       || '''lounge'', ''therapy'', ''studio'', ''dating_admin'', ''matchmaker''))';
end
$mig$;

-- 3. Retire obsolete prompt versions -----------------------------------------

update prompt_versions
   set is_active = false
 where prompt_key in ('room_entrance', 'room_confessional')
   and is_active = true;
