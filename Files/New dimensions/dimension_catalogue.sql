-- ============================================================
-- VERONA — Dimension Catalogue
-- Reference table: the canonical 100 portrait dimensions
-- April 2026
--
-- Single source of truth for dimension definitions. The
-- per-user portrait_dimensions table references these by name.
-- ============================================================

create table dimension_catalogue (
  dimension_name text primary key,
  display_order int not null unique,         -- 1-100, the canonical order (outside-in)
  grouping text not null,
  scale_low text not null,                   -- e.g. "guarded"
  scale_high text not null,                  -- e.g. "open"
  type text not null check (type in ('Stated', 'Drawn', 'Derived')),
  default_weight int not null check (default_weight between 1 and 10),
  readability text not null check (readability in ('LOW', 'MED', 'HIGH')),
  description text                           -- optional longer description
);

create index idx_catalogue_grouping on dimension_catalogue(grouping, display_order);
create index idx_catalogue_weight on dimension_catalogue(default_weight desc);

-- ============================================================
-- SEED DATA
-- All 100 dimensions, in canonical order
-- ============================================================

-- Group 1: Physical and Sexual
insert into dimension_catalogue (dimension_name, display_order, grouping, scale_low, scale_high, type, default_weight, readability) values
('physical_presence',                  1, 'Physical and Sexual', 'quiet/understated', 'commanding', 'Drawn', 6, 'MED'),
('sexual_drive',                       2, 'Physical and Sexual', 'low', 'high', 'Drawn', 6, 'MED'),
('sexual_openness',                    3, 'Physical and Sexual', 'conservative', 'exploratory', 'Drawn', 5, 'MED'),
('emotional_physical_connection',      4, 'Physical and Sexual', 'independent', 'intertwined', 'Derived', 6, 'LOW'),
('body_type_preference',               5, 'Physical and Sexual', 'no preference', 'very specific', 'Stated', 4, 'HIGH'),
('age_range_openness',                 6, 'Physical and Sexual', 'flexible', 'specific', 'Stated', 5, 'HIGH'),
('grooming_and_presentation',          7, 'Physical and Sexual', 'natural', 'highly maintained', 'Drawn', 3, 'LOW'),
('physical_affection_in_daily_life',   8, 'Physical and Sexual', 'low touch', 'high touch', 'Drawn', 5, 'MED');

-- Group 2: Mind
insert into dimension_catalogue (dimension_name, display_order, grouping, scale_low, scale_high, type, default_weight, readability) values
('intellectual_level',                 9, 'Mind', 'simple/concrete', 'complex/abstract', 'Drawn', 7, 'HIGH'),
('curiosity',                         10, 'Mind', 'settled', 'restlessly curious', 'Drawn', 7, 'HIGH'),
('worldview',                         11, 'Mind', 'unexamined', 'considered and held', 'Drawn', 6, 'MED'),
('conversational_depth',              12, 'Mind', 'light/surface', 'deep/sustained', 'Derived', 8, 'HIGH'),
('humour_register',                   13, 'Mind', 'dry/ironic', 'warm/silly', 'Drawn', 5, 'HIGH'),
('originality_of_thought',            14, 'Mind', 'conventional', 'surprising/lateral', 'Derived', 4, 'MED'),
('cultural_taste',                    15, 'Mind', 'consumes passively', 'curates own', 'Drawn', 3, 'MED');

-- Group 3: Work and Money
insert into dimension_catalogue (dimension_name, display_order, grouping, scale_low, scale_high, type, default_weight, readability) values
('ambition_and_drive',                16, 'Work and Money', 'content/coasting', 'driven/striving', 'Drawn', 7, 'HIGH'),
('professional_character',            17, 'Work and Money', 'transactional/political', 'respected/integral', 'Derived', 6, 'MED'),
('relationship_with_money',           18, 'Work and Money', 'anxious/scarcity', 'secure/abundance', 'Drawn', 6, 'MED'),
('work_life_balance_philosophy',      19, 'Work and Money', 'work is identity', 'work is contained', 'Drawn', 7, 'HIGH'),
('generosity_with_resources',         20, 'Work and Money', 'guarded', 'open-handed', 'Drawn', 5, 'MED'),
('career_trajectory',                 21, 'Work and Money', 'winding down', 'ascending', 'Drawn', 4, 'HIGH'),
('economic_self_sufficiency',         22, 'Work and Money', 'dependent', 'self-sustaining', 'Stated', 5, 'HIGH'),
('money_habits',                      23, 'Work and Money', 'impulsive/spends', 'careful/saves', 'Drawn', 4, 'MED');

