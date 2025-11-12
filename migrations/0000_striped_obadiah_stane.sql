CREATE TABLE "diet_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"diet_id" uuid NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diet_exercise_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"duration_minutes" integer,
	"exercise_type" text NOT NULL,
	"description" text,
	"intensity" text,
	"pre_workout_meal" text,
	"post_workout_meal" text,
	"hydration_notes" text,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diet_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"template_id" uuid,
	"goal" text NOT NULL,
	"duration_weeks" integer DEFAULT 4 NOT NULL,
	"preferences" text,
	"input_context" jsonb,
	"prompt_hash" text,
	"ai_model" text NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"generation_time_ms" integer,
	"raw_response" text,
	"weekly_plan" jsonb,
	"validation_errors" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"reviewer_notes" text,
	"reviewed_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diet_meal_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"meal_type" text NOT NULL,
	"meal_order" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"ingredients" jsonb,
	"calories" integer,
	"protein" numeric(5, 2),
	"carbs" numeric(5, 2),
	"fats" numeric(5, 2),
	"suggested_time" text,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diet_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"objective" text,
	"content" text,
	"target_calories" integer,
	"macros" jsonb,
	"meal_structure" jsonb,
	"sample_meals" jsonb,
	"restrictions" jsonb,
	"tags" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"success_rate" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"calories" integer NOT NULL,
	"protein" integer NOT NULL,
	"carbs" integer NOT NULL,
	"fats" integer NOT NULL,
	"tags" text[],
	"meal_plan" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_tag_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"color" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"ingredients" jsonb,
	"portion_size" text,
	"calories" integer,
	"protein" numeric(5, 2),
	"carbs" numeric(5, 2),
	"fats" numeric(5, 2),
	"fiber" numeric(5, 2),
	"prep_time" integer,
	"cook_time" integer,
	"instructions" text,
	"is_vegetarian" boolean DEFAULT false,
	"is_vegan" boolean DEFAULT false,
	"is_gluten_free" boolean DEFAULT false,
	"is_dairy_free" boolean DEFAULT false,
	"image_url" text,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "measurement_calculations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"measurement_id" uuid NOT NULL,
	"bmi" numeric(5, 2),
	"skin_mass_kg" numeric(6, 3),
	"skin_mass_percent" numeric(5, 2),
	"adipose_mass_kg" numeric(6, 3),
	"adipose_mass_percent" numeric(5, 2),
	"muscle_mass_kg" numeric(6, 3),
	"muscle_mass_percent" numeric(5, 2),
	"bone_mass_kg" numeric(6, 3),
	"bone_mass_percent" numeric(5, 2),
	"residual_mass_kg" numeric(6, 3),
	"residual_mass_percent" numeric(5, 2),
	"sum_of_4_skinfolds" numeric(6, 2),
	"sum_of_6_skinfolds" numeric(6, 2),
	"body_fat_percentage" numeric(5, 2),
	"lean_mass" numeric(6, 2),
	"waist_hip_ratio" numeric(5, 3),
	"endomorphy" numeric(4, 2),
	"mesomorphy" numeric(4, 2),
	"ectomorphy" numeric(4, 2),
	"weight_z_score" numeric(5, 2),
	"height_z_score" numeric(5, 2),
	"bmi_z_score" numeric(5, 2),
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"measurement_date" timestamp NOT NULL,
	"weight" numeric(5, 2),
	"height" numeric(5, 2),
	"seated_height" numeric(5, 2),
	"biacromial" numeric(5, 2),
	"thorax_transverse" numeric(5, 2),
	"thorax_anteroposterior" numeric(5, 2),
	"biiliocristideo" numeric(5, 2),
	"humeral" numeric(5, 2),
	"femoral" numeric(5, 2),
	"head" numeric(5, 2),
	"relaxed_arm" numeric(5, 2),
	"flexed_arm" numeric(5, 2),
	"forearm" numeric(5, 2),
	"thorax_circ" numeric(5, 2),
	"waist" numeric(5, 2),
	"hip" numeric(5, 2),
	"thigh_superior" numeric(5, 2),
	"thigh_medial" numeric(5, 2),
	"calf" numeric(5, 2),
	"triceps" numeric(5, 2),
	"biceps" numeric(5, 2),
	"subscapular" numeric(5, 2),
	"suprailiac" numeric(5, 2),
	"supraspinal" numeric(5, 2),
	"abdominal" numeric(5, 2),
	"thigh_skinfold" numeric(5, 2),
	"calf_skinfold" numeric(5, 2),
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"birth_date" timestamp,
	"gender" text,
	"objective" text,
	"notes" text,
	"avatar_url" text,
	"exercises_regularly" boolean DEFAULT false,
	"sport_type" text,
	"exercise_days" text,
	"exercise_schedule" text,
	"is_vegetarian" boolean DEFAULT false,
	"is_vegan" boolean DEFAULT false,
	"food_allergies" text,
	"food_dislikes" text,
	"medical_conditions" text,
	"medications" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"measurement_id" uuid NOT NULL,
	"pdf_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_via" text[],
	"sent_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_diet_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_template" boolean DEFAULT true NOT NULL,
	"goal" text,
	"daily_calories" integer,
	"protein_grams" numeric(5, 2),
	"carbs_grams" numeric(5, 2),
	"fats_grams" numeric(5, 2),
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_plan_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"group_id" uuid,
	"patient_id" uuid,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"assignment_notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_plan_meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"meal_id" uuid,
	"day_of_week" integer NOT NULL,
	"meal_slot" text NOT NULL,
	"slot_order" integer DEFAULT 1,
	"custom_name" text,
	"custom_description" text,
	"custom_calories" integer,
	"custom_protein" numeric(5, 2),
	"custom_carbs" numeric(5, 2),
	"custom_fats" numeric(5, 2),
	"suggested_time" text,
	"linked_to_exercise" boolean DEFAULT false,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diet_assignments" ADD CONSTRAINT "diet_assignments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_assignments" ADD CONSTRAINT "diet_assignments_diet_id_diets_id_fk" FOREIGN KEY ("diet_id") REFERENCES "public"."diets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_exercise_blocks" ADD CONSTRAINT "diet_exercise_blocks_generation_id_diet_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."diet_generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_generations" ADD CONSTRAINT "diet_generations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_generations" ADD CONSTRAINT "diet_generations_template_id_diet_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."diet_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_meal_plans" ADD CONSTRAINT "diet_meal_plans_generation_id_diet_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."diet_generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_patient_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."patient_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_tag_assignments" ADD CONSTRAINT "meal_tag_assignments_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_tag_assignments" ADD CONSTRAINT "meal_tag_assignments_tag_id_meal_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."meal_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_calculations" ADD CONSTRAINT "measurement_calculations_measurement_id_measurements_id_fk" FOREIGN KEY ("measurement_id") REFERENCES "public"."measurements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_measurement_id_measurements_id_fk" FOREIGN KEY ("measurement_id") REFERENCES "public"."measurements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_plan_assignments" ADD CONSTRAINT "weekly_plan_assignments_plan_id_weekly_diet_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."weekly_diet_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_plan_assignments" ADD CONSTRAINT "weekly_plan_assignments_group_id_patient_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."patient_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_plan_assignments" ADD CONSTRAINT "weekly_plan_assignments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_plan_meals" ADD CONSTRAINT "weekly_plan_meals_plan_id_weekly_diet_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."weekly_diet_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_plan_meals" ADD CONSTRAINT "weekly_plan_meals_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE set null ON UPDATE no action;