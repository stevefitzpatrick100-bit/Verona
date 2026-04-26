# Verona — Admin Console

**Product Requirements Document**

*April 2026 · Confidential*

---

## Purpose

The admin console is a private window into the system, used by one operator to read the conversations Angelica is having and to learn from them. It exists to answer four questions, in this order:

- **Is anyone using Verona?** — adoption and return behaviour across all users.
- **Who is this person, in Angelica's understanding?** — the substrate she has built around them.
- **What has actually happened with them?** — the conversations, in detail, and the journey through stages.
- **Is the relationship working?** — independent observer judgement on conversation quality.

These four questions correspond to four surfaces in the tool. Each surface earns its place by helping with one question. A surface that does not help with one of the four does not belong here.

The admin is a reading instrument, not a monitoring dashboard. It does not track engagement. It does not raise alerts. It does not optimise for time-in-tool. It exists so the operator can read carefully and tune Angelica deliberately. Every other intent is the wrong intent.

## Who this is for

A single operator — the product builder — using the tool to improve Angelica's behaviour over time. No other roles. No user-facing surfaces. No multi-operator workflow.

This will not always be the right scope. When Verona is no longer a prototype, the admin will become a different product. That is later.

## What good looks like

The tool is working well when:

- Within thirty seconds of opening it, the operator knows whether anyone has engaged since they last checked.
- Within two minutes of clicking a user, they know who that person is, where they are in the relationship, and what the most recent conversation produced — without reading any transcripts.
- Within five minutes of opening a session, they have both a felt sense of how the conversation went and an independent verdict on it, and the correlation (or contradiction) between the two is the most useful thing the admin produces.
- The operator finds themselves writing notes against sessions, not just reading them.
- When a stage or level reading is wrong, the operator notices within seconds because that information is in their face on every screen.

The tool is failing when:

- The operator opens it, scans the entry view, and closes it without clicking into a user.
- The Substrate surface is built but rarely visited, because the Overview tells the operator enough — meaning Substrate is not pulling its weight.
- The Substrate and CQ surfaces feel like the same thing dressed differently — meaning the architectural separation between Angelica's self-knowledge and the observer's verdict has not been made cleanly underneath.

## The structural model

The admin is organised around the user as the unit of context. Almost every question the operator wants to answer is a question about a user, and once they have clicked into a user they should be able to move between different views *of that user* without losing the context.

The shape, therefore, is:

- **Adoption** — the entry point. A directory of users.
- **User** — what you reach when you click a user. Tabs across distinct views of the same person.
- **Session** — what you reach when you click a conversation from inside a user. Panels, side by side, for close reading.

A breadcrumb at the top traces the path: `Adoption › Sarah › Conversations › Session 3`. Each segment is clickable and navigates backward.

Alongside the conversation surfaces, a separate **Invites** tab handles magic-link token management. It does not interact with anything else and is reached from the top-level tab strip.

## Adoption

A single table of all users, sorted by most-recent-activity descending. Above it, three summary numbers: total users, active in the last 7 days, sessions in the last 7 days.

The columns of the users table:

| Column | Purpose |
|---|---|
| Name | display name, or invitation name if not yet set |
| Status | active / recent / dormant, by last activity |
| Stage | current stage (1–5) with short label — *"2 · Knowing"* |
| Level | current level (1–3) — *"Level 2"* |
| Last active | relative time since most recent session |
| Sessions | count |
| Time | total minutes in conversation |
| Joined | absolute date |

No charts. No filters. No search. At the scale of ten to fifty users, these add nothing and invite the operator to scan instead of read.

Clicking a user row enters the User surface for that person.

## User

A persistent context. Once entered, the operator stays inside this user until they navigate elsewhere via the breadcrumb.

### The header strip

At the top of every tab inside a user, a strip displays:

- Name
- Stage (number and short name)
- Level (number and short name)
- Last active
- Total sessions
- Total time in conversation
- Joined date and inviter name

This is the fast read. It answers *who am I looking at, and where are they?* and is needed across every tab. The header is read-only.

### The tabs

Four tabs, in order of how often they will be used.

**Overview.** The default landing tab. Designed to answer *what's the state of this person right now?* without diving deep. It shows:

- The essential truth (if formed) as a single italicised quote, with confidence and the session in which it formed.
- Active hypotheses, listed.
- The most recent session as a small card linking through to the Session view.
- Headline scores at last reading: Trust, Depth, Readiness, Self-knowledge gap, Emotional availability — each as a small bar with the numeric value.
- Headline CQ readings at last session (a handful of dimensions chosen for fast read: Honesty, Depth signal, Momentum, Frustration, Return signal) plus the most recent observer note.

Everything on this tab points elsewhere. It is a reading aid, not a destination.

**Substrate.** Three columns, treating the substrate as first-class material rather than a sidebar.

- *Portrait* — the dimensions Angelica has built about this person, grouped by category (emotional, temperament, relational, intellectual, status), sorted by weight within each group. Silences are listed in their own block beneath the portrait.
- *Partner image* — what kind of person they are looking for. Stated, drawn, and derived dimensions, distinguished. Empty until Stage 3 work has begun, with explicit text explaining why it is empty rather than appearing as missing data.
- *Relationship image* — what kind of relationship they want to build. Same treatment as partner image.

These three are *who they are* in the order Angelica builds them. The Substrate tab is what the operator goes to when the question is *what does Angelica actually understand about this person?*

**Conversations.** A chronological feed of sessions, newest first. Each session is rendered as a card containing:

- Session number, the stage and level at which the session ran (with transitions if any occurred during the session), duration, turn count, time since.
- "What emerged" — a compact bullet list of the substrate updates from this session: fragments captured, hypotheses added or resolved, key moments logged, territory updated, dimensions evidenced.
- Trailing scores at session end: Trust, Depth, Readiness, plus the CQ overall reading.
- A clear affordance to open the conversation.

Clicking a card opens the Session view.

**CQ.** The observer's view across this user's sessions. Two columns:

- *Left, wider*: the 15 CQ dimensions, grouped by category (Relationship Quality, Experience Quality, Engagement Signal, Direction Signal). Each dimension is a small bar strip across sessions — six bars for six sessions, showing trajectory at a glance. The most recent reading is highlighted.
- *Right, narrower*: the observer's free-text notes for each session, listed chronologically newest first, each tagged with the rubric version under which it was produced.

The CQ tab answers *is this relationship working?* — which is a different question from anything the Substrate or Conversations tabs can answer.

## Session

Reached by clicking a session card from the Conversations tab. Two-pane layout, with a session header strip at the top showing session number, time, duration, turn count, and the stage / level / phase at which it ran.

**Left pane.** The transcript. Full and untruncated. Each turn is rendered as a card with role label, timestamp, and the message body. User and Angelica turns are visually distinguished. Each turn is clickable, allowing a per-message note to be attached.

**Right pane.** A chooser at the top of the pane lets the operator switch between three views, each filling the right side alongside the transcript.

- *Substrate snapshot.* What was extracted from this session: key moments, fragments captured, hypotheses added or resolved, dimensions evidenced, territory updated. The default view, because it is the most common close-reading question.
- *CQ verdict.* The observer's reading of this session: the 15 dimensions with deltas from the previous reading, the observer's free-text note, and run metadata (which model produced this, which rubric version, when).
- *Notes.* The operator's own notes attached to this session, plus any per-message notes added by clicking turns in the transcript. Append-only, with timestamps.

The pane choice persists per session — returning to a session restores the pane the operator was last viewing.

## Invites

A separate tab from Conversations, reached from the top-level tab strip. Unchanged in design from how invitation management has worked since v0:

