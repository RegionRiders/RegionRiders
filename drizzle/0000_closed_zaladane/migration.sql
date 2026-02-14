CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strava_id" varchar(255) NOT NULL,
	"email" varchar(255),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"profile_picture" varchar(500),
	"access_token" varchar(255),
	"refresh_token" varchar(255),
	"token_expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_strava_id_unique" UNIQUE("strava_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"strava_activity_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"start_date" timestamp NOT NULL,
	"description" varchar(1000),
	"sport_type" varchar(50),
	"timezone" varchar(100),
	"distance" real,
	"moving_time" integer,
	"elapsed_time" integer,
	"total_elevation_gain" real,
	"average_speed" real,
	"elev_high" real,
	"elev_low" real,
	"max_speed" real,
	"average_cadence" real,
	"average_heartrate" real,
	"max_heartrate" real,
	"calories" real,
	"start_latlng" jsonb,
	"end_latlng" jsonb,
	"location_city" varchar(100),
	"location_state" varchar(100),
	"location_country" varchar(100),
	"is_manual" boolean DEFAULT false NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"map_polyline" varchar(10000),
	"map_summary_polyline" varchar(2000),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "activities_strava_activity_id_unique" UNIQUE("strava_activity_id")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_user_id_idx" ON "activities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activities_strava_activity_id_idx" ON "activities" USING btree ("strava_activity_id");--> statement-breakpoint
CREATE INDEX "activities_start_date_idx" ON "activities" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "activities_type_idx" ON "activities" USING btree ("type");