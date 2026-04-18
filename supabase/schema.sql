-- ============================================================
-- VERONA — Database Schema
-- Supabase (PostgreSQL)
-- ============================================================

-- Enable UUID generation
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
-- Conversation sessions — each time a user talks to Angelica
-- ============================================================
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  session_number int not null default 1,
  started_at timestamptz default now(),
  ended_at timestamptz,
  phase text default 'trust' check (phase in ('trust', 'hypothesis', 'diffusion')),
  arrival_state int check (arrival_state between 1 and 10),
  notes text  -- Angelica's session-level observations
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
-- PORTRAIT DIMENSIONS (Individual — 200 dimensions)
-- Each row is one dimension for one user, with three layers
-- ============================================================
create table portrait_dimensions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  grouping text not null,           -- e.g. 'emotional_life', 'values_identity'
  dimension_name text not null,     -- e.g. 'emotional_openness', 'conflict_style'
  dimension_number int,             -- 1-200

  -- Three layers (each can be null until data exists)
  stated_position numeric(3,1) check (stated_position between 1 and 10),
  revealed_position numeric(3,1) check (revealed_position between 1 and 10),
  observed_position numeric(3,1) check (observed_position between 1 and 10),

  -- Metadata
  vector text default 'neutral' check (vector in ('stable', 'moving_up', 'moving_down', 'neutral')),
  vector_rate numeric(3,1),         -- rate of change
  confidence int default 1 check (confidence between 1 and 5),
  resolution text default 'unvisited' check (resolution in ('unvisited', 'emerging', 'forming', 'clear', 'tested')),
  weight int default 5 check (weight between 1 and 10),

  -- Evidence
  last_evidence_session int,
  evidence_notes text,

  updated_at timestamptz default now(),

  unique(user_id, dimension_name)
);

create index idx_portrait_user on portrait_dimensions(user_id);
create index idx_portrait_grouping on portrait_dimensions(user_id, grouping);

-- ============================================================
-- PARTNER IMAGE (50 dimensions)
-- What the user needs in a partner
-- ============================================================
create table partner_dimensions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  category text not null,           -- e.g. 'physical_attraction', 'mind_intellect'
  dimension_name text not null,
  dimension_number int,             -- 1-50

  -- Three layers
  stated_value text,                -- what they say they want
  inferred_value text,              -- derived from portrait
  tested_value text,                -- confirmed through games/dates

  -- Scale position
  position numeric(3,1) check (position between 1 and 10),
  flexibility text default 'moderate' check (flexibility in ('rigid', 'moderate', 'flexible')),

  -- Type and metadata
  dimension_type text default 'stated' check (dimension_type in ('stated', 'drawn', 'derived')),
  confidence int default 1 check (confidence between 1 and 5),
  resolution text default 'unvisited' check (resolution in ('unvisited', 'emerging', 'forming', 'clear', 'tested')),
  evidence_source text check (evidence_source in ('experienced', 'observed', 'imagined', 'untested')),

  updated_at timestamptz default now(),

  unique(user_id, dimension_name)
);

create index idx_partner_user on partner_dimensions(user_id);

-- ============================================================
-- RELATIONSHIP IMAGE (50 dimensions)
-- The shape of the shared life they want
-- ============================================================
create table relationship_dimensions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  tier int not null check (tier between 1 and 3),  -- 1=breaks it, 2=shapes daily, 3=adaptable
  grouping text not null,
  dimension_name text not null,
  dimension_number int,             -- 1-50

  -- Desired overlap (not personality — how much shared space)
  desired_overlap numeric(3,1) check (desired_overlap between 1 and 10),
  flexibility text default 'moderate' check (flexibility in ('rigid', 'moderate', 'flexible')),

  -- Three data layers
  imagined_position numeric(3,1),   -- what they think they want
  evidenced_position numeric(3,1),  -- what history suggests
  unconscious_position numeric(3,1), -- inherited model

  -- Metadata
  default_weight int check (default_weight between 1 and 10),
  user_weight int check (user_weight between 1 and 10),
  confidence int default 1 check (confidence between 1 and 5),
  resolution text default 'unvisited' check (resolution in ('unvisited', 'emerging', 'forming', 'clear', 'tested')),
  evidence_source text check (evidence_source in ('experienced', 'observed', 'imagined', 'untested')),

  updated_at timestamptz default now(),

  unique(user_id, dimension_name)
);

