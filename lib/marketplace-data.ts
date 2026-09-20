import "server-only";

import { and, count, desc, eq, inArray } from "drizzle-orm";
import { getDb, hasDatabase } from "@/db";
import { isProductionRuntime } from "@/lib/env-schema";
import {
  artistApplications,
  artistProfiles,
  artworkImages,
  artworks as artworkTable,
  artworkTags,
  cartItems,
  carts,
  categories,
  collectionItems,
  collections,
  follows,
  likes,
  moods as moodTable,
  orderItems,
  orders,
  payouts,
  savedArtworks,
  searchHistory,
  styles as styleTable,
  tags,
  userTasteProfiles,
} from "@/db/schema";
import { Artwork, artists as fallbackArtists, artworks as fallbackArtworks } from "@/app/data";

export type ArtistSummary = {
  id: string;
  slug: string;
  name: string;
  location: string;
  discipline: string;
  followers: string;
  followerCount: number;
  works: number;
  image: string;
  bio: string;
  rating: number;
};

export type CartItemDetail = {
  artworkId: string;
  quantity: number;
  title: string;
  artist: string;
  price: number;
  image: string;
  type: "DIGITAL" | "PHYSICAL";
  stock: number;
  availability: string;
  status: string;
  isAvailable: boolean;
  unavailableReason?: string;
};

export type ViewerState = {
  likedIds: string[];
  savedIds: string[];
  followedArtistIds: string[];
  cart: CartItemDetail[];
  preferences: string[];
  collections: Array<{ id: string; name: string; artworkIds: string[] }>;
  recentSearches: string[];
};

export type MarketplaceCatalog = { artworks: Artwork[]; artists: ArtistSummary[]; databaseReady: boolean };

const emptyViewer: ViewerState = { likedIds: [], savedIds: [], followedArtistIds: [], cart: [], preferences: [], collections: [], recentSearches: [] };

function fallbackCatalog(): MarketplaceCatalog {
  return {
    databaseReady: false,
    artworks: fallbackArtworks.map((artwork) => ({ ...artwork, category: "Limited editions", availability: "AVAILABLE", stock: 1, type: "PHYSICAL" })),
    artists: fallbackArtists.map((artist) => ({ ...artist, slug: artist.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), followerCount: Number.parseFloat(artist.followers) * 1000, rating: 4.8 })),
  };
}

