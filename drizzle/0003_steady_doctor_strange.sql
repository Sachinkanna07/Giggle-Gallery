CREATE TYPE "public"."account_status" AS ENUM('ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING_DELETION');--> statement-breakpoint
CREATE TYPE "public"."verification_event_status" AS ENUM('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."verification_purpose" AS ENUM('SIGN_IN', 'LINK', 'CHANGE_CONTACT', 'RECOVERY');--> statement-breakpoint
CREATE TYPE "public"."verification_type" AS ENUM('EMAIL', 'PHONE');--> statement-breakpoint
CREATE TABLE "verification_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"type" "verification_type" NOT NULL,
	"destination_hash" text NOT NULL,
	"challenge_hash" text,
	"status" "verification_event_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consumed_at" timestamp with time zone,
	"provider" text NOT NULL,
	"purpose" "verification_purpose" NOT NULL,
	CONSTRAINT "verification_events_attempts_nonnegative" CHECK ("verification_events"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_e164" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_status" "account_status" DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verification_events_user_status_idx" ON "verification_events" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "verification_events_destination_status_idx" ON "verification_events" USING btree ("destination_hash","status");--> statement-breakpoint
CREATE INDEX "verification_events_expiry_idx" ON "verification_events" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_verified_email_normalized_unique" ON "users" USING btree (lower("email")) WHERE "users"."email_verified" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_verified_phone_unique" ON "users" USING btree ("phone_e164") WHERE "users"."phone_verified_at" is not null;--> statement-breakpoint
CREATE INDEX "users_account_status_idx" ON "users" USING btree ("account_status");