ALTER TABLE "user_preferences" DROP CONSTRAINT "user_preferences_week_starts_on_check";--> statement-breakpoint
ALTER TABLE "user_preferences" ALTER COLUMN "date_format" SET DEFAULT 'yyyy-MM-dd';--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "time_format" varchar(8) DEFAULT '24h' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "theme" varchar(8) DEFAULT 'system' NOT NULL;--> statement-breakpoint
UPDATE "user_preferences" SET "date_format" = 'yyyy-MM-dd' WHERE "date_format" = 'YYYY-MM-DD';--> statement-breakpoint
UPDATE "user_preferences" SET "week_starts_on" = 1 WHERE "week_starts_on" NOT IN (1, 7);--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_date_format_check" CHECK ("user_preferences"."date_format" in ('dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'));--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_time_format_check" CHECK ("user_preferences"."time_format" in ('12h', '24h'));--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_theme_check" CHECK ("user_preferences"."theme" in ('system', 'light', 'dark'));--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_week_starts_on_check" CHECK ("user_preferences"."week_starts_on" in (1, 7));