export async function getMarketplaceCatalog(): Promise<MarketplaceCatalog> {
  if (!hasDatabase()) {
    if (isProductionRuntime()) throw new Error("Production catalog unavailable: DATABASE_URL is not configured.");
    return fallbackCatalog();
  }
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: artworkTable.id,
        slug: artworkTable.slug,
        title: artworkTable.title,
        artistId: artworkTable.artistId,
        artist: artistProfiles.displayName,
        artistSlug: artistProfiles.slug,
        location: artistProfiles.location,
        artistBio: artistProfiles.biography,
        artistImage: artistProfiles.profileImageUrl,
        artistRating: artistProfiles.rating,
        price: artworkTable.price,
        currency: artworkTable.currency,
        medium: artworkTable.medium,
        year: artworkTable.year,
        widthCm: artworkTable.widthCm,
        heightCm: artworkTable.heightCm,
        style: styleTable.name,
        mood: moodTable.name,
        category: categories.name,
        colors: artworkTable.colors,
        description: artworkTable.description,
        artistStatement: artworkTable.artistStatement,
        views: artworkTable.viewCount,
        featured: artworkTable.featured,
        availability: artworkTable.availability,
        stock: artworkTable.stock,
        type: artworkTable.type,
        publishedAt: artworkTable.publishedAt,
      })
      .from(artworkTable)
      .innerJoin(artistProfiles, eq(artworkTable.artistId, artistProfiles.id))
      .leftJoin(styleTable, eq(artworkTable.styleId, styleTable.id))
      .leftJoin(moodTable, eq(artworkTable.moodId, moodTable.id))
      .leftJoin(categories, eq(artworkTable.categoryId, categories.id))
      .where(eq(artworkTable.status, "PUBLISHED"))
      .orderBy(desc(artworkTable.featured), desc(artworkTable.publishedAt));

    if (!rows.length) return { artworks: [], artists: [], databaseReady: true };
    const ids = rows.map((row) => row.id);
    const artistIds = [...new Set(rows.map((row) => row.artistId))];
    const [images, tagRows, likeRows, followerRows] = await Promise.all([
      db.select().from(artworkImages).where(inArray(artworkImages.artworkId, ids)).orderBy(artworkImages.sortOrder),
      db.select({ artworkId: artworkTags.artworkId, name: tags.name }).from(artworkTags).innerJoin(tags, eq(artworkTags.tagId, tags.id)).where(inArray(artworkTags.artworkId, ids)),
      db.select({ artworkId: likes.artworkId, value: count() }).from(likes).where(inArray(likes.artworkId, ids)).groupBy(likes.artworkId),
      db.select({ artistId: follows.artistId, value: count() }).from(follows).where(inArray(follows.artistId, artistIds)).groupBy(follows.artistId),
    ]);

    const imageByArtwork = new Map<string, (typeof images)[number]>();
    images.forEach((image) => { if (!imageByArtwork.has(image.artworkId)) imageByArtwork.set(image.artworkId, image); });
    const tagsByArtwork = new Map<string, string[]>();
    tagRows.forEach((tag) => tagsByArtwork.set(tag.artworkId, [...(tagsByArtwork.get(tag.artworkId) ?? []), tag.name]));
    const likesByArtwork = new Map(likeRows.map((row) => [row.artworkId, Number(row.value)]));
    const followersByArtist = new Map(followerRows.map((row) => [row.artistId, Number(row.value)]));

    const mapped: Artwork[] = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      artist: row.artist,
      artistId: row.artistId,
      location: row.location ?? "India",
      image: imageByArtwork.get(row.id)?.url ?? "/midnight-tide.png",
      price: Number(row.price),
      currency: "INR",
      medium: row.medium,
      year: row.year,
      dimensions: row.widthCm && row.heightCm ? `${Number(row.widthCm)} × ${Number(row.heightCm)} cm` : "Dimensions on request",
      style: row.style ?? "Contemporary",
      mood: row.mood ?? "Calm",
      colors: row.colors,
      tags: tagsByArtwork.get(row.id) ?? [],
      description: row.description,
      artistStatement: row.artistStatement ?? "Created as an original work for thoughtful spaces.",
      likes: likesByArtwork.get(row.id) ?? 0,
      views: row.views,
      rating: Number(row.artistRating),
      featured: row.featured,
      trending: row.views > 100,
      category: row.category ?? "Uncategorized",
      availability: row.availability,
      stock: row.stock,
      type: row.type,
    }));

    const artistMap = new Map<string, ArtistSummary>();
    rows.forEach((row) => {
      const works = rows.filter((candidate) => candidate.artistId === row.artistId);
      artistMap.set(row.artistId, {
        id: row.artistId,
        slug: row.artistSlug,
        name: row.artist,
        location: row.location ?? "India",
        discipline: works[0]?.style ?? "Visual artist",
        followers: new Intl.NumberFormat("en-IN", { notation: "compact" }).format(followersByArtist.get(row.artistId) ?? 0),
        followerCount: followersByArtist.get(row.artistId) ?? 0,
        works: works.length,
        image: row.artistImage ?? imageByArtwork.get(row.id)?.url ?? "/blue-thread.png",
        bio: row.artistBio,
        rating: Number(row.artistRating),
      });
    });
    return { artworks: mapped, artists: [...artistMap.values()], databaseReady: true };
  } catch (error) {
    if (isProductionRuntime()) throw error;
    console.error("Database catalog unavailable; rendering the curated fallback.", error);
    return fallbackCatalog();
  }
}

export async function getViewerState(userId?: string): Promise<ViewerState> {
  if (!userId || !hasDatabase()) return emptyViewer;
  const db = getDb();
  const [liked, saved, followed, rawCartRows, taste, ownedCollections, searches] = await Promise.all([
    db.select({ artworkId: likes.artworkId }).from(likes).where(eq(likes.userId, userId)),
    db.select({ artworkId: savedArtworks.artworkId }).from(savedArtworks).where(eq(savedArtworks.userId, userId)),
    db.select({ artistId: follows.artistId }).from(follows).where(eq(follows.followerId, userId)),
    db
      .select({
        artworkId: cartItems.artworkId,
        quantity: cartItems.quantity,
        title: artworkTable.title,
        artist: artistProfiles.displayName,
        price: artworkTable.price,
        currency: artworkTable.currency,
        stock: artworkTable.stock,
        availability: artworkTable.availability,
        status: artworkTable.status,
        type: artworkTable.type,
      })
      .from(carts)
      .innerJoin(cartItems, eq(carts.id, cartItems.cartId))
      .leftJoin(artworkTable, eq(cartItems.artworkId, artworkTable.id))
      .leftJoin(artistProfiles, eq(artworkTable.artistId, artistProfiles.id))
      .where(eq(carts.userId, userId)),
    db.select().from(userTasteProfiles).where(eq(userTasteProfiles.userId, userId)).limit(1),
    db.select({ id: collections.id, name: collections.name, artworkId: collectionItems.artworkId }).from(collections).leftJoin(collectionItems, eq(collections.id, collectionItems.collectionId)).where(eq(collections.userId, userId)).orderBy(desc(collections.createdAt)),
    db.select({ query: searchHistory.query }).from(searchHistory).where(eq(searchHistory.userId, userId)).orderBy(desc(searchHistory.createdAt)).limit(8),
  ]);

  const cartArtworkIds = rawCartRows.map((row) => row.artworkId);
  const cartImages = cartArtworkIds.length
    ? await db.select({ artworkId: artworkImages.artworkId, url: artworkImages.url }).from(artworkImages).where(inArray(artworkImages.artworkId, cartArtworkIds)).orderBy(artworkImages.sortOrder)
    : [];
  const cartImageMap = new Map<string, string>();
  cartImages.forEach((img) => { if (!cartImageMap.has(img.artworkId)) cartImageMap.set(img.artworkId, img.url); });

  const cart: CartItemDetail[] = rawCartRows.map((row) => {
    const isPublished = row.status === "PUBLISHED";
    const isAvailableStatus = row.availability === "AVAILABLE";
    const hasStock = (row.stock ?? 0) >= row.quantity && row.quantity >= 1;
    const isAvailable = isPublished && isAvailableStatus && hasStock;

    let unavailableReason: string | undefined;
    if (!row.title || !isPublished) {
      unavailableReason = "This artwork is no longer listed in the gallery.";
    } else if (!isAvailableStatus || (row.stock ?? 0) === 0) {
      unavailableReason = "This artwork is sold out.";
    } else if (row.quantity > (row.stock ?? 0)) {
      unavailableReason = `Only ${row.stock} left in stock.`;
    }

    return {
      artworkId: row.artworkId,
      quantity: row.quantity,
      title: row.title ?? "Unavailable Artwork",
      artist: row.artist ?? "Unknown Artist",
      price: Number(row.price ?? 0),
      image: cartImageMap.get(row.artworkId) ?? "/midnight-tide.png",
      type: row.type ?? "PHYSICAL",
      stock: row.stock ?? 0,
      availability: row.availability ?? "SOLD_OUT",
      status: row.status ?? "REJECTED",
      isAvailable,
      unavailableReason,
    };
  });

  const collectionMap = new Map<string, { id: string; name: string; artworkIds: string[] }>();
  ownedCollections.forEach((row) => {
    const value = collectionMap.get(row.id) ?? { id: row.id, name: row.name, artworkIds: [] };
    if (row.artworkId) value.artworkIds.push(row.artworkId);
    collectionMap.set(row.id, value);
  });
  const signals = taste[0]?.signals ?? {};
  return {
    likedIds: liked.map((row) => row.artworkId),
    savedIds: saved.map((row) => row.artworkId),
    followedArtistIds: followed.map((row) => row.artistId),
    cart,
    preferences: Object.entries(signals).sort((a, b) => b[1] - a[1]).map(([name]) => name).slice(0, 6),
    collections: [...collectionMap.values()],
    recentSearches: [...new Set(searches.map((row) => row.query))].slice(0, 5),
  };
}

