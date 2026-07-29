CREATE TYPE "public"."notification_delivery_status" AS ENUM('pending', 'processing', 'delivered', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."notification_provider_name" AS ENUM('noop');--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"reminder_id" uuid NOT NULL,
	"occurrence_key" text NOT NULL,
	"scheduled_local_date" date NOT NULL,
	"scheduled_local_time" time(0) NOT NULL,
	"timezone" text NOT NULL,
	"provider" "notification_provider_name" DEFAULT 'noop' NOT NULL,
	"status" "notification_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_deliveries_attempt_count_non_negative_check" CHECK ("notification_deliveries"."attempt_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_reminder_id_reminders_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_occurrence_key_uidx" ON "notification_deliveries" USING btree ("occurrence_key");--> statement-breakpoint
CREATE INDEX "notification_deliveries_reminder_id_idx" ON "notification_deliveries" USING btree ("reminder_id");--> statement-breakpoint
CREATE INDEX "notification_deliveries_user_id_idx" ON "notification_deliveries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_deliveries_status_idx" ON "notification_deliveries" USING btree ("status");