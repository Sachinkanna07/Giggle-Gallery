import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const userRole = pgEnum("user_role", ["BUYER", "SELLER", "ADMIN"]);
export const applicationStatus = pgEnum("application_status", ["PENDING", "APPROVED", "REJECTED", "NEEDS_REVIEW"]);
export const artworkStatus = pgEnum("artwork_status", ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "SOLD", "ARCHIVED", "REJECTED"]);
export const artworkType = pgEnum("artwork_type", ["DIGITAL", "PHYSICAL"]);
export const availabilityStatus = pgEnum("availability_status", ["AVAILABLE", "RESERVED", "SOLD_OUT"]);
export const orderStatus = pgEnum("order_status", ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]);
export const paymentStatus = pgEnum("payment_status", ["CREATED", "PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"]);
export const auctionStatus = pgEnum("auction_status", ["DRAFT", "SCHEDULED", "LIVE", "CANCELLED", "PAYMENT_PENDING", "PAYMENT_EXPIRED", "SOLD", "UNSOLD"]);
export const auctionPaymentStatus = pgEnum("auction_payment_status", ["PENDING", "PAID", "EXPIRED", "FAILED", "CANCELLED"]);
export const payoutStatus = pgEnum("payout_status", ["PENDING", "PROCESSING", "PAID", "FAILED", "ON_HOLD"]);
export const webhookEventStatus = pgEnum("webhook_event_status", ["PROCESSING", "PROCESSED", "FAILED"]);
export const artworkUploadStatus = pgEnum("artwork_upload_status", ["AUTHORIZED", "UPLOADED", "ATTACHED", "ABANDONED"]);
export const accountStatus = pgEnum("account_status", ["ACTIVE", "SUSPENDED", "DISABLED", "PENDING_DELETION"]);
export const verificationType = pgEnum("verification_type", ["EMAIL", "PHONE"]);
export const verificationEventStatus = pgEnum("verification_event_status", ["PENDING", "VERIFIED", "EXPIRED", "FAILED", "CANCELLED"]);
export const verificationPurpose = pgEnum("verification_purpose", ["SIGN_IN", "LINK", "CHANGE_CONTACT", "RECOVERY"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  contactEmail: text("contact_email"),
  contactEmailVerifiedAt: timestamp("contact_email_verified_at", { withTimezone: true }),
  image: text("image"),
  phoneE164: text("phone_e164"),
  phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
  role: userRole("role").default("BUYER").notNull(),
  accountStatus: accountStatus("account_status").default("ACTIVE").notNull(),
  disabled: boolean("disabled").default(false).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("users_email_unique").on(table.email),
  uniqueIndex("users_verified_email_normalized_unique").on(sql`lower(${table.email})`).where(sql`${table.emailVerified} is not null`),
  uniqueIndex("users_verified_contact_email_normalized_unique").on(sql`lower(${table.contactEmail})`).where(sql`${table.contactEmailVerifiedAt} is not null`),
  uniqueIndex("users_verified_phone_unique").on(table.phoneE164).where(sql`${table.phoneVerifiedAt} is not null`),
  index("users_account_status_idx").on(table.accountStatus),
]);

export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<"oauth" | "oidc" | "email">().notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (table) => [
  primaryKey({ columns: [table.provider, table.providerAccountId] }),
  index("accounts_user_id_idx").on(table.userId),
]);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
}, (table) => [index("sessions_user_id_idx").on(table.userId)]);

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
}, (table) => [primaryKey({ columns: [table.identifier, table.token] })]);

export const verificationEvents = pgTable("verification_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Nullable for a future pre-account SIGN_IN challenge; linked-account
  // verification always supplies the authenticated user id.
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  type: verificationType("type").notNull(),
  destinationHash: text("destination_hash").notNull(),
  challengeHash: text("challenge_hash"),
  status: verificationEventStatus("status").default("PENDING").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  provider: text("provider").notNull(),
  purpose: verificationPurpose("purpose").notNull(),
}, (table) => [
  index("verification_events_user_status_idx").on(table.userId, table.status, table.createdAt),
  index("verification_events_destination_status_idx").on(table.destinationHash, table.status),
  index("verification_events_expiry_idx").on(table.expiresAt),
  check("verification_events_attempts_nonnegative", sql`${table.attempts} >= 0`),
]);

export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  phone: text("phone"),
  country: text("country"),
  state: text("state"),
  city: text("city"),
  bio: text("bio"),
  preferredCurrency: text("preferred_currency").default("INR").notNull(),
  preferences: jsonb("preferences").$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps,
});