export async function getArtworkBySlug(slug: string) {
  const catalog = await getMarketplaceCatalog();
  return catalog.artworks.find((artwork) => artwork.slug === slug) ?? null;
}

export async function getArtistBySlug(slug: string) {
  const catalog = await getMarketplaceCatalog();
  const artist = catalog.artists.find((item) => item.slug === slug);
  return artist ? { artist, artworks: catalog.artworks.filter((artwork) => artwork.artistId === artist.id) } : null;
}

export async function getBuyerOrders(userId: string) {
  if (!hasDatabase()) return [];
  return getDb().select({ id: orders.id, orderNumber: orders.orderNumber, createdAt: orders.createdAt, total: orders.total, paymentStatus: orders.paymentStatus, status: orders.status, itemId: orderItems.id, artworkId: orderItems.artworkId, title: orderItems.titleSnapshot, artist: orderItems.artistNameSnapshot, quantity: orderItems.quantity, lineTotal: orderItems.lineTotal }).from(orders).leftJoin(orderItems, eq(orders.id, orderItems.orderId)).where(eq(orders.buyerId, userId)).orderBy(desc(orders.createdAt));
}

export async function getSellerSnapshot(userId: string) {
  if (!hasDatabase()) return { artist: null, application: null, artworks: [], sales: [], payouts: [] };
  const db = getDb();
  const [artist] = await db.select().from(artistProfiles).where(eq(artistProfiles.userId, userId)).limit(1);
  const [application] = await db.select().from(artistApplications).where(eq(artistApplications.userId, userId)).limit(1);
  if (!artist) return { artist: null, application: application ?? null, artworks: [], sales: [], payouts: [] };
  const [sellerArtworks, sales, sellerPayouts] = await Promise.all([
    db.select().from(artworkTable).where(eq(artworkTable.artistId, artist.id)).orderBy(desc(artworkTable.createdAt)),
    db.select({ id: orderItems.id, orderNumber: orders.orderNumber, buyerReference: orders.buyerId, title: orderItems.titleSnapshot, quantity: orderItems.quantity, amount: orderItems.lineTotal, sellerEarnings: orderItems.sellerEarnings, status: orders.status, paymentStatus: orders.paymentStatus, createdAt: orderItems.createdAt }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(and(eq(orderItems.artistId, artist.id), eq(orders.paymentStatus, "PAID"), inArray(orders.status, ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"]))).orderBy(desc(orderItems.createdAt)),
    db.select().from(payouts).where(eq(payouts.artistId, artist.id)).orderBy(desc(payouts.createdAt)),
  ]);
  const verifiedSales = sales.filter((sale) => sale.paymentStatus === "PAID" && ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(sale.status));
  return { artist, application: application ?? null, artworks: sellerArtworks, sales: verifiedSales, payouts: sellerPayouts };
}
