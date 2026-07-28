ALTER TABLE "goals" DROP CONSTRAINT "goals_date_range_check";--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "status" SET DEFAULT 'active'::text;--> statement-breakpoint
UPDATE "goals" SET "status" = 'cancelled' WHERE "status" = 'paused';--> statement-breakpoint
DROP TYPE "public"."goal_status";--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."goal_status";--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "status" SET DATA TYPE "public"."goal_status" USING "status"::"public"."goal_status";--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "habit_id" uuid;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "name" varchar(200);--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "target_count" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "end_date" date;--> statement-breakpoint
UPDATE "goals" SET
  "habit_id" = (SELECT "id" FROM "habits" WHERE "habits"."user_id" = "goals"."user_id" AND "habits"."deleted_at" IS NULL ORDER BY "habits"."created_at", "habits"."id" LIMIT 1),
  "name" = "title",
  "start_date" = COALESCE("start_date", CURRENT_DATE),
  "end_date" = COALESCE("target_date", "start_date", CURRENT_DATE);--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "habit_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "target_count" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "target_count" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "start_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "end_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goals_user_id_start_date_idx" ON "goals" USING btree ("user_id","start_date");--> statement-breakpoint
CREATE INDEX "goals_habit_id_idx" ON "goals" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX "goals_date_range_idx" ON "goals" USING btree ("start_date","end_date");--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_target_count_positive_check" CHECK ("goals"."target_count" >= 1);--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_date_range_check" CHECK ("goals"."end_date" >= "goals"."start_date");