export const artistProfiles = pgTable("artist_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  displayName: text("display_name").notNull(),
  profileImageUrl: text("profile_image_url"),
  biography: text("biography").notNull(),
  artistStatement: text("artist_statement"),
  location: text("location"),
  styles: text("styles").array().default([]).notNull(),
  specialization: text("specialization"),
  experienceYears: integer("experience_years"),
  portfolioUrl: text("portfolio_url"),
  socialUrl: text("social_url"),
  preferredCurrency: text("preferred_currency").default("INR").notNull(),
  sellerType: text("seller_type").default("INDIVIDUAL").notNull(),
  verified: boolean("verified").default(false).notNull(),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("0").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("artist_profiles_user_unique").on(table.userId),
  uniqueIndex("artist_profiles_slug_unique").on(table.slug),
]);

export const artistApplications = pgTable("artist_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  country: text("country").notNull(),
  state: text("state").notNull(),
  city: text("city").notNull(),
  profileImageUrl: text("profile_image_url"),
  biography: text("biography").notNull(),
  artistStatement: text("artist_statement").notNull(),
  artStyle: text("art_style").notNull(),
  specialization: text("specialization").notNull(),
  experienceYears: integer("experience_years").default(0).notNull(),
  portfolioUrl: text("portfolio_url"),
  socialUrl: text("social_url"),
  preferredCurrency: text("preferred_currency").default("INR").notNull(),
  sellerType: text("seller_type").notNull(),
  identityStatus: text("identity_status").default("NOT_REQUESTED").notNull(),
  payoutReference: text("payout_reference"),
  status: applicationStatus("status").default("PENDING").notNull(),
  reviewNotes: text("review_notes"),
  reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("artist_applications_user_active_unique").on(table.userId),
  index("artist_applications_status_created_idx").on(table.status, table.createdAt),
  index("artist_applications_reviewer_idx").on(table.reviewedBy),
]);

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("categories_slug_unique").on(table.slug)]);

export const styles = pgTable("styles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
}, (table) => [uniqueIndex("styles_slug_unique").on(table.slug)]);

export const moods = pgTable("moods", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
}, (table) => [uniqueIndex("moods_slug_unique").on(table.slug)]);

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
}, (table) => [uniqueIndex("tags_slug_unique").on(table.slug)]);

export const artworks = pgTable("artworks", {
  id: uuid("id").defaultRandom().primaryKey(),
  artistId: uuid("artist_id").notNull().references(() => artistProfiles.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  styleId: uuid("style_id").references(() => styles.id, { onDelete: "set null" }),
  moodId: uuid("mood_id").references(() => moods.id, { onDelete: "set null" }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  artistStatement: text("artist_statement"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("INR").notNull(),
  medium: text("medium").notNull(),
  year: integer("year").notNull(),
  widthCm: numeric("width_cm", { precision: 8, scale: 2 }),
  heightCm: numeric("height_cm", { precision: 8, scale: 2 }),
  depthCm: numeric("depth_cm", { precision: 8, scale: 2 }),
  ownershipDeclaration: text("ownership_declaration").notNull(),
  licenseTerms: text("license_terms"),
  type: artworkType("type").notNull(),
  availability: availabilityStatus("availability").default("AVAILABLE").notNull(),
  stock: integer("stock").default(1).notNull(),
  shippingProfile: jsonb("shipping_profile").$type<{ domesticPaise?: number; internationalPaise?: number; shipsFrom?: string }>().default({}).notNull(),
  colors: text("colors").array().default([]).notNull(),
  status: artworkStatus("status").default("DRAFT").notNull(),
  featured: boolean("featured").default(false).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("artworks_slug_unique").on(table.slug),
  index("artworks_artist_status_idx").on(table.artistId, table.status),
  index("artworks_category_idx").on(table.categoryId),
  index("artworks_style_idx").on(table.styleId),
  index("artworks_mood_idx").on(table.moodId),
  index("artworks_status_published_idx").on(table.status, table.publishedAt),
  index("artworks_price_idx").on(table.price),
  check("artworks_price_positive", sql`${table.price} > 0`),
  check("artworks_stock_nonnegative", sql`${table.stock} >= 0`),
  check("artworks_year_valid", sql`${table.year} between 1000 and 2200`),
]);

export const artworkImages = pgTable("artwork_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  artworkId: uuid("artwork_id").notNull().references(() => artworks.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  altText: text("alt_text").notNull(),
  width: integer("width"),
  height: integer("height"),
  sortOrder: integer("sort_order").default(0).notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("artwork_images_artwork_order_unique").on(table.artworkId, table.sortOrder)]);

export const artworkUploads = pgTable("artwork_uploads", {
  id: uuid("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  artworkId: uuid("artwork_id").references(() => artworks.id, { onDelete: "set null" }),
  pathname: text("pathname").notNull(),
  url: text("url"),
  contentType: text("content_type"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  status: artworkUploadStatus("status").default("AUTHORIZED").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  attachedAt: timestamp("attached_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("artwork_uploads_url_unique").on(table.url),
  uniqueIndex("artwork_uploads_artwork_unique").on(table.artworkId),
  index("artwork_uploads_user_status_idx").on(table.userId, table.status, table.createdAt),
]);

export const artworkTags = pgTable("artwork_tags", {
  artworkId: uuid("artwork_id").notNull().references(() => artworks.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.artworkId, table.tagId] }),
  index("artwork_tags_tag_idx").on(table.tagId),
]);

export const likes = pgTable("likes", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  artworkId: uuid("artwork_id").notNull().references(() => artworks.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.artworkId] }), index("likes_artwork_idx").on(table.artworkId)]);

