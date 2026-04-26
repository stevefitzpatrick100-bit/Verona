-- ============================================================
-- VERONA — Slim Database Schema
-- Supabase (PostgreSQL)
-- April 2026
--
-- 14 tables, ~75 active columns
-- (down from 17 tables, ~155 columns)
--
-- Design principle: every column must change either Angelica's
-- next reply or what the operator sees in the admin. Everything
-- else has been removed.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique,
  display_name text,
  invited_by_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- SESSIONS
-- One row per conversation session
-- ============================================================
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  session_number int not null default 1,
  started_at timestamptz default now(),
  ended_at timestamptz
);

create index idx_sessions_user on sessions(user_id);

-- ============================================================
-- MESSAGES
-- Individual messages within a session
-- ============================================================
create table messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create index idx_messages_session on messages(session_id);
create index idx_messages_user on messages(user_id, created_at);

-- ============================================================
-- THE THREE IMAGES
-- Identical 10-column shape across portrait, partner, relationship.
-- The semantic meaning of position_stated and position_revealed
-- shifts per image:
--
--   Portrait:     stated = their words about self
--                 revealed = what stories/energy show
--   Partner:      stated = what they say they want
--                 revealed = what AI infers from portrait
--   Relationship: stated = imagined (what they think they want)
--                 revealed = evidenced (what history shows works)
-- ============================================================

-- INDIVIDUAL PORTRAIT — who they are
create table portrait_dimensions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  dimension_name text not null,
  grouping text not null,
  position_stated numeric(3,1) check (position_stated between 1 and 10),
  position_revealed numeric(3,1) check (position_revealed between 1 and 10),
  flexibility text default 'moderate' check (flexibility in ('rigid', 'moderate', 'flexible')),
  confidence int default 1 check (confidence between 1 and 5),
  weight int default 5 check (weight between 1 and 10),
  vector text default 'stable' check (vector in ('stable', 'moving_up', 'moving_down')),
  evidence text,
  last_evidence_session int,
  updated_at timestamptz default now(),
  unique(user_id, dimension_name)
);

create index idx_portrait_user on portrait_dimensions(user_id);
create index idx_portrait_grouping on portrait_dimensions(user_id, grouping);

-- PARTNER IMAGE — what they need in a partner
create table partner_dimensions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  dimension_name text not null,
  grouping text not null,
  position_stated numeric(3,1) check (position_stated between 1 and 10),
  position_revealed numeric(3,1) check (position_revealed between 1 and 10),
  flexibility text default 'moderate' check (flexibility in ('rigid', 'moderate', 'flexible')),
  confidence int default 1 check (confidence between 1 and 5),
  weight int default 5 check (weight between 1 and 10),
  vector text default 'stable' check (vector in ('stable', 'moving_up', 'moving_down')),
  evidence text,
  last_evidence_session int,
  updated_at timestamptz default now(),
  unique(user_id, dimension_name)
);

create index idx_partner_user on partner_dimensions(user_id);

-- RELATIONSHIP IMAGE — the shape of the shared life they want
create table relationship_dimensions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  dimension_name text not null,
  grouping text not null,
  position_stated numeric(3,1) check (position_stated between 1 and 10),
  position_revealed numeric(3,1) check (position_revealed between 1 and 10),
  flexibility text default 'moderate' check (flexibility in ('rigid', 'moderate', 'flexible')),
  confidence int default 1 check (confidence between 1 and 5),
  weight int default 5 check (weight between 1 and 10),
  vector text default 'stable' check (vector in ('stable', 'moving_up', 'moving_down')),
  evidence text,
  last_evidence_session int,
  updated_at timestamptz default now(),
  unique(user_id, dimension_name)
);

create index idx_relationship_user on relationship_dimensions(user_id);