create index idx_relationship_user on relationship_dimensions(user_id);

-- ============================================================
-- SCORES
-- The six measurement scores, tracked over time
-- ============================================================
create table scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  session_id uuid references sessions(id),
  measured_at timestamptz default now(),

  trust_score numeric(3,1) check (trust_score between 0 and 10),
  depth_score numeric(3,1) check (depth_score between 0 and 10),
  readiness_score numeric(3,1) check (readiness_score between 0 and 10),
  self_knowledge_gap numeric(3,1) check (self_knowledge_gap between 0 and 10),
  emotional_availability numeric(3,1) check (emotional_availability between 0 and 10),
  preference_reliability numeric(3,1) check (preference_reliability between 0 and 10),

  -- Component signals for trust score
  response_length_trajectory numeric(3,1),
  specificity_ratio numeric(3,1),
  hedge_frequency numeric(3,1),
  topic_initiation numeric(3,1),
  emotional_vocabulary_shift numeric(3,1)
);

create index idx_scores_user on scores(user_id, measured_at);

-- ============================================================
-- CONVERSATION QUALITY DIMENSIONS (15 CQ dimensions)
-- Tracked per session
-- ============================================================
create table cq_dimensions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  session_id uuid references sessions(id),
  measured_at timestamptz default now(),

  -- Relationship Quality
  honesty int check (honesty between 1 and 10),
  trust int check (trust between 1 and 10),
  safety int check (safety between 1 and 10),
  investment int check (investment between 1 and 10),

  -- Experience Quality
  anticipation int check (anticipation between 1 and 10),
  momentum int check (momentum between 1 and 10),
  progress_belief int check (progress_belief between 1 and 10),
  frustration int check (frustration between 1 and 10),

  -- Engagement Signal
  return_signal int check (return_signal between 1 and 10),
  depth_signal int check (depth_signal between 1 and 10),
  arrival_state int check (arrival_state between 1 and 10),

  -- Direction Signal
  orientation int check (orientation between 1 and 10),
  goal_aliveness int check (goal_aliveness between 1 and 10),
  agency int check (agency between 1 and 10),
  dependency_risk int check (dependency_risk between 1 and 10)
);

create index idx_cq_user on cq_dimensions(user_id, measured_at);

-- ============================================================
-- PERSONALITY PARAMETERS (20 Angelica parameters per user)
-- Current settings — how Angelica adapts to this person
-- ============================================================
create table personality_params (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  updated_at timestamptz default now(),

  -- Emotional Presence
  warmth int default 7 check (warmth between 1 and 10),
  pace int default 5 check (pace between 1 and 10),
  emotional_mirroring int default 5 check (emotional_mirroring between 1 and 10),
  validation int default 5 check (validation between 1 and 10),

  -- Communication Style
  response_length int default 5 check (response_length between 1 and 10),
  question_length int default 5 check (question_length between 1 and 10),
  use_of_silence int default 5 check (use_of_silence between 1 and 10),
  precision_of_language int default 5 check (precision_of_language between 1 and 10),
  humour int default 5 check (humour between 1 and 10),

  -- Depth and Challenge
  directness int default 3 check (directness between 1 and 10),
  challenge_level int default 2 check (challenge_level between 1 and 10),
  challenge_framing int default 3 check (challenge_framing between 1 and 10),
  probing_depth int default 3 check (probing_depth between 1 and 10),
  hypothesis_visibility int default 3 check (hypothesis_visibility between 1 and 10),

  -- Intellectual Register
  intellectual_engagement int default 5 check (intellectual_engagement between 1 and 10),
  reflection_frequency int default 3 check (reflection_frequency between 1 and 10),

  -- Relational Mode
  intimacy int default 3 check (intimacy between 1 and 10),
  reference_to_history int default 3 check (reference_to_history between 1 and 10),
  forward_orientation int default 5 check (forward_orientation between 1 and 10),
  urgency int default 3 check (urgency between 1 and 10),

  unique(user_id)
);

