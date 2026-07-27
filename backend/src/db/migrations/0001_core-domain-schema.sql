CREATE TYPE "public"."goal_status" AS ENUM('active', 'completed', 'paused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."habit_frequency_type" AS ENUM('daily', 'weekly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(32),
	"icon" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "goal_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goal_steps_position_non_negative_check" CHECK ("goal_steps"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"category_id" uuid,
	"title" varchar(200) NOT NULL,
	"description" text,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"start_date" date,
	"target_date" date,
	"completed_at" timestamp with time zone,
	"cover_image_url" varchar(2048),
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "goals_position_non_negative_check" CHECK ("goals"."position" >= 0),
	CONSTRAINT "goals_date_range_check" CHECK ("goals"."start_date" is null or "goals"."target_date" is null or "goals"."target_date" >= "goals"."start_date")
);
--> statement-breakpoint
CREATE TABLE "habit_check_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"check_in_date" date NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "habit_check_ins_completed_count_non_negative_check" CHECK ("habit_check_ins"."completed_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "habit_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"habit_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "habit_schedules_day_of_week_check" CHECK ("habit_schedules"."day_of_week" between 1 and 7)
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"category_id" uuid,
	"name" varchar(160) NOT NULL,
	"description" text,
	"frequency_type" "habit_frequency_type" NOT NULL,
	"target_count" integer DEFAULT 1 NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "habits_target_count_positive_check" CHECK ("habits"."target_count" > 0),
	CONSTRAINT "habits_position_non_negative_check" CHECK ("habits"."position" >= 0),
	CONSTRAINT "habits_date_range_check" CHECK ("habits"."end_date" is null or "habits"."end_date" >= "habits"."start_date")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"category_id" uuid,
	"title" varchar(200) NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tasks_position_non_negative_check" CHECK ("tasks"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"timezone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"week_starts_on" integer DEFAULT 1 NOT NULL,
	"date_format" varchar(32) DEFAULT 'YYYY-MM-DD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_week_starts_on_check" CHECK ("user_preferences"."week_starts_on" between 1 and 7)
);
--> statement-breakpoint
ALTER TABLE "goal_steps" ADD CONSTRAINT "goal_steps_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_check_ins" ADD CONSTRAINT "habit_check_ins_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_schedules" ADD CONSTRAINT "habit_schedules_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_id_name_active_uidx" ON "categories" USING btree ("user_id","name") WHERE "categories"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "goal_steps_goal_id_position_idx" ON "goal_steps" USING btree ("goal_id","position");--> statement-breakpoint
CREATE INDEX "goals_user_id_status_idx" ON "goals" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "goals_target_date_idx" ON "goals" USING btree ("target_date");--> statement-breakpoint
CREATE INDEX "goals_category_id_idx" ON "goals" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "habit_check_ins_habit_id_check_in_date_uidx" ON "habit_check_ins" USING btree ("habit_id","check_in_date");--> statement-breakpoint
CREATE INDEX "habit_check_ins_user_id_check_in_date_idx" ON "habit_check_ins" USING btree ("user_id","check_in_date");--> statement-breakpoint
CREATE INDEX "habit_check_ins_habit_id_check_in_date_idx" ON "habit_check_ins" USING btree ("habit_id","check_in_date");--> statement-breakpoint
CREATE UNIQUE INDEX "habit_schedules_habit_id_day_of_week_uidx" ON "habit_schedules" USING btree ("habit_id","day_of_week");--> statement-breakpoint
CREATE INDEX "habit_schedules_habit_id_idx" ON "habit_schedules" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX "habits_user_id_active_idx" ON "habits" USING btree ("user_id","is_active") WHERE "habits"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "habits_category_id_idx" ON "habits" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "tasks_user_id_status_idx" ON "tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "tasks_user_id_due_at_idx" ON "tasks" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "tasks_category_id_idx" ON "tasks" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_preferences_user_id_uidx" ON "user_preferences" USING btree ("user_id");