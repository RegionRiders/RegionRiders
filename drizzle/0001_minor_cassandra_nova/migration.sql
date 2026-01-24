-- Add data validation before shrinking columns to prevent hard failures
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "users" WHERE length("strava_id") > 50) THEN
    RAISE EXCEPTION 'Cannot shrink users.strava_id: existing data exceeds 50 characters (max: 50, found: %)', length("strava_id");
  END IF;
  IF EXISTS (SELECT 1 FROM "activities" WHERE length("strava_activity_id") > 50) THEN
    RAISE EXCEPTION 'Cannot shrink activities.strava_activity_id: existing data exceeds 50 characters (max: 50, found: %)', length("strava_activity_id");
  END IF;
END $$;

ALTER TABLE "users" ALTER COLUMN "strava_id" SET DATA TYPE varchar(50);
ALTER TABLE "users" ALTER COLUMN "strava_id" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "profile_picture" SET DATA TYPE text;
ALTER TABLE "users" ALTER COLUMN "access_token" SET DATA TYPE text;
ALTER TABLE "users" ALTER COLUMN "refresh_token" SET DATA TYPE text;
ALTER TABLE "activities" ALTER COLUMN "strava_activity_id" SET DATA TYPE varchar(50);
ALTER TABLE "activities" ALTER COLUMN "map_polyline" SET DATA TYPE text;
ALTER TABLE "activities" ALTER COLUMN "map_summary_polyline" SET DATA TYPE text;
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");
CREATE INDEX "users_strava_id_idx" ON "users" USING btree ("strava_id");
CREATE INDEX "users_is_active_idx" ON "users" USING btree ("is_active");
