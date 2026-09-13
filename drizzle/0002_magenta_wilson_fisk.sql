CREATE TYPE "public"."artwork_upload_status" AS ENUM('AUTHORIZED', 'UPLOADED', 'ATTACHED', 'ABANDONED');--> statement-breakpoint
CREATE TYPE "public"."webhook_event_status" AS ENUM('PROCESSING', 'PROCESSED', 'FAILED');--> statement-breakpoint
CREATE TABLE "artwork_uploads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"artwork_id" uuid,
	"pathname" text NOT NULL,
	"url" text,
	"content_type" text,
	"size_bytes" bigint,
	"status" "artwork_upload_status" DEFAULT 'AUTHORIZED' NOT NULL,
	"completed_at" timestamp with time zone,
	"attached_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" text DEFAULT 'RAZORPAY' NOT NULL,
	"provider_order_id" text NOT NULL,
	"provider_payment_id" text,
	"idempotency_key" text NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"amount_paise" bigint NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"failure_code" text,
	"failure_reason" text,
	"verified_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_attempts_amount_positive" CHECK ("payment_attempts"."amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"signature_hash" text NOT NULL,
	"body_hash" text NOT NULL,
	"event_type" text NOT NULL,
	"status" "webhook_event_status" DEFAULT 'PROCESSING' NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processing_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"failure_reason" text
);
--> statement-breakpoint
ALTER TABLE "artwork_uploads" ADD CONSTRAINT "artwork_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artwork_uploads" ADD CONSTRAINT "artwork_uploads_artwork_id_artworks_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."artworks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "artwork_uploads_url_unique" ON "artwork_uploads" USING btree ("url");--> statement-breakpoint
CREATE UNIQUE INDEX "artwork_uploads_artwork_unique" ON "artwork_uploads" USING btree ("artwork_id");--> statement-breakpoint
CREATE INDEX "artwork_uploads_user_status_idx" ON "artwork_uploads" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_provider_order_unique" ON "payment_attempts" USING btree ("provider","provider_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_provider_payment_unique" ON "payment_attempts" USING btree ("provider","provider_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_idempotency_unique" ON "payment_attempts" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "payment_attempts_order_created_idx" ON "payment_attempts" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_provider_event_unique" ON "webhook_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "webhook_events_status_received_idx" ON "webhook_events" USING btree ("status","received_at");--> statement-breakpoint
CREATE INDEX "webhook_events_signature_hash_idx" ON "webhook_events" USING btree ("signature_hash");