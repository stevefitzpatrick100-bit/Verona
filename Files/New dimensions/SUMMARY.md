# Verona — Slim Schema and Dimension Catalogue

The complete output of this design session, ready to drop into Supabase.

## What's in this bundle

| File | Purpose |
|---|---|
| `schema.sql` | The 14-table slim schema. Run first. |
| `dimension_catalogue.sql` | The 100-dimension catalogue with seed data. Run second. |
| `prompts.js` | Updated `PORTRAIT_ANALYSIS_PROMPT` matching the slim schema. |
| `portrait-update.js` | Updated `applyPortraitUpdate` function matching the slim schema. |
| `SUMMARY.md` | This file. |

## Setup order

1. Open Supabase SQL Editor.
2. Run `schema.sql` — creates 14 empty tables.
3. Run `dimension_catalogue.sql` — creates the `dimension_catalogue` reference table and inserts all 100 dimensions.
4. Replace the existing `lib/prompts.js` with the new version.
5. Replace the existing `lib/portrait-update.js` with the new version.

## What changed from the original Verona schema

### Tables: 17 → 14 (plus 1 new reference table)

**Dropped (3 tables):**
- `meta_layer` — fields duplicated `scores` and `cq_dimensions`. Useful information folded into CQ.
- `scores` — six scores absorbed: trust/depth/readiness now derive from CQ readings; self_knowledge_gap is the position_stated vs position_revealed gap; emotional_availability and preference_reliability derive.
- `shared_history` — too thin to justify its own table; inside references live as fragments.

**Added (1 reference table):**
- `dimension_catalogue` — the canonical 100-dimension list. Single source of truth for dimension definitions, scales, default weights, and readability ratings.

### Columns: ~155 → ~75 active

The three image tables (`portrait_dimensions`, `partner_dimensions`, `relationship_dimensions`) now share an identical 10-column shape:

```
id, user_id, dimension_name, grouping,
position_stated, position_revealed, flexibility,
confidence, weight, vector, evidence,
last_evidence_session, updated_at
```

### Personality params: 20 → 10 dimensions

Kept the dials that genuinely change Angelica's reply: warmth, pace, validation, precision_of_language, humour, directness, challenge_level, probing_depth, reflection_frequency, intimacy.

### CQ dimensions: 15 → 10 dimensions

Kept the signals Angelica acts on: honesty, trust, investment, momentum, frustration, return_signal, arrival_state, depth_signal, orientation, dependency_risk.

## The 100 portrait dimensions

Organised in 10 groups, ordered outside-in (visible to interior):

1. **Physical and Sexual** (8 dimensions)
2. **Mind** (7)
3. **Work and Money** (8)
4. **Social World** (10)
5. **Life Texture** (11)
6. **Family and Origin** (8)
7. **Values and Integrity** (11) — every dimension Drawn or Derived, never Stated
8. **Emotional Life** (13)
9. **Self-Awareness** (9)
10. **Relational Patterns** (15) — the matchmaking heart

### Weights are honest

Weights have been rebaked to incorporate **readability** alongside importance. A dimension that matters enormously but Angelica can't read reliably from chat has had its weight reduced — because the matching engine multiplying `weight × confidence` will get honest results.

The matching cohort (weight 7-10) is 22 dimensions, down from 29 in the importance-only version. The other 78 dimensions add coaching value, conversational reference points, and texture for the introduction — but don't dominate matching decisions.

**Top tier (weight 8-10), 8 dimensions:**
1. Desire for children (10)
2. Conversational depth (8)
3. Pace of life (8)
4. Vulnerability (8)
5. Primary emotional driver — security ↔ freedom (8)
6. Attachment style (8)
7. Resolution of past relationships (8)
8. Trust in love (8)

These are the dimensions where Angelica can both read well *and* the dimension matters a lot.

### Type distribution

- **Stated** (7 dimensions): the front door — what users will tell you immediately
- **Drawn** (63 dimensions): what Angelica elicits through scenario and story
- **Derived** (30 dimensions): what Angelica infers from accumulated portrait

Almost no dimensions are Stated — by design. The signal comes sideways.

## Per-user weights

Default weights live in `dimension_catalogue`. Per-user weights live in `portrait_dimensions.weight`. Both start at the same value; Angelica adjusts the per-user weight as evidence accumulates.

What this means: the user who weights "Money relationship" at 9 (because every story she tells involves financial tension) is genuinely different from the user who weights it at 5. The per-user weight is itself portrait data.

## Files NOT yet updated

These will need small changes to match the new schema:

- `lib/portrait.js` — the `buildPortraitContext` function reads from these tables to feed Angelica's system prompt. Reads need new column names (`position_stated` / `position_revealed` instead of `stated_position` / `revealed_position`), and references to dropped `meta_layer` and `scores` tables need removing.
- `app/api/admin/route.js` — drop references to `meta_layer` and `scores`. Trust/Depth/Readiness summaries can be computed from the latest `cq_dimensions` row.
- `app/admin/page.js` — same as above.
- `app/page.js` — the portrait panel reads `stated_position` / `revealed_position`; needs renaming.

Plus, the partner_image and relationship_image dimension catalogues still need to be designed — we built the schema for them but didn't write out their full dimension lists.

## What this gives you

A cleaner foundation: half the columns to maintain, one shape across the three images, one mental model for each table, and a matching system that's calibrated to what Angelica can actually read rather than what theoretically matters.

The 78 lower-weight dimensions can iterate freely without affecting match quality. The 22 higher-weight dimensions are the spine — those are the ones to watch.