-- ============================================================
-- ANGELICA'S PERSONALITY PARAMETERS
-- 10 dials, one row per user, latest values
-- These are read into the system prompt and shape every reply
-- ============================================================
create table personality_params (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade unique not null,

  -- Emotional Presence
  warmth int default 7 check (warmth between 1 and 10),
  pace int default 5 check (pace between 1 and 10),
  validation int default 5 check (validation between 1 and 10),

  -- Communication Style
  precision_of_language int default 5 check (precision_of_language between 1 and 10),
  humour int default 5 check (humour between 1 and 10),

  -- Depth and Challenge
  directness int default 3 check (directness between 1 and 10),
  challenge_level int default 2 check (challenge_level between 1 and 10),
  probing_depth int default 3 check (probing_depth between 1 and 10),

  -- Intellectual / Relational
  reflection_frequency int default 3 check (reflection_frequency between 1 and 10),
  intimacy int default 3 check (intimacy between 1 and 10),

  updated_at timestamptz default now()
);

-- ============================================================
-- CONVERSATION QUALITY (CQ)
-- 10 dimensions, time-series — one row per analysis pass
-- These tell Angelica how the relationship-with-her is going
-- ============================================================
create table cq_dimensions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  session_id uuid references sessions(id),
  measured_at timestamptz default now(),

  -- Relationship Quality
  honesty int check (honesty between 1 and 10),
  trust int check (trust between 1 and 10),
  investment int check (investment between 1 and 10),

  -- Experience Quality
  momentum int check (momentum between 1 and 10),
  frustration int check (frustration between 1 and 10),

  -- Engagement Signal
  return_signal int check (return_signal between 1 and 10),
  arrival_state int check (arrival_state between 1 and 10),
  depth_signal int check (depth_signal between 1 and 10),

  -- Direction Signal
  orientation int check (orientation between 1 and 10),
  dependency_risk int check (dependency_risk between 1 and 10)
);

create index idx_cq_user on cq_dimensions(user_id, measured_at);

-- ============================================================
-- MEMORY — the living document
-- Six small, focused tables. Each holds one kind of thing
-- Angelica notices and might want to return to.
-- ============================================================

-- Territory map — areas explored and how deep
create table territory_map (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  territory text not null,
  depth int default 0 check (depth between 0 and 5),
  last_visited_session int,
  updated_at timestamptz default now(),
  unique(user_id, territory)
);

-- Hypotheses — held lightly, tested over time
create table hypotheses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  text text not null,
  status text default 'active' check (status in ('active', 'confirmed', 'revised', 'discarded')),
  evidence text,
  created_session int,
  resolved_session int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_hypotheses_user on hypotheses(user_id);

-- Fragments — things said once that might matter
create table fragments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  text text not null,
  context text,
  significance text,
  session_number int,
  created_at timestamptz default now()
);

create index idx_fragments_user on fragments(user_id);

-- Silences — topics consistently not raised
create table silences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  topic text not null,
  sessions_absent int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, topic)
);

-- Key moments — conversations that mattered most
create table key_moments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  session_number int,
  description text not null,
  moment_type text check (moment_type in ('reframe', 'insight', 'breakthrough', 'connection')),
  created_at timestamptz default now()
);

create index idx_key_moments_user on key_moments(user_id);

-- Essential truth — the emerging core understanding
create table essential_truth (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade unique not null,
  text text,
  confidence int default 1 check (confidence between 1 and 5),
  updated_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Each user can only access their own data
-- ============================================================
alter table users enable row level security;
alter table sessions enable row level security;
alter table messages enable row level security;
alter table portrait_dimensions enable row level security;
alter table partner_dimensions enable row level security;
alter table relationship_dimensions enable row level security;
alter table personality_params enable row level security;
alter table cq_dimensions enable row level security;
alter table territory_map enable row level security;
alter table hypotheses enable row level security;
alter table fragments enable row level security;
alter table silences enable row level security;
alter table key_moments enable row level security;
alter table essential_truth enable row level security;

-- RLS policies — users can only see/modify their own data
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'sessions', 'messages',
      'portrait_dimensions', 'partner_dimensions', 'relationship_dimensions',
      'personality_params', 'cq_dimensions',
      'territory_map', 'hypotheses', 'fragments', 'silences',
      'key_moments', 'essential_truth'
    ])
  loop
    execute format('
      create policy %I on %I
      for all using (user_id = auth.uid())
      with check (user_id = auth.uid())
    ', 'user_isolation_' || t, t);
  end loop;
end $$;
