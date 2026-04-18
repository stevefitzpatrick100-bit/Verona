# Verona — Admin Console

**Product Requirements Document**

*v1 · April 2026 · Confidential*

---

## Purpose

The admin console exists to answer three questions, in this order:

- **Is anyone using Verona?** — adoption and return behaviour across all users.
- **How is this person's relationship with Angelica changing?** — the arc of one user across sessions.
- **What actually happened in this conversation, and what does it tell me about the prompts?** — one session in detail.

At prototype stage, the admin console is primarily a tool for the product builder to read, learn, and iterate. It is not an operations dashboard. It does not need alerts, scheduled reports, or role-based access. It needs to be fast to open, easy to read, and honest about what the system has and hasn't captured.

## Who this is for

A single operator — the product builder — reading the tool to improve Angelica's system prompts over time. No other roles. No user-facing surfaces. The admin console is a private window into the system.

## What good looks like

The tool is working well when:

- Within thirty seconds of opening the admin, the operator knows whether anyone has engaged since they last checked.
- Within two minutes of clicking a user, they have a complete picture of that person's trajectory — where they started, where they are now, what Angelica has learned about them.
- Within five minutes of reading a session, the operator has a concrete view on one prompt they want to change and why.

The tool is failing when the operator cannot answer those three questions without exporting data, running SQL, or cross-referencing multiple screens.

## The three views

### 1. Adoption

**Default view.** A single table of all users, sorted by most-recent-activity descending. Columns: name, status (active / recent / dormant), joined date, last active, total sessions, total time in conversation, current phase.

Above the table, three summary numbers: total users, users active in the last 7 days, total sessions in the last 7 days. No charts, no filters, no search. At the scale of ten to fifty users, these are unnecessary.

*Interaction: clicking a user row opens the user journey for that person.*

### 2. User journey

A chronological feed of one user's sessions, newest first. Each session is a card containing:

- Session number, phase, duration, number of turns, and time since start.
- "What emerged" — fragments captured, hypotheses added or resolved, key moments logged, territory updated, dimensions evidenced. The bullet list that tells the story of that session without making the operator read the transcript.
- Scores at session end — Trust, Depth, Readiness — as a trailing summary.
- A clear affordance to view the full conversation.

Alongside the session feed, a persistent "Portrait so far" panel showing: the essential truth (if formed), active hypotheses, most resolved dimensions by weight, and silences (topics consistently not raised). This is the accumulated state — the journey is the process by which it was built.

*Interaction: clicking a session card opens the session analysis for that session.*

### 3. Session analysis

Two columns. Left: the full conversation, top to bottom, with timestamps and role labels. No truncation. Readable.

Right: what Angelica extracted from this session. Scores at end of session, with deltas if multiple measurements were taken. Key moments with descriptions. Fragments captured, with context and significance notes. Hypotheses added or resolved. Dimensions evidenced. Territory covered with depth readings.

No turn-level charts, no flagging system, no prompt-version switcher. The first version of session analysis is a close-reading surface, not a debugger. The instrument for tuning prompts comes later, once the operator has read enough sessions to know what signals matter.

## Navigation

A breadcrumb at the top of the page: `Adoption › Tracey › Session 3`. Each segment is clickable and navigates backward. The three views are destinations reached by clicking through — they are not tabs.

Two tabs persist across all views: **Conversations** (which houses the three views above) and **Invites** (unchanged — for managing magic-link tokens).

## Data surfaced

The admin reads from the existing Verona schema. No new tables or columns are required for v1. Specifically:

- `users` — adoption table, user journey header.
- `sessions` — session cards, session analysis header.
- `messages` — conversation transcript in session analysis.
- `scores` — trailing summary in session cards, detailed in session analysis.
- `fragments`, `hypotheses`, `key_moments`, `portrait_dimensions`, `territory_map` — the "what emerged" bullet list in session cards and the analysis panel in session view.
- `essential_truth`, `silences` — portrait-so-far panel in user journey.

Attribution of fragments, hypotheses, key moments, and dimensions to specific sessions is done by `session_number` (integers 1, 2, 3…) and `last_evidence_session`. Attribution of scores uses `session_id` directly. This is sufficient at prototype stage.

## Out of scope for v1

Explicitly not in v1, in priority order for later consideration:

- Turn-by-turn personality parameter tracking and heatmap or line-chart visualisation.
- Per-turn flagging and notes for prompt tuning.
- Prompt version tracking and the ability to filter messages by the prompt that produced them.
- Cohort analysis, retention curves, depth-over-time trends.
- Search across conversations.
- Export to CSV or any other format.
- Multi-operator access, roles, or audit log.

These are not failures of v1. They are the next layer, added once v1 reveals which questions are actually being asked.

## Success signals

V1 is a success if the operator:

- Checks the admin within an hour of sending a new invite.
- Reads at least one full conversation from a user before making any prompt change.
- Can explain, from memory, the trajectory of any user in their system.
- Changes at least one system prompt based on something they saw in the admin in the first two weeks of use.

V1 is failing if the operator opens the admin, scans the Adoption view, and closes it without clicking into a user. That would mean the admin is confirming engagement but not enabling learning.

## What is built in v1

Shipped April 2026:

- Adoption view with summary numbers and sorted users table.
- User journey view with session feed and portrait-so-far panel.
- Session analysis view with conversation and analysis columns.
- Breadcrumb navigation between the three views.
- Invites tab retained for magic-link management.
- Single API endpoint (`/api/admin`) returning everything the three views need in one payload.
- Password gate retained — sessionStorage-based, same as v0.

No database migrations. No changes to the chat route or portrait-update logic. Two files changed: `app/admin/page.js` and `app/api/admin/route.js`.

## Known limitations

The v1 admin honestly reflects what the system has captured. It does not extrapolate or synthesise. In particular:

- Personality parameters are stored only as latest values, so they cannot be shown per turn in v1. This is a schema limitation and will be addressed when per-turn tuning becomes the primary job.
- Session attribution of some records (fragments, hypotheses) relies on an integer `session_number` rather than a foreign key to `sessions.id`. Acceptable at this scale.
- The admin password is stored in `sessionStorage`. Adequate for a solo-operator prototype, not suitable for any multi-user future.

These limitations are acknowledged rather than hidden. They define the roadmap for v2.

## Guiding principle

*The admin console is an instrument for reading, not a dashboard for monitoring.* Every decision about what to add should start with: does this help the operator read a conversation more carefully, or understand a user's journey more clearly? If yes, build it. If it is there to make the tool look more complete or more professional, leave it out. The admin serves Angelica's improvement. Nothing else.
