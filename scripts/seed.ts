import { getDb } from "../db/index";
import { artistProfiles, artworkImages, artworks as artworkTable, categories, moods as moodTable, styles as styleTable, users } from "../db/schema";
import { artworks } from "../app/data";

const db = getDb();

const artistSeed = [
  { id: "10000000-0000-4000-8000-000000000001", userId: "seed-maya-raman", name: "Maya Raman", slug: "maya-raman", location: "Chennai", style: "Digital Art", image: "/midnight-tide.png", bio: "Exploring emotion through color, atmosphere and quiet algorithmic systems." },
  { id: "20000000-0000-4000-8000-000000000001", userId: "seed-noor-sen", name: "Noor Sen", slug: "noor-sen", location: "Kolkata", style: "Surrealism", image: "/blue-thread.png", bio: "Building dreamlike portraits from botany, memory and interrupted photographs." },
  { id: "30000000-0000-4000-8000-000000000001", userId: "seed-aarav-mehta", name: "Aarav Mehta", slug: "aarav-mehta", location: "Mumbai", style: "Abstract", image: "/fault-lines.png", bio: "Material studies about closeness, rupture and the soft geometry of people." },
  { id: "40000000-0000-4000-8000-000000000001", userId: "seed-kabir-das", name: "Kabir Das", slug: "kabir-das", location: "Bengaluru", style: "Conceptual", image: "/fault-lines.png", bio: "Graphic studies of controlled energy, technology, and human scale." },
  { id: "50000000-0000-4000-8000-000000000001", userId: "seed-ishaan-roy", name: "Ishaan Roy", slug: "ishaan-roy", location: "Pondicherry", style: "Minimalism", image: "/midnight-tide.png", bio: "Quiet photographic compositions shaped by architecture, night, and distance." },
];

const categoryId = "60000000-0000-4000-8000-000000000001";
const styleNames = [...new Set(artworks.map((artwork) => artwork.style))];
const moodNames = [...new Set(artworks.map((artwork) => artwork.mood))];
const uuidFor = (prefix: number, index: number) => `${prefix}0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function seed() {
  for (const artist of artistSeed) {
    await db.insert(users).values({ id: artist.userId, name: artist.name, email: `${artist.slug}@artists.giggle.gallery`, role: "SELLER" }).onConflictDoUpdate({ target: users.id, set: { name: artist.name, role: "SELLER", updatedAt: new Date() } });
    await db.insert(artistProfiles).values({ id: artist.id, userId: artist.userId, slug: artist.slug, displayName: artist.name, profileImageUrl: artist.image, biography: artist.bio, location: artist.location, styles: [artist.style], specialization: artist.style, verified: true, rating: "4.80" }).onConflictDoUpdate({ target: artistProfiles.id, set: { displayName: artist.name, biography: artist.bio, updatedAt: new Date() } });
  }
  await db.insert(categories).values({ id: categoryId, name: "Limited Editions", slug: "limited-editions" }).onConflictDoNothing();
  for (const [index, name] of styleNames.entries()) await db.insert(styleTable).values({ id: uuidFor(7, index), name, slug: slugify(name) }).onConflictDoNothing();
  for (const [index, name] of moodNames.entries()) await db.insert(moodTable).values({ id: uuidFor(8, index), name, slug: slugify(name) }).onConflictDoNothing();
  for (const artwork of artworks) {
    const dimensions = artwork.dimensions.match(/([0-9.]+)\s*×\s*([0-9.]+)/);
    await db.insert(artworkTable).values({ id: artwork.id, artistId: artwork.artistId, categoryId, styleId: uuidFor(7, styleNames.indexOf(artwork.style)), moodId: uuidFor(8, moodNames.indexOf(artwork.mood)), slug: artwork.slug, title: artwork.title, description: artwork.description, artistStatement: artwork.artistStatement, price: artwork.price.toFixed(2), currency: artwork.currency, medium: artwork.medium, year: artwork.year, widthCm: dimensions?.[1], heightCm: dimensions?.[2], ownershipDeclaration: "Seeded editorial collection with marketplace display rights.", type: "PHYSICAL", availability: "AVAILABLE", stock: 1, colors: artwork.colors, status: "PUBLISHED", featured: artwork.featured, viewCount: artwork.views, publishedAt: new Date(`${artwork.year}-01-01T00:00:00.000Z`) }).onConflictDoUpdate({ target: artworkTable.id, set: { title: artwork.title, price: artwork.price.toFixed(2), status: "PUBLISHED", updatedAt: new Date() } });
    await db.insert(artworkImages).values({ artworkId: artwork.id, url: artwork.image, altText: `${artwork.title} by ${artwork.artist}`, sortOrder: 0 }).onConflictDoUpdate({ target: [artworkImages.artworkId, artworkImages.sortOrder], set: { url: artwork.image, altText: `${artwork.title} by ${artwork.artist}`, updatedAt: new Date() } });
  }
  console.log(`Seeded ${artistSeed.length} artists and ${artworks.length} artworks.`);
}

seed().catch((error) => { console.error(error); process.exitCode = 1; });