- A field to create a new invite by name (and optionally inviter name, used for Angelica's opening greeting).
- A list of all invites, showing name, inviter, used / unused status with timestamp, and the magic-link URL.
- Click-to-copy on the URL with a brief visual confirmation.
- A delete button per invite.

## Data the admin reads

| Source | Used in |
|---|---|
| `users` (with `stage`, `level` fields) | Adoption table, user header strip |
| `sessions` | Session cards, Session header |
| `messages` | Transcript |
| `scores` | Headline scores in Overview, scores trailing in Conversation cards |
| `fragments`, `hypotheses`, `key_moments`, `territory_map`, `portrait_dimensions` | Substrate tab, Substrate snapshot pane, "what emerged" in Session cards |
| `partner_dimensions` | Substrate tab — Partner image column |
| `relationship_dimensions` | Substrate tab — Relationship image column |
| `essential_truth`, `silences` | Overview, Substrate tab |
| `cq_dimensions` (with `rubric_version`) | CQ tab, CQ verdict pane, Overview headline |
| `observer_notes` | CQ tab, CQ verdict pane |
| `message_notes` | Notes pane, click-on-turn surface |
| `stage_transitions` | Stage transitions shown on Session cards |
| `invites` | Invites tab |

The full payload is delivered through a single endpoint, `/api/admin`. At current scale this is the right shape; it will need to change before the user count makes the payload heavy, but not before.

## Schema requirements

The following additions are required for the admin to function as described:

- `users.stage` (integer 1–5) and `users.level` (integer 1–3).
- `cq_dimensions.rubric_version` (text) — so the observer's judgements can evolve without invalidating history.
- `observer_notes` table — keyed by session, storing the free-text observer note, with rubric version, model identifier, and timestamp.
- `message_notes` table — keyed by message, storing the operator's per-turn notes.
- `stage_transitions` table — append-only log of when each user transitioned between stages, with the session in which the transition was detected.

The admin makes no other changes to the database. It is read-only with respect to user data. It writes only to the notes tables and only on operator action.

## Authentication

A single password, stored in `sessionStorage` after first successful entry. Adequate for a solo operator on a private prototype. Inadequate for any future state with multiple readers; that is a known constraint.

The login screen asks for the password and nothing else. Wrong-password attempts clear `sessionStorage` and show a small error.

## What the admin deliberately does not do

These are the questions the admin will not try to answer in this version, listed with the reasons each was excluded.

- **No turn-by-turn personality parameter heatmap.** This requires per-turn capture of the parameter values that fed Angelica's response, which is its own piece of architectural work. When per-turn capture exists, a developer view will likely become a fourth right-pane option in the Session view.
- **No prompt-version switcher or prompt-tuning UI.** Prompts continue to be edited in code. The friction of editing in a separate workflow is a feature: it makes the operator slow down and read sessions before changing prompts.
- **No A/B testing of system prompts.** The unit of evaluation is the relationship over weeks, not the message over minutes. Optimising for short-loop signals is exactly the failure mode of every other dating product.
- **No cohort dashboards, retention curves, depth-over-time trends across users.** Cross-user pattern analysis tempts the operator to look at numbers instead of reading sessions. At ten to fifty users, the numbers don't mean anything anyway.
- **No search across conversations.** Memorable sessions can be navigated to via the user. Cross-cutting search is a different tool.
- **No export to CSV or any other format.** Read here. The admin is a reading surface, not an extraction surface.
- **No multi-operator access, roles, or audit logging.** Single operator. Single password.
- **No engagement metrics.** The product succeeds when users stop needing it. Tracking engagement actively pulls the design in the wrong direction.
- **No human in the matching loop.** When matching exists, it will be agent-to-agent. The admin will surface the agent-to-agent decisions for inspection but will not be the place where those decisions are reviewed before the user sees them.

## Architectural assumption

The admin assumes that conversation quality is measured by an independent observer — a separate prompt, run after the conversation, against the full transcript with a versioned rubric. This is distinct from the portrait extraction loop that updates Angelica's self-knowledge of the user. The two must not be the same call. The CQ tab and the CQ verdict pane only mean what they should mean if the observer is genuinely independent of the thing it is judging.

If this architectural separation has not been made, the CQ surfaces in the admin will work mechanically but will be epistemically compromised, and the admin will be quietly lying about the quality of its judgements.

## Known limitations

- The admin password is stored in `sessionStorage`. Adequate for a solo operator. Not suitable for any future where another person reads the tool.
- Some session attributions still rely on integer `session_number` rather than a foreign key to `sessions.id`. Acceptable at current scale.
- Personality parameters are stored only as latest values. The Substrate tab therefore cannot show how Angelica's parameters dialled across a session. This is a schema limitation; per-turn capture is its own piece of work.
- Stage and level transitions are visible only at the moments they occur (in Session cards). The trajectory of stages and levels across a user's whole journey is not surfaced as a dedicated visualisation. If this proves to be a frequent question, it earns its own tab.

These limitations are stated, not hidden. They define what the next revision will need to address.

## Guiding principle

*The admin console is an instrument for reading, not a dashboard for monitoring.*

Reading means three different things at three different surfaces:

- Reading **who someone is** — the Substrate tab.
- Reading **what happened with them** — the Conversations tab and Session view.
- Reading **whether it's working** — the CQ tab.

Every decision about what to add should start with: does this help with one of the three readings? If yes, build it. If it is there to make the tool look more complete or more professional, leave it out.

The admin serves Angelica's improvement. Angelica serves the person. Nothing else.

---

*VERONA — Admin Console PRD — April 2026*
