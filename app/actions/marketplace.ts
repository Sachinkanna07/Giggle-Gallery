"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import {
  artistApplications,
  artistProfiles,
  artworks,
  cartItems,
  carts,
  collectionItems,
  collections,
  follows,
  likes,
  recentlyViewed,
  reviews,
  savedArtworks,
  userTasteProfiles,
  orderItems,
  orders,
} from "@/db/schema";
import { requireAdmin, requireSeller, requireUser } from "@/lib/authz";
import { users } from "@/db/schema";

const idSchema = z.string().uuid();

export type MutationResult = { ok: true; active?: boolean; quantity?: number; id?: string } | { ok: false; error: string };

function friendlyError(error: unknown) {
  if (error instanceof Error && error.message === "AUTH_REQUIRED") return "Sign in with Google to continue.";
  if (error instanceof Error && error.message === "SELLER_REQUIRED") return "An approved seller account is required.";
  return "We could not save that change. Please try again.";
}

async function toggleRow(
  table: typeof likes | typeof savedArtworks,
  userId: string,
  artworkId: string,
): Promise<boolean> {
  const db = getDb();
  const [existing] = await db.select({ artworkId: table.artworkId }).from(table).where(and(eq(table.userId, userId), eq(table.artworkId, artworkId))).limit(1);
  if (existing) {
    await db.delete(table).where(and(eq(table.userId, userId), eq(table.artworkId, artworkId)));
    return false;
  }
  await db.insert(table).values({ userId, artworkId }).onConflictDoNothing();
  return true;
}

