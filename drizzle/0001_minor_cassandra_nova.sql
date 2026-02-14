ALTER TABLE "users" ALTER COLUMN "strava_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "strava_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "profile_picture" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "access_token" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "refresh_token" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "strava_activity_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "map_polyline" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "map_summary_polyline" SET DATA TYPE text;--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_strava_id_idx" ON "users" USING btree ("strava_id");--> statement-breakpoint
CREATE INDEX "users_is_active_idx" ON "users" USING btree ("is_active");