export const savedArtworks = pgTable("saved_artworks", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  artworkId: uuid("artwork_id").notNull().references(() => artworks.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.artworkId] }), index("saved_artworks_artwork_idx").on(table.artworkId)]);

export const collections = pgTable("collections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false).notNull(),
  ...timestamps,
}, (table) => [index("collections_user_created_idx").on(table.userId, table.createdAt)]);

export const collectionItems = pgTable("collection_items", {
  collectionId: uuid("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  artworkId: uuid("artwork_id").notNull().references(() => artworks.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.collectionId, table.artworkId] }), index("collection_items_artwork_idx").on(table.artworkId)]);

export const follows = pgTable("follows", {
  followerId: text("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  artistId: uuid("artist_id").notNull().references(() => artistProfiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.followerId, table.artistId] }), index("follows_artist_idx").on(table.artistId)]);

export const carts = pgTable("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  currency: text("currency").default("INR").notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("carts_user_unique").on(table.userId)]);

export const cartItems = pgTable("cart_items", {
  cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  artworkId: uuid("artwork_id").notNull().references(() => artworks.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.cartId, table.artworkId] }), index("cart_items_artwork_idx").on(table.artworkId), check("cart_items_quantity_positive", sql`${table.quantity} > 0`)]);

export const addresses = pgTable("addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: text("label").default("Home").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").default("IN").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  ...timestamps,
}, (table) => [index("addresses_user_idx").on(table.userId)]);

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: text("order_number").notNull(),
  buyerId: text("buyer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  addressId: uuid("address_id").references(() => addresses.id, { onDelete: "set null" }),
  currency: text("currency").default("INR").notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  shipping: numeric("shipping", { precision: 12, scale: 2 }).default("0").notNull(),
  tax: numeric("tax", { precision: 12, scale: 2 }).default("0").notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 }).default("0").notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  status: orderStatus("status").default("PENDING").notNull(),
  paymentStatus: paymentStatus("payment_status").default("CREATED").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("orders_number_unique").on(table.orderNumber),
  index("orders_buyer_created_idx").on(table.buyerId, table.createdAt),
  index("orders_status_created_idx").on(table.status, table.createdAt),
  check("orders_amounts_nonnegative", sql`${table.subtotal} >= 0 and ${table.shipping} >= 0 and ${table.tax} >= 0 and ${table.discount} >= 0 and ${table.total} >= 0`),
]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  artworkId: uuid("artwork_id").references(() => artworks.id, { onDelete: "set null" }),
  artistId: uuid("artist_id").notNull().references(() => artistProfiles.id, { onDelete: "restrict" }),
  titleSnapshot: text("title_snapshot").notNull(),
  artistNameSnapshot: text("artist_name_snapshot").notNull(),
  imageUrlSnapshot: text("image_url_snapshot"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  platformFee: numeric("platform_fee", { precision: 12, scale: 2 }).notNull(),
  sellerEarnings: numeric("seller_earnings", { precision: 12, scale: 2 }).notNull(),
  ...timestamps,
}, (table) => [index("order_items_order_idx").on(table.orderId), index("order_items_artist_created_idx").on(table.artistId, table.createdAt), index("order_items_artwork_idx").on(table.artworkId), check("order_items_quantity_positive", sql`${table.quantity} > 0`), check("order_items_amounts_nonnegative", sql`${table.unitPrice} >= 0 and ${table.lineTotal} >= 0 and ${table.platformFee} >= 0 and ${table.sellerEarnings} >= 0`)]);

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: text("provider").default("RAZORPAY").notNull(),
  providerOrderId: text("provider_order_id"),
  providerPaymentId: text("provider_payment_id"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("INR").notNull(),
  status: paymentStatus("status").default("CREATED").notNull(),
  failureReason: text("failure_reason"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [uniqueIndex("payments_provider_order_unique").on(table.providerOrderId), uniqueIndex("payments_provider_payment_unique").on(table.providerPaymentId), index("payments_order_idx").on(table.orderId)]);

export const paymentAttempts = pgTable("payment_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: text("provider").default("RAZORPAY").notNull(),
  providerOrderId: text("provider_order_id").notNull(),
  providerPaymentId: text("provider_payment_id"),
  idempotencyKey: text("idempotency_key").notNull(),
  attemptNumber: integer("attempt_number").default(1).notNull(),
  amountPaise: bigint("amount_paise", { mode: "bigint" }).notNull(),
  currency: text("currency").default("INR").notNull(),
  status: paymentStatus("status").default("PENDING").notNull(),
  failureCode: text("failure_code"),
  failureReason: text("failure_reason"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("payment_attempts_provider_order_unique").on(table.provider, table.providerOrderId),
  uniqueIndex("payment_attempts_provider_payment_unique").on(table.provider, table.providerPaymentId),
  uniqueIndex("payment_attempts_idempotency_unique").on(table.idempotencyKey),
  index("payment_attempts_order_created_idx").on(table.orderId, table.createdAt),
  check("payment_attempts_amount_positive", sql`${table.amountPaise} > 0`),
]);

// Auctions own the reservation: an artwork remains PUBLISHED but is marked RESERVED
// only after an administrator schedules this record.  The finalizer validates this
// relationship explicitly before it can consume reserved inventory.
export const auctions = pgTable("auctions", {
  id: uuid("id").defaultRandom().primaryKey(),
  artworkId: uuid("artwork_id").notNull().references(() => artworks.id, { onDelete: "restrict" }),
  sellerId: uuid("seller_id").notNull().references(() => artistProfiles.id, { onDelete: "restrict" }),
  status: auctionStatus("status").default("DRAFT").notNull(),
  openingBidPaise: bigint("opening_bid_paise", { mode: "bigint" }).notNull(),
  minimumIncrementPaise: bigint("minimum_increment_paise", { mode: "bigint" }).notNull(),
  currentBidPaise: bigint("current_bid_paise", { mode: "bigint" }),
  winningBidPaise: bigint("winning_bid_paise", { mode: "bigint" }),
  winnerId: text("winner_id").references(() => users.id, { onDelete: "restrict" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  paymentDeadlineAt: timestamp("payment_deadline_at", { withTimezone: true }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("auctions_artwork_status_idx").on(table.artworkId, table.status),
  index("auctions_seller_created_idx").on(table.sellerId, table.createdAt),
  index("auctions_deadline_idx").on(table.status, table.paymentDeadlineAt),
  uniqueIndex("auctions_one_active_artwork_unique").on(table.artworkId).where(sql`${table.status} in ('SCHEDULED', 'LIVE', 'PAYMENT_PENDING')`),
  check("auctions_opening_bid_positive", sql`${table.openingBidPaise} > 0`),
  check("auctions_increment_positive", sql`${table.minimumIncrementPaise} > 0`),
  check("auctions_time_valid", sql`${table.endsAt} > ${table.startsAt}`),
]);

export const auctionBids = pgTable("auction_bids", {
  id: uuid("id").defaultRandom().primaryKey(),
  auctionId: uuid("auction_id").notNull().references(() => auctions.id, { onDelete: "cascade" }),
  bidderId: text("bidder_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  amountPaise: bigint("amount_paise", { mode: "bigint" }).notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("auction_bids_idempotency_unique").on(table.auctionId, table.bidderId, table.idempotencyKey),
  index("auction_bids_auction_amount_idx").on(table.auctionId, table.amountPaise, table.createdAt),
  check("auction_bids_amount_positive", sql`${table.amountPaise} > 0`),
]);

export const auctionEvents = pgTable("auction_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  auctionId: uuid("auction_id").notNull().references(() => auctions.id, { onDelete: "cascade" }),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  reason: text("reason"),
  data: jsonb("data").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("auction_events_auction_created_idx").on(table.auctionId, table.createdAt)]);

export const auctionPaymentAttempts = pgTable("auction_payment_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  auctionId: uuid("auction_id").notNull().references(() => auctions.id, { onDelete: "restrict" }),
  winnerId: text("winner_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  winningBidPaise: bigint("winning_bid_paise", { mode: "bigint" }).notNull(),
  amountPaise: bigint("amount_paise", { mode: "bigint" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "restrict" }),
  status: auctionPaymentStatus("status").default("PENDING").notNull(),
  deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("auction_payment_attempts_auction_unique").on(table.auctionId),
  uniqueIndex("auction_payment_attempts_order_unique").on(table.orderId),
  index("auction_payment_attempts_winner_deadline_idx").on(table.winnerId, table.deadlineAt),
  check("auction_payment_winning_bid_positive", sql`${table.winningBidPaise} > 0`),
]);

export const payouts = pgTable("payouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  artistId: uuid("artist_id").notNull().references(() => artistProfiles.id, { onDelete: "restrict" }),
  orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id, { onDelete: "restrict" }),
  grossAmount: numeric("gross_amount", { precision: 12, scale: 2 }).notNull(),
  platformFee: numeric("platform_fee", { precision: 12, scale: 2 }).notNull(),
  paymentFee: numeric("payment_fee", { precision: 12, scale: 2 }).default("0").notNull(),
  sellerEarnings: numeric("seller_earnings", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("INR").notNull(),
  status: payoutStatus("status").default("PENDING").notNull(),
  providerReference: text("provider_reference"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [uniqueIndex("payouts_order_item_unique").on(table.orderItemId), index("payouts_artist_status_idx").on(table.artistId, table.status)]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().default({}).notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("notifications_user_read_created_idx").on(table.userId, table.readAt, table.createdAt)]);

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull(),
  providerEventId: text("provider_event_id").notNull(),
  signatureHash: text("signature_hash").notNull(),
  bodyHash: text("body_hash").notNull(),
  eventType: text("event_type").notNull(),
  status: webhookEventStatus("status").default("PROCESSING").notNull(),
  attemptCount: integer("attempt_count").default(1).notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  processingStartedAt: timestamp("processing_started_at", { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
}, (table) => [
  uniqueIndex("webhook_events_provider_event_unique").on(table.provider, table.providerEventId),
  index("webhook_events_status_received_idx").on(table.status, table.receivedAt),
  index("webhook_events_signature_hash_idx").on(table.signatureHash),
]);

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  artworkId: uuid("artwork_id").notNull().references(() => artworks.id, { onDelete: "cascade" }),
  orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body"),
  ...timestamps,
}, (table) => [uniqueIndex("reviews_order_item_unique").on(table.orderItemId), index("reviews_artwork_idx").on(table.artworkId), index("reviews_user_idx").on(table.userId), check("reviews_rating_range", sql`${table.rating} between 1 and 5`)]);

export const searchHistory = pgTable("search_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  query: text("query").notNull(),
  filters: jsonb("filters").$type<Record<string, unknown>>().default({}).notNull(),
  resultCount: integer("result_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("search_history_user_created_idx").on(table.userId, table.createdAt)]);

export const recentlyViewed = pgTable("recently_viewed", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  artworkId: uuid("artwork_id").notNull().references(() => artworks.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.artworkId] }), index("recently_viewed_user_time_idx").on(table.userId, table.viewedAt), index("recently_viewed_artwork_idx").on(table.artworkId)]);

export const recommendations = pgTable("recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  artworkId: uuid("artwork_id").notNull().references(() => artworks.id, { onDelete: "cascade" }),
  score: numeric("score", { precision: 8, scale: 3 }).notNull(),
  explanation: text("explanation").notNull(),
  model: text("model").default("deterministic-v1").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("recommendations_user_score_idx").on(table.userId, table.score), index("recommendations_artwork_idx").on(table.artworkId)]);

export const userTasteProfiles = pgTable("user_taste_profiles", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  signals: jsonb("signals").$type<Record<string, number>>().default({}).notNull(),
  personalityName: text("personality_name").default("Curious Collector").notNull(),
  confidence: numeric("confidence", { precision: 5, scale: 2 }).default("0").notNull(),
  ...timestamps,
});