-- Group 4: Social World
insert into dimension_catalogue (dimension_name, display_order, grouping, scale_low, scale_high, type, default_weight, readability) values
('social_energy',                     24, 'Social World', 'recharges alone', 'recharges with others', 'Drawn', 7, 'HIGH'),
('social_density',                    25, 'Social World', 'needs space in week', 'thrives on full week', 'Drawn', 6, 'HIGH'),
('friendship_pattern',                26, 'Social World', 'broad/shallow', 'few/deep', 'Drawn', 6, 'MED'),
('treatment_of_people_no_power',      27, 'Social World', 'indifferent', 'kind', 'Derived', 7, 'MED'),
('hospitality_and_home',              28, 'Social World', 'private', 'open/welcoming', 'Drawn', 5, 'MED'),
('partner_social_integration',        29, 'Social World', 'keeps separate', 'fully woven in', 'Drawn', 6, 'MED'),
('loyalty_when_tested',               30, 'Social World', 'breaks', 'holds', 'Derived', 5, 'LOW'),
('friendship_maintenance',            31, 'Social World', 'drops off', 'sustains', 'Drawn', 4, 'MED'),
('group_behaviour',                   32, 'Social World', 'edge', 'centre', 'Drawn', 3, 'LOW'),
('social_recovery_time',              33, 'Social World', 'quick to bounce back', 'needs solo recovery', 'Drawn', 4, 'MED');

-- Group 5: Life Texture
insert into dimension_catalogue (dimension_name, display_order, grouping, scale_low, scale_high, type, default_weight, readability) values
('pace_of_life',                      34, 'Life Texture', 'slow', 'relentless', 'Stated', 8, 'HIGH'),
('solitude_need',                     35, 'Life Texture', 'avoids', 'seeks', 'Drawn', 7, 'HIGH'),
('relationship_with_home',            36, 'Life Texture', 'functional', 'central/curated', 'Drawn', 6, 'MED'),
('order_and_structure',               37, 'Life Texture', 'spontaneous/loose', 'planned/ordered', 'Drawn', 5, 'MED'),
('capacity_for_boredom',              38, 'Life Texture', 'needs stimulation', 'comfortable with nothing', 'Drawn', 5, 'MED'),
('anchoring_objects',                 39, 'Life Texture', 'few/lightly held', 'many/deeply attached', 'Drawn', 3, 'LOW'),
('geography_rootedness',              40, 'Life Texture', 'rooted', 'flexible/mobile', 'Stated', 5, 'HIGH'),
('relationship_with_food',            41, 'Life Texture', 'functional', 'central/ritualised', 'Drawn', 3, 'MED'),
('sleep_architecture',                94, 'Life Texture', 'irregular', 'ritualised', 'Drawn', 3, 'HIGH'),
('travel_orientation',                95, 'Life Texture', 'rooted/homebody', 'travel-driven', 'Drawn', 4, 'HIGH'),
('pet_animal_orientation',           100, 'Life Texture', 'indifferent', 'central to life', 'Stated', 3, 'HIGH');

