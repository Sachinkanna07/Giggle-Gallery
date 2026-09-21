CREATE TYPE "public"."auction_payment_status" AS ENUM('PENDING', 'PAID', 'EXPIRED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."auction_status" AS ENUM('DRAFT', 'SCHEDULED', 'LIVE', 'CANCELLED', 'PAYMENT_PENDING', 'PAYMENT_EXPIRED', 'SOLD', 'UNSOLD');--> statement-breakpoint
CREATE TABLE "auction_bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"bidder_id" text NOT NULL,
	"amount_paise" bigint NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auction_bids_amount_positive" CHECK ("auction_bids"."amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "auction_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"actor_id" text,
	"type" text NOT NULL,
	"reason" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auction_payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"winner_id" text NOT NULL,
	"winning_bid_paise" bigint NOT NULL,
	"amount_paise" bigint,
	"order_id" uuid,
	"status" "auction_payment_status" DEFAULT 'PENDING' NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auction_payment_winning_bid_positive" CHECK ("auction_payment_attempts"."winning_bid_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "auctions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artwork_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"status" "auction_status" DEFAULT 'DRAFT' NOT NULL,
	"opening_bid_paise" bigint NOT NULL,
	"minimum_increment_paise" bigint NOT NULL,
	"current_bid_paise" bigint,
	"winning_bid_paise" bigint,
	"winner_id" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"payment_deadline_at" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auctions_opening_bid_positive" CHECK ("auctions"."opening_bid_paise" > 0),
	CONSTRAINT "auctions_increment_positive" CHECK ("auctions"."minimum_increment_paise" > 0),
	CONSTRAINT "auctions_time_valid" CHECK ("auctions"."ends_at" > "auctions"."starts_at")
);
--> statement-breakpoint
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_bidder_id_users_id_fk" FOREIGN KEY ("bidder_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_events" ADD CONSTRAINT "auction_events_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_events" ADD CONSTRAINT "auction_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_payment_attempts" ADD CONSTRAINT "auction_payment_attempts_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_payment_attempts" ADD CONSTRAINT "auction_payment_attempts_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_payment_attempts" ADD CONSTRAINT "auction_payment_attempts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_artwork_id_artworks_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."artworks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_seller_id_artist_profiles_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."artist_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auction_bids_idempotency_unique" ON "auction_bids" USING btree ("auction_id","bidder_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "auction_bids_auction_amount_idx" ON "auction_bids" USING btree ("auction_id","amount_paise","created_at");--> statement-breakpoint
CREATE INDEX "auction_events_auction_created_idx" ON "auction_events" USING btree ("auction_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auction_payment_attempts_auction_unique" ON "auction_payment_attempts" USING btree ("auction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auction_payment_attempts_order_unique" ON "auction_payment_attempts" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "auction_payment_attempts_winner_deadline_idx" ON "auction_payment_attempts" USING btree ("winner_id","deadline_at");--> statement-breakpoint
CREATE INDEX "auctions_artwork_status_idx" ON "auctions" USING btree ("artwork_id","status");--> statement-breakpoint
CREATE INDEX "auctions_seller_created_idx" ON "auctions" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX "auctions_deadline_idx" ON "auctions" USING btree ("status","payment_deadline_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auctions_one_active_artwork_unique" ON "auctions" USING btree ("artwork_id") WHERE "auctions"."status" in ('SCHEDULED', 'LIVE', 'PAYMENT_PENDING');