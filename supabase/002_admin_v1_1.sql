-- Verona admin PRD v1.1 schema additions

alter table if exists users
  add column if not exists stage int,
  add column if not exists level int;

alter table if exists users
  alter column stage set default 1,
  alter column level set default 1;

alter table if exists users
  add constraint users_stage_range check (stage between 1 and 5),
  add constraint users_level_range check (level between 1 and 3);

alter table if exists sessions
  add column if not exists stage int,
  add column if not exists level int;

alter table if exists cq_dimensions
  add column if not exists rubric_version text;

create table if not exists observer_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  session_id uuid references sessions(id) on delete cascade not null,
  note text not null,
  rubric_version text,
  model_identifier text,
  created_at timestamptz default now()
);

create index if not exists idx_observer_notes_session on observer_notes(session_id, created_at desc);
create index if not exists idx_observer_notes_user on observer_notes(user_id, created_at desc);

create table if not exists message_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  session_id uuid references sessions(id) on delete cascade not null,
  message_id uuid references messages(id) on delete cascade not null,
  note text not null,
  created_at timestamptz default now()
);

create index if not exists idx_message_notes_message on message_notes(message_id, created_at desc);
create index if not exists idx_message_notes_session on message_notes(session_id, created_at desc);

create table if not exists stage_transitions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  session_id uuid references sessions(id) on delete set null,
  session_number int,
  from_stage int,
  to_stage int,
  from_level int,
  to_level int,
  created_at timestamptz default now()
);

create index if not exists idx_stage_transitions_user on stage_transitions(user_id, created_at desc);
create index if not exists idx_stage_transitions_session on stage_transitions(session_id);

-- Enable RLS on new tables when running in production supabase.
alter table if exists observer_notes enable row level security;
alter table if exists message_notes enable row level security;
alter table if exists stage_transitions enable row level security;

-- Create simple owner policies if auth is configured.
do $$
begin
  if exists (select 1 from pg_class where relname = 'observer_notes') then
    if not exists (select 1 from pg_policies where tablename = 'observer_notes' and policyname = 'own_data_observer_notes') then
      execute 'create policy own_data_observer_notes on observer_notes for all using (user_id = auth.uid())';
    end if;
  end if;

  if exists (select 1 from pg_class where relname = 'message_notes') then
    if not exists (select 1 from pg_policies where tablename = 'message_notes' and policyname = 'own_data_message_notes') then
      execute 'create policy own_data_message_notes on message_notes for all using (user_id = auth.uid())';
    end if;
  end if;

  if exists (select 1 from pg_class where relname = 'stage_transitions') then
    if not exists (select 1 from pg_policies where tablename = 'stage_transitions' and policyname = 'own_data_stage_transitions') then
      execute 'create policy own_data_stage_transitions on stage_transitions for all using (user_id = auth.uid())';
    end if;
  end if;
end $$;
