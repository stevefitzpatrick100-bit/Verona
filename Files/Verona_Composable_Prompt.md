# VERONA — The Composable Prompt
*How Angelica's System Prompt Is Assembled Each Turn — April 2026 — Confidential*

---

## The Problem

Angelica's behaviour is the product of many design decisions — her character, the stage of the user's journey, the level of the relationship, what the system currently knows about the user, and what has happened in the conversation so far. All of these need to reach the model on every turn.

The obvious way to do this — a single long system prompt containing everything — fails on three counts.

**It bloats.** As the design grows, the prompt grows. Every new rule, every new stage detail, every new instruction adds to the pile. Soon the prompt is five thousand words and growing. Token cost rises. Latency rises. Irrelevant instructions compete with relevant ones for the model's attention.

**It dilutes.** The model follows instructions that are present and salient. A Stage 1 rule buried in a wall of Stage 2, 3, 4 and 5 rules competes with everything around it. The rules that matter for *this* user at *this* moment are harder to find — for the model, and for the person editing them.

**It resists iteration.** Tuning one stage means navigating a long document, finding the relevant section, and avoiding accidental changes to unrelated sections. The product builder cannot easily reason about *which* instructions are active at any moment.

The answer is to stop sending Angelica everything. Send her only what applies to this turn, for this user, in this state. The full design lives in modular fragments. The prompt is assembled fresh each turn from the subset that is relevant.

---

## The Principle

The system prompt composes. This is already stated in *The Five Stages* and *The Three Levels*:

> *Angelica's behaviour at any moment is a composition of Level N rules, Stage N rules, and the current substrate state.*

This document describes how that composition actually works.

The final prompt sent to the model on any given turn is the sum of four things:

- **Core** — who Angelica is. Character, voice, the dinner party test, the never-dos. Always included.
- **Stage module** — the rules for the stage the user is currently in. One of five. Loaded based on the user's stored stage.
- **Level module** — the rules for the level the relationship is at. One of three. Loaded based on the user's stored level.
- **State** — a compact snapshot of what the system currently knows about this user. Generated fresh each turn from the database.

Nothing else is included. No instructions for stages the user is not in. No rules for levels the relationship has not reached. No dormant guidance for situations that do not apply right now.

---

## The Four Parts

### Core

The core is who Angelica is. It does not change between users, stages, or levels. It is the only part of the prompt that is always included.

It contains: her character — warm, curious, perceptive, Italian in spirit, unhurried. The dinner party test. The things she never does (no bullet points, no clinical language, no "as an AI", no emojis, no unsolicited advice). How she listens — energy, specificity, return patterns, silences, the gap. The principles of how she responds — short, warm, specific, one question at a time.

The core is short. It is the heart of Angelica and nothing else. Everything contextual lives in the modules.

### Stage Module

There are five stage modules, corresponding to the five stages in *Verona — The Five Stages*. Only the active stage is loaded.

Each stage module describes what the conversation is *for* at this moment in the user's journey. What Angelica is doing. What she is building. What the user must feel. What the user must not feel. What triggers a transition to the next stage. Specific behavioural rules that apply only at this stage.

A Stage 1 module, for instance, contains the rules for the six-questions bookkeeping flow, the permission-and-register-shift framing, and the Stage 1 gating principle — that she is not yet representing the user to other agents. A Stage 4 module contains rules about agent-to-agent conversations and the three-factor match. These rules never meet. They are never both loaded at the same time.

### Level Module

There are three level modules, corresponding to the three levels in *Verona — The Three Levels*. Only the active level is loaded.

Each level module sets the tonal and relational licence. At Level 1, Angelica holds her private read silently. At Level 2, she has earned the right to offer a small mirror. At Level 3, she can speak plainly and push back.

The level module does not describe what the conversation is about — that is the stage's job. It describes *how Angelica is allowed to sound*. A user in Stage 3 at Level 1 sounds different from a user in Stage 3 at Level 3, even though the work is the same.

### State

State is a compact, live snapshot of what matters about this user right now. It is not a module — it is generated from the database on every turn.

State includes: whether the six basics have been captured, and which ones. Current trust, depth, and readiness scores. The essential truth, if it has formed. Active hypotheses. Key moments from recent sessions. Territory coverage. Any silences being tracked. Personality parameter values.

State is the connective tissue between the design and the individual user. The stage module says *"if basics are incomplete and conversational footing has been established, offer to do the bookkeeping"*. State tells the model whether basics are incomplete.

---

## How the Assembly Works

On every turn, the system:

1. Loads the user record. This contains the user's current stage and level.
2. Reads the core from disk.
3. Reads the stage module for the user's current stage from disk.
4. Reads the level module for the user's current level from disk.
5. Builds the state snapshot from the database.
6. Concatenates the four parts into a single prompt.
7. Sends the prompt, together with the conversation history, to the model.