-- Group 6: Family and Origin
insert into dimension_catalogue (dimension_name, display_order, grouping, scale_low, scale_high, type, default_weight, readability) values
('desire_for_children',               42, 'Family and Origin', 'none', 'strong', 'Stated', 10, 'HIGH'),
('relationship_with_parents',         43, 'Family and Origin', 'damaged', 'peaceful', 'Drawn', 6, 'MED'),
('awareness_of_parental_influence',   44, 'Family and Origin', 'blind', 'clear-eyed', 'Derived', 6, 'MED'),
('inherited_model_alignment',         45, 'Family and Origin', 'unconscious repetition', 'conscious departure', 'Derived', 6, 'LOW'),
('position_in_family_of_origin',      46, 'Family and Origin', 'peripheral', 'central', 'Drawn', 4, 'MED'),
('family_obligation_pull',            47, 'Family and Origin', 'independent', 'bound', 'Drawn', 5, 'MED'),
('cultural_weight_of_family',         48, 'Family and Origin', 'light', 'heavy', 'Drawn', 4, 'MED'),
('parenting_style',                   49, 'Family and Origin', 'permissive', 'structured', 'Drawn', 3, 'MED');

-- Group 7: Values and Integrity
insert into dimension_catalogue (dimension_name, display_order, grouping, scale_low, scale_high, type, default_weight, readability) values
('integrity',                         50, 'Values and Integrity', 'convenient', 'costly', 'Derived', 6, 'LOW'),
('integrity_gap',                     51, 'Values and Integrity', 'large gap public/private', 'no gap', 'Derived', 6, 'LOW'),
('honesty_under_pressure',            52, 'Values and Integrity', 'strategic', 'default', 'Derived', 5, 'LOW'),
('tolerance_of_difference',           53, 'Values and Integrity', 'rigid', 'open', 'Drawn', 7, 'MED'),
('need_to_be_right',                  54, 'Values and Integrity', 'high', 'low', 'Drawn', 6, 'MED'),
('cost_of_saying_no',                 55, 'Values and Integrity', 'easy to disappoint', 'hard to disappoint', 'Drawn', 6, 'MED'),
('admiration_vs_envy',                56, 'Values and Integrity', 'threatened', 'celebratory', 'Derived', 6, 'LOW'),
('relationship_with_status',          57, 'Values and Integrity', 'attached', 'indifferent', 'Derived', 4, 'MED'),
('moral_flexibility',                 58, 'Values and Integrity', 'rigid', 'situational', 'Derived', 4, 'LOW'),
('meaning_making_orientation',        59, 'Values and Integrity', 'secular', 'spiritual', 'Drawn', 4, 'MED'),
('sense_of_duty',                     91, 'Values and Integrity', 'low/optional', 'high/structuring', 'Drawn', 5, 'MED');

-- Group 8: Emotional Life
insert into dimension_catalogue (dimension_name, display_order, grouping, scale_low, scale_high, type, default_weight, readability) values
('vulnerability',                     60, 'Emotional Life', 'guarded', 'open', 'Drawn', 8, 'MED'),
('conflict_style',                    61, 'Emotional Life', 'avoids/withdraws', 'engages/repairs', 'Drawn', 7, 'MED'),
('emotional_regulation',              62, 'Emotional Life', 'reactive/spirals', 'steady/stabilises', 'Drawn', 6, 'MED'),
('capacity_to_receive_love',          63, 'Emotional Life', 'deflects', 'accepts', 'Derived', 7, 'MED'),
('emotional_generosity',              64, 'Emotional Life', 'self-referencing', 'other-feeling', 'Drawn', 6, 'MED'),
('primary_emotional_driver',          65, 'Emotional Life', 'security', 'freedom', 'Derived', 8, 'MED'),
('emotional_vocabulary',              66, 'Emotional Life', 'limited', 'precise', 'Drawn', 5, 'HIGH'),
('mood_stability',                    67, 'Emotional Life', 'volatile', 'even', 'Drawn', 5, 'MED'),
('emotional_carrying_capacity',       68, 'Emotional Life', 'low', 'high', 'Derived', 5, 'LOW'),
('comfort_with_others_emotions',      69, 'Emotional Life', 'overwhelmed', 'holds space', 'Drawn', 6, 'MED'),
('capacity_for_play',                 92, 'Emotional Life', 'serious throughout', 'easily playful', 'Drawn', 5, 'HIGH'),
('capacity_for_delight',              93, 'Emotional Life', 'flat/jaded', 'readily delighted', 'Derived', 5, 'HIGH'),
('sentimentality',                    99, 'Emotional Life', 'unsentimental', 'richly sentimental', 'Drawn', 4, 'MED');

