-- Migration: Create Meal Catalog and Weekly Diet Plan Tables
-- Date: 2025-11-12
-- Description: Creates essential tables for meal catalog system and weekly diet planner

-- ============================================================================
-- MEAL CATALOG SYSTEM
-- ============================================================================

-- Meals Table (Individual meal catalog)
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  ingredients JSONB,
  portion_size TEXT,
  calories INTEGER,
  protein DECIMAL(5,2),
  carbs DECIMAL(5,2),
  fats DECIMAL(5,2),
  fiber DECIMAL(5,2),
  prep_time INTEGER,
  cook_time INTEGER,
  instructions TEXT,
  is_vegetarian BOOLEAN DEFAULT false,
  is_vegan BOOLEAN DEFAULT false,
  is_gluten_free BOOLEAN DEFAULT false,
  is_dairy_free BOOLEAN DEFAULT false,
  image_url TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Meal Tags Table (For filtering meals)
CREATE TABLE IF NOT EXISTS meal_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  color TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Meal Tag Assignments (Many-to-Many)
CREATE TABLE IF NOT EXISTS meal_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES meal_tags(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- WEEKLY DIET PLAN SYSTEM
-- ============================================================================

-- Weekly Diet Plans Table (Reusable templates)
CREATE TABLE IF NOT EXISTS weekly_diet_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_template BOOLEAN NOT NULL DEFAULT true,
  goal TEXT,
  daily_calories INTEGER,
  protein_grams DECIMAL(5,2),
  carbs_grams DECIMAL(5,2),
  fats_grams DECIMAL(5,2),
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Weekly Plan Assignments (Many-to-Many: plans -> groups/patients)
CREATE TABLE IF NOT EXISTS weekly_plan_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES weekly_diet_plans(id) ON DELETE CASCADE,
  group_id UUID REFERENCES patient_groups(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'active',
  assignment_notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Weekly Plan Meals (Individual slots in 7x4 grid)
CREATE TABLE IF NOT EXISTS weekly_plan_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES weekly_diet_plans(id) ON DELETE CASCADE,
  meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL,
  meal_slot TEXT NOT NULL,
  slot_order INTEGER DEFAULT 1,
  custom_name TEXT,
  custom_description TEXT,
  custom_calories INTEGER,
  custom_protein DECIMAL(5,2),
  custom_carbs DECIMAL(5,2),
  custom_fats DECIMAL(5,2),
  suggested_time TEXT,
  linked_to_exercise BOOLEAN DEFAULT false,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meals_category ON meals(category);
CREATE INDEX IF NOT EXISTS idx_meal_tags_category ON meal_tags(category);
CREATE INDEX IF NOT EXISTS idx_meal_tag_assignments_meal ON meal_tag_assignments(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_tag_assignments_tag ON meal_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plan_assignments_plan ON weekly_plan_assignments(plan_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plan_assignments_group ON weekly_plan_assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plan_assignments_patient ON weekly_plan_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plan_meals_plan ON weekly_plan_meals(plan_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plan_meals_meal ON weekly_plan_meals(meal_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plan_meals_day ON weekly_plan_meals(day_of_week, meal_slot);