The core, stage modules, and level modules are plain text files on disk. They are cached in memory at startup, so disk reads are not repeated on every turn. State is rebuilt each turn because it changes.

The assembly logic is trivial. It is a lookup and a concatenation — not a decision. The *interesting* decisions happen elsewhere in the system: when a user transitions between stages, when a level unlocks, when a hypothesis is added or resolved, when a key moment is logged. The prompt assembler simply reads what has been decided.

---

## The File Structure

Each module is a separate file. Something like:

```
/prompts
  core.md
  stages/
    stage-1.md
    stage-2.md
    stage-3.md
    stage-4.md
    stage-5.md
  levels/
    level-1.md
    level-2.md
    level-3.md
```

Plain markdown. No code. No templating.

This structure makes three things easy:

**Editing.** Tuning Stage 2 means opening `stage-2.md`, making a change, and saving. No code is touched. No redeployment is needed beyond whatever refreshes the file cache. Stage 1 and Stage 4 users are unaffected.

**Reasoning.** Each file is short and single-purpose. A three-hundred-word Stage 1 module is legible. When something goes wrong in a Stage 1 conversation, the relevant prompt is readable in its entirety.

**Evaluation.** When reviewing a past conversation, the system can reconstruct exactly which modules were loaded. If Stage 3 behaviour surprises, the Stage 3 module is the single file to inspect.

---

## Why This Is Better

Three things, each non-trivial.

**Focus.** The model follows instructions that are present better than instructions buried in a wall. A lean prompt containing only the rules that apply right now means those rules actually happen. A Stage 1 user is not subtly pulled by Stage 4 matching rules that do not yet apply to them.

**Iteration.** The product is tuned module by module. Improvements to one stage can be made without risking regressions in others. New stages or levels could be added by dropping new files into the folder. The design document *is* the prompt, effectively — they can be kept in sync because both are short, focused files.

**Legibility.** The team working on Verona, and future people reading this design, can understand exactly what Angelica is doing in any given state by reading four short files. There is no monolith. Nothing is hidden.

---

## What Composition Does Not Do

It does not make decisions. It does not choose the user's stage or level. Those decisions live in the substrate — in the code that watches the conversation, tracks the scores, detects the unlocking signals, and updates the user record. The assembler only reads what the substrate has written.

It does not mix modules. A user is in Stage 1 or Stage 2 — never both. A relationship is at Level 1 or Level 2 — never both. The assembly is always a single stage module plus a single level module. Transitions between stages and levels are clean swaps, not gradients.

It does not replace the design documents. *The Five Stages* and *The Three Levels* remain the authoritative description of the design. The module files are the instructions given to the model — shorter, more directive, stripped of the *why*. The *why* lives in the design documents. The *what* lives in the modules.

---

## What the User Feels

Nothing, directly. The composition is invisible.

When a user moves from Stage 1 to Stage 2, their next turn is generated by a prompt that is materially different from the one that generated their previous turn. Angelica behaves differently. But she does not announce it. She simply begins to do the Stage 2 work — holding up the mirror, offering observations, going a little deeper than she did before.

The user feels a shift they cannot quite name. That is the design. From *The Five Stages*:

> *A good stage transition is one the user barely notices — until later, when they look back and realise the relationship has moved.*

The composable prompt is the mechanism that makes this possible. The shift in Angelica's voice is not a gradual drift — it is a precise change, because the instructions she is following have precisely changed.

---

## Implementation Notes

- **Modules are cached at startup.** Disk reads do not happen per turn. A file watcher or simple refresh mechanism can reload modules on change during development.
- **State is built per turn.** The database is queried on each turn to construct the state snapshot. This is where the freshness matters — the user's current scores, most recent key moments, and latest hypotheses must reach the model in real time.
- **The core is the only invariant.** Everything else is chosen based on user state. If a user has no stage or level stored — the first-ever turn with Angelica — sensible defaults apply: Stage 1, Level 1.
- **Order matters slightly.** Core first, then stage, then level, then state. This mirrors the structure of specificity — who Angelica is, what this conversation is for, how she is allowed to sound, what she knows about this person.
- **Total prompt length target: under 1,500 words.** Not a hard limit, but a design target. If a module grows beyond a few hundred words, something in it probably belongs in the design document rather than in the prompt.
- **The assembler is a single function.** In the current codebase, this replaces the `ANGELICA_SYSTEM_PROMPT` constant in `lib/prompts.js` with a `buildPrompt(userId)` function that returns the assembled string.

---

## What This Gives Verona

- **A prompt system that scales with the design.** Adding detail does not bloat every conversation.
- **Iteration without regression.** Tuning one module does not affect others.
- **A clean mapping between design and behaviour.** Each design document corresponds to a module. The link is direct and auditable.
- **Lean turns.** Lower token cost, faster responses, sharper model attention.
- **A legible system.** Anyone can read the four parts loaded for a given turn and understand exactly what Angelica has been told to do.

---

*VERONA — The Composable Prompt — April 2026*