-- Group 9: Self-Awareness
insert into dimension_catalogue (dimension_name, display_order, grouping, scale_low, scale_high, type, default_weight, readability) values
('emotional_self_awareness',          70, 'Self-Awareness', 'blind', 'clear-eyed', 'Derived', 7, 'MED'),
('growth_orientation',                71, 'Self-Awareness', 'settled', 'actively evolving', 'Drawn', 7, 'HIGH'),
('receptivity_to_feedback',           72, 'Self-Awareness', 'closes down', 'opens up', 'Drawn', 6, 'MED'),
('capacity_for_self_criticism',       73, 'Self-Awareness', 'defensive', 'accountable', 'Derived', 6, 'MED'),
('relationship_with_own_ageing',      74, 'Self-Awareness', 'denial/anxious', 'at peace/curious', 'Derived', 5, 'MED'),
('reflective_practice',               75, 'Self-Awareness', 'unexamined', 'regularly self-examines', 'Drawn', 5, 'HIGH'),
('risk_tolerance',                    96, 'Self-Awareness', 'risk-averse', 'risk-seeking', 'Derived', 4, 'MED'),
('comfort_with_own_success',          97, 'Self-Awareness', 'impostor', 'owns it', 'Derived', 5, 'MED'),
('attitude_to_inner_work',            98, 'Self-Awareness', 'dismissive', 'embracing', 'Drawn', 5, 'HIGH');

-- Group 10: Relational Patterns
insert into dimension_catalogue (dimension_name, display_order, grouping, scale_low, scale_high, type, default_weight, readability) values
('attachment_style',                  76, 'Relational Patterns', 'avoidant', 'anxious', 'Derived', 8, 'MED'),
('pattern_of_interest_over_time',     77, 'Relational Patterns', 'fades', 'deepens', 'Derived', 6, 'LOW'),
('capacity_for_sustained_intimacy',   78, 'Relational Patterns', 'tires of closeness', 'deepens over time', 'Derived', 6, 'LOW'),
('resolution_of_past_relationships',  79, 'Relational Patterns', 'raw', 'integrated', 'Drawn', 8, 'HIGH'),
('ownership_of_their_part',           80, 'Relational Patterns', 'externalises', 'takes responsibility', 'Drawn', 7, 'HIGH'),
('how_they_end_relationships',        81, 'Relational Patterns', 'careless', 'considered', 'Drawn', 7, 'MED'),
('trust_in_love',                     82, 'Relational Patterns', 'guarded', 'open', 'Derived', 8, 'MED'),
('repair_after_rupture',              83, 'Relational Patterns', 'holds grudge', 'moves on quickly', 'Derived', 6, 'MED'),
('speed_of_romantic_attachment',      84, 'Relational Patterns', 'slow', 'fast', 'Drawn', 5, 'MED'),
('how_they_choose_partners',          85, 'Relational Patterns', 'excitement-driven', 'safety-driven', 'Derived', 6, 'MED'),
('need_for_reassurance',              86, 'Relational Patterns', 'constant', 'self-assured', 'Drawn', 5, 'MED'),
('attachment_when_partner_withdraws', 87, 'Relational Patterns', 'passive', 'pursuing', 'Drawn', 5, 'MED'),
('attachment_when_partner_approaches',88, 'Relational Patterns', 'welcoming', 'retreating', 'Drawn', 5, 'MED'),
('capacity_for_being_alone',          89, 'Relational Patterns', 'lonely', 'content', 'Derived', 6, 'MED'),
('romantic_idealism',                 90, 'Relational Patterns', 'cynical', 'idealist', 'Drawn', 3, 'MED');

-- ============================================================
-- VERIFY: should be 100 rows
-- select count(*) from dimension_catalogue;
-- ============================================================
