ALTER TABLE "users" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "contact_email_verified_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "users_verified_contact_email_normalized_unique" ON "users" USING btree (lower("contact_email")) WHERE "users"."contact_email_verified_at" is not null;