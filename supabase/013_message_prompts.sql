-- 013_message_prompts.sql
-- Per-turn snapshot of the system prompt sent to the model when Angelica
-- generated each assistant message. Lets the admin click a reply and see
-- exactly what context produced it.
--
-- One row per assistant message. user / system / room / model captured at
-- the moment of the call.

create table if not exists message_prompts (
  message_id    uuid primary key references messages(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  session_id    uuid references sessions(id) on delete set null,
  system_prompt text not null,
  prompt_label  text,
  room          text,
  model         text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_message_prompts_session on message_prompts(session_id);
create index if not exists idx_message_prompts_user    on message_prompts(user_id);
