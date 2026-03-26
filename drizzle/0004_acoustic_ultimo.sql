CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"settings" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_settings_user_id_idx" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
INSERT INTO "user_settings" ("user_id", "settings", "metadata", "created_at", "updated_at")
SELECT "id", "settings", "metadata", "created_at", "updated_at"
FROM "users"
WHERE "settings" IS NOT NULL OR "metadata" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "settings";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "metadata";
