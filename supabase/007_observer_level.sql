-- 007_observer_level.sql
-- The Observer also reads the level of the conversation:
--   1 = warm stranger    (light, getting to know each other)
--   2 = knows them       (real territory, has earned context)
--   3 = trusted advisor  (deep, asks the hard things, named with care)

alter table cq_dimensions
  add column if not exists conversation_level int
  check (conversation_level is null or conversation_level between 1 and 3);

create index if not exists idx_cq_level on cq_dimensions(conversation_level);