-- ============================================================
-- MEMORY — The living document
-- ============================================================

-- Territory map — which areas explored and to what depth
create table territory_map (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  territory text not null,          -- e.g. 'emotional_life', 'work_ambition'
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
  context text,                     -- what was being discussed when this came up
  session_number int,
  connected_to uuid references fragments(id), -- when a fragment connects to another
  significance text,                -- Angelica's note on why this matters
  created_at timestamptz default now()
);

create index idx_fragments_user on fragments(user_id);

-- Silences — topics consistently not raised
create table silences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  topic text not null,
  sessions_absent int default 1,    -- how many sessions this hasn't come up
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(user_id, topic)
);

-- Key moments — the conversations that mattered most
create table key_moments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  session_number int,
  description text not null,
  moment_type text,                 -- 'reframe', 'insight', 'breakthrough', 'connection'
  portrait_impact text,             -- what this changed in the portrait
  created_at timestamptz default now()
);

create index idx_key_moments_user on key_moments(user_id);

-- Shared history — inside references, play moments
create table shared_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  reference text not null,          -- the shared reference
  origin text,                      -- where it came from (e.g. 'weekend_away_game')
  session_number int,
  created_at timestamptz default now()
);

-- Essential truth — the emerging core understanding
create table essential_truth (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade unique not null,
  text text,
  confidence int default 1 check (confidence between 1 and 5),
  updated_at timestamptz default now()
);

-- ============================================================
-- META LAYER
-- How much to trust the data in the other containers
-- ============================================================
create table meta_layer (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade unique not null,

  trust_in_ai int default 5 check (trust_in_ai between 1 and 10),
  consistency int default 5 check (consistency between 1 and 10),
  openness int default 3 check (openness between 1 and 10),
  emotional_availability int default 5 check (emotional_availability between 1 and 10),
  readiness int default 3 check (readiness between 1 and 10),

  -- Perception gaps
  stated_vs_revealed_distance numeric(3,1),
  stated_vs_inferred_partner_distance numeric(3,1),
  gap_direction text check (gap_direction in ('narrowing', 'stable', 'widening')),
  gap_rate numeric(3,1),

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
alter table scores enable row level security;
alter table cq_dimensions enable row level security;
alter table personality_params enable row level security;
alter table territory_map enable row level security;
alter table hypotheses enable row level security;
alter table fragments enable row level security;
alter table silences enable row level security;
alter table key_moments enable row level security;
alter table shared_history enable row level security;
alter table essential_truth enable row level security;
alter table meta_layer enable row level security;

-- RLS policies — users can only see/modify their own data
-- (applied to all tables with user_id)
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'sessions', 'messages', 'portrait_dimensions', 'partner_dimensions',
      'relationship_dimensions', 'scores', 'cq_dimensions', 'personality_params',
      'territory_map', 'hypotheses', 'fragments', 'silences',
      'key_moments', 'shared_history', 'essential_truth', 'meta_layer'
    ])
  loop
    execute format('
      create policy %I on %I for all using (user_id = auth.uid());
    ', 'own_data_' || t, t);
  end loop;
end $$;

-- Users table — user can only see themselves
create policy own_data_users on users for all using (id = auth.uid());

-- ============================================================
-- UPDATED_AT TRIGGER
-- Auto-update updated_at on any modification
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to all tables with updated_at
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'users', 'sessions', 'portrait_dimensions', 'partner_dimensions',
      'relationship_dimensions', 'personality_params', 'territory_map',
      'hypotheses', 'silences', 'essential_truth', 'meta_layer'
    ])
  loop
    execute format('
      create trigger set_updated_at before update on %I
      for each row execute function update_updated_at();
    ', t);
  end loop;
end $$;

-- ============================================================
-- INVITES
-- Magic links for access-gated entry
-- ============================================================
create table invites (
  id uuid primary key default uuid_generate_v4(),
  token text unique not null,
  name text not null,
  inviter_name text,
  user_id uuid references users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz default now()
);