export async function toggleLike(artworkId: string): Promise<MutationResult> {
  try {
    const id = idSchema.parse(artworkId);
    const user = await requireUser();
    const active = await toggleRow(likes, user.id, id);
    revalidatePath("/");
    return { ok: true, active };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

export async function toggleSave(artworkId: string): Promise<MutationResult> {
  try {
    const id = idSchema.parse(artworkId);
    const user = await requireUser();
    const active = await toggleRow(savedArtworks, user.id, id);
    revalidatePath("/");
    revalidatePath("/collections");
    return { ok: true, active };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

export async function toggleFollow(artistId: string): Promise<MutationResult> {
  try {
    const id = idSchema.parse(artistId);
    const user = await requireUser();
    const db = getDb();
    const [existing] = await db.select({ artistId: follows.artistId }).from(follows).where(and(eq(follows.followerId, user.id), eq(follows.artistId, id))).limit(1);
    if (existing) await db.delete(follows).where(and(eq(follows.followerId, user.id), eq(follows.artistId, id)));
    else await db.insert(follows).values({ followerId: user.id, artistId: id }).onConflictDoNothing();
    revalidatePath("/");
    return { ok: true, active: !existing };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

async function getOrCreateCart(userId: string) {
  const db = getDb();
  await db.insert(carts).values({ userId }).onConflictDoNothing();
  const [cart] = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId)).limit(1);
  if (!cart) throw new Error("Cart could not be created.");
  return cart.id;
}

export async function setCartQuantity(artworkId: string, quantity: number): Promise<MutationResult> {
  try {
    const id = idSchema.parse(artworkId);
    const nextQuantity = z.number().int().min(0).max(99).parse(quantity);
    const user = await requireUser();
    const db = getDb();
    const [artwork] = await db.select({ stock: artworks.stock, availability: artworks.availability, status: artworks.status }).from(artworks).where(eq(artworks.id, id)).limit(1);
    if (!artwork || artwork.status !== "PUBLISHED" || artwork.availability !== "AVAILABLE") return { ok: false, error: "This artwork is no longer available." };
    if (nextQuantity > artwork.stock) return { ok: false, error: `Only ${artwork.stock} available.` };
    const cartId = await getOrCreateCart(user.id);
    if (nextQuantity === 0) await db.delete(cartItems).where(and(eq(cartItems.cartId, cartId), eq(cartItems.artworkId, id)));
    else await db.insert(cartItems).values({ cartId, artworkId: id, quantity: nextQuantity }).onConflictDoUpdate({ target: [cartItems.cartId, cartItems.artworkId], set: { quantity: nextQuantity, updatedAt: new Date() } });
    revalidatePath("/");
    revalidatePath("/checkout");
    return { ok: true, quantity: nextQuantity };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

export async function clearCart(): Promise<MutationResult> {
  try {
    const user = await requireUser();
    const db = getDb();
    const [cart] = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, user.id)).limit(1);
    if (cart) await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    revalidatePath("/");
    revalidatePath("/checkout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

const tasteSchema = z.array(z.string().trim().min(1).max(40)).min(1).max(10);

export async function saveTasteProfile(preferences: string[]): Promise<MutationResult> {
  try {
    const values = tasteSchema.parse(preferences);
    const user = await requireUser();
    const signals = Object.fromEntries(values.map((value, index) => [value, Math.max(20, 90 - index * 11)]));
    const lead = values[0] ?? "Curious";
    await getDb().insert(userTasteProfiles).values({ userId: user.id, signals, personalityName: `${lead} Explorer`, confidence: "78" }).onConflictDoUpdate({ target: userTasteProfiles.userId, set: { signals, personalityName: `${lead} Explorer`, confidence: "78", updatedAt: new Date() } });
    revalidatePath("/");
    revalidatePath("/account");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

export async function recordArtworkView(artworkId: string): Promise<MutationResult> {
  try {
    const id = idSchema.parse(artworkId);
    const user = await requireUser();
    const db = getDb();
    await Promise.all([
      db.insert(recentlyViewed).values({ userId: user.id, artworkId: id }).onConflictDoUpdate({ target: [recentlyViewed.userId, recentlyViewed.artworkId], set: { viewedAt: new Date() } }),
      db.update(artworks).set({ viewCount: sql`${artworks.viewCount} + 1` }).where(eq(artworks.id, id)),
    ]);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

const collectionName = z.string().trim().min(2).max(80);

export async function createCollection(name: string): Promise<MutationResult> {
  try {
    const user = await requireUser();
    const [created] = await getDb().insert(collections).values({ userId: user.id, name: collectionName.parse(name) }).returning({ id: collections.id });
    revalidatePath("/collections");
    return { ok: true, id: created.id };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

export async function renameCollection(collectionId: string, name: string): Promise<MutationResult> {
  try {
    const user = await requireUser();
    const id = idSchema.parse(collectionId);
    await getDb().update(collections).set({ name: collectionName.parse(name), updatedAt: new Date() }).where(and(eq(collections.id, id), eq(collections.userId, user.id)));
    revalidatePath("/collections");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

export async function deleteCollection(collectionId: string): Promise<MutationResult> {
  try {
    const user = await requireUser();
    const id = idSchema.parse(collectionId);
    await getDb().delete(collections).where(and(eq(collections.id, id), eq(collections.userId, user.id)));
    revalidatePath("/collections");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

export async function setCollectionArtwork(collectionId: string, artworkId: string, active: boolean): Promise<MutationResult> {
  try {
    const user = await requireUser();
    const collection = idSchema.parse(collectionId);
    const artwork = idSchema.parse(artworkId);
    const db = getDb();
    const [owned] = await db.select({ id: collections.id }).from(collections).where(and(eq(collections.id, collection), eq(collections.userId, user.id))).limit(1);
    if (!owned) return { ok: false, error: "Collection not found." };
    if (active) await db.insert(collectionItems).values({ collectionId: collection, artworkId: artwork }).onConflictDoNothing();
    else await db.delete(collectionItems).where(and(eq(collectionItems.collectionId, collection), eq(collectionItems.artworkId, artwork)));
    revalidatePath("/collections");
    return { ok: true, active };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

const sellerApplicationSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  displayName: z.string().trim().min(2).max(80),
  email: z.string().email(),
  phone: z.string().trim().min(7).max(20),
  country: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  biography: z.string().trim().min(40).max(2000),
  artistStatement: z.string().trim().min(40).max(2000),
  artStyle: z.string().trim().min(2).max(80),
  specialization: z.string().trim().min(2).max(120),
  experienceYears: z.coerce.number().int().min(0).max(80),
  portfolioUrl: z.union([z.literal(""), z.string().url()]).optional(),
  socialUrl: z.union([z.literal(""), z.string().url()]).optional(),
  preferredCurrency: z.enum(["INR", "USD", "EUR", "GBP"]),
  sellerType: z.enum(["INDIVIDUAL", "STUDIO", "GALLERY"]),
});

export async function submitSellerApplication(_: unknown, formData: FormData) {
  try {
    const user = await requireUser();
    const parsed = sellerApplicationSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
    await getDb().insert(artistApplications).values({ userId: user.id, ...parsed.data, portfolioUrl: parsed.data.portfolioUrl || null, socialUrl: parsed.data.socialUrl || null }).onConflictDoUpdate({ target: artistApplications.userId, set: { ...parsed.data, portfolioUrl: parsed.data.portfolioUrl || null, socialUrl: parsed.data.socialUrl || null, status: "PENDING", updatedAt: new Date() } });
    revalidatePath("/sell");
    return { ok: true, message: "Application received. We’ll email you after review." };
  } catch (error) {
    return { ok: false, message: friendlyError(error) };
  }
}

const artworkSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().min(40).max(5000),
  artistStatement: z.string().trim().max(2000).optional(),
  price: z.coerce.number().positive().max(100000000),
  currency: z.enum(["INR", "USD", "EUR", "GBP"]),
  medium: z.string().trim().min(2).max(120),
  year: z.coerce.number().int().min(1000).max(new Date().getFullYear()),
  widthCm: z.coerce.number().positive().max(10000),
  heightCm: z.coerce.number().positive().max(10000),
  type: z.enum(["DIGITAL", "PHYSICAL"]),
  stock: z.coerce.number().int().min(1).max(999),
  colors: z.string().transform((value) => value.split(",").map((part) => part.trim().toLowerCase()).filter(Boolean).slice(0, 12)),
  imageUrl: z.string().url(),
  ownershipDeclaration: z.literal("confirmed"),
});

export async function createArtwork(_: unknown, formData: FormData) {
  try {
    const user = await requireSeller();
    const parsed = artworkSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the artwork details." };
    const [artist] = await getDb().select({ id: artistProfiles.id }).from(artistProfiles).where(eq(artistProfiles.userId, user.id)).limit(1);
    if (!artist) return { ok: false, message: "Complete seller approval before adding artwork." };
    const slug = `${parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${crypto.randomUUID().slice(0, 8)}`;
    const db = getDb();
    const [created] = await db.insert(artworks).values({ artistId: artist.id, slug, title: parsed.data.title, description: parsed.data.description, artistStatement: parsed.data.artistStatement, price: parsed.data.price.toFixed(2), currency: parsed.data.currency, medium: parsed.data.medium, year: parsed.data.year, widthCm: parsed.data.widthCm.toFixed(2), heightCm: parsed.data.heightCm.toFixed(2), ownershipDeclaration: "Seller confirmed original ownership or licensed resale rights.", type: parsed.data.type, stock: parsed.data.stock, colors: parsed.data.colors, status: "PENDING_REVIEW" }).returning({ id: artworks.id });
    const { artworkImages } = await import("@/db/schema");
    await db.insert(artworkImages).values({ artworkId: created.id, url: parsed.data.imageUrl, altText: `${parsed.data.title} by the submitting artist` });
    revalidatePath("/seller");
    return { ok: true, message: "Artwork submitted for review." };
  } catch (error) {
    return { ok: false, message: friendlyError(error) };
  }
}

export async function reviewSellerApplication(applicationId: string, decision: "APPROVED" | "REJECTED" | "NEEDS_REVIEW"): Promise<MutationResult> {
  try {
    const admin = await requireAdmin();
    const id = idSchema.parse(applicationId);
    const db = getDb();
    const [application] = await db.select().from(artistApplications).where(eq(artistApplications.id, id)).limit(1);
    if (!application) return { ok: false, error: "Application not found." };
    await db.update(artistApplications).set({ status: decision, reviewedBy: admin.id, reviewedAt: new Date(), updatedAt: new Date() }).where(eq(artistApplications.id, id));
    if (decision === "APPROVED") {
      const slug = `${application.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${application.id.slice(0, 6)}`;
      await db.insert(artistProfiles).values({ userId: application.userId, slug, displayName: application.displayName, biography: application.biography, artistStatement: application.artistStatement, location: [application.city, application.state, application.country].filter(Boolean).join(", "), styles: [application.artStyle], specialization: application.specialization, experienceYears: application.experienceYears, portfolioUrl: application.portfolioUrl, socialUrl: application.socialUrl, preferredCurrency: application.preferredCurrency, sellerType: application.sellerType, verified: true }).onConflictDoUpdate({ target: artistProfiles.userId, set: { displayName: application.displayName, biography: application.biography, artistStatement: application.artistStatement, styles: [application.artStyle], verified: true, updatedAt: new Date() } });
      await db.update(users).set({ role: "SELLER", updatedAt: new Date() }).where(eq(users.id, application.userId));
    }
    revalidatePath("/admin");
    revalidatePath("/seller");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: friendlyError(error) };
  }
}

export async function reviewSellerApplicationForm(formData: FormData): Promise<void> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const decision = String(formData.get("decision") ?? "") as "APPROVED" | "REJECTED" | "NEEDS_REVIEW";
  await reviewSellerApplication(applicationId, decision);
}

const reviewSchema = z.object({ orderItemId: z.string().uuid(), rating: z.coerce.number().int().min(1).max(5), body: z.string().trim().min(10).max(2000) });

export async function submitReview(_: unknown, formData: FormData) {
  try {
    const user = await requireUser();
    const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your review." };
    const db = getDb();
    const [item] = await db.select({ artworkId: orderItems.artworkId, status: orders.status, buyerId: orders.buyerId }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(and(eq(orderItems.id, parsed.data.orderItemId), eq(orders.buyerId, user.id))).limit(1);
    if (!item?.artworkId || item.buyerId !== user.id) return { ok: false, message: "Purchase not found." };
    if (item.status !== "DELIVERED") return { ok: false, message: "Reviews open after delivery." };
    await db.insert(reviews).values({ userId: user.id, artworkId: item.artworkId, orderItemId: parsed.data.orderItemId, rating: parsed.data.rating, body: parsed.data.body }).onConflictDoUpdate({ target: reviews.orderItemId, set: { rating: parsed.data.rating, body: parsed.data.body, updatedAt: new Date() } });
    revalidatePath("/orders");
    return { ok: true, message: "Review published." };
  } catch (error) {
    return { ok: false, message: friendlyError(error) };
  }
}
