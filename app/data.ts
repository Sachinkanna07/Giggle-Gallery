export type Artwork = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  artistId: string;
  location: string;
  image: string;
  price: number;
  currency: "INR";
  medium: string;
  year: number;
  dimensions: string;
  style: string;
  mood: string;
  colors: string[];
  tags: string[];
  description: string;
  artistStatement: string;
  likes: number;
  views: number;
  rating: number;
  featured: boolean;
  trending: boolean;
  imagePosition?: string;
};

export const artworks: Artwork[] = [
  {
    id: "a1", slug: "midnight-tide", title: "Midnight Tide", artist: "Maya Raman", artistId: "maya-r", location: "Chennai",
    image: "/midnight-tide.png", price: 4800, currency: "INR", medium: "Generative pigment print", year: 2026, dimensions: "90 × 60 cm",
    style: "Digital Art", mood: "Calm", colors: ["blue", "black", "ivory"], tags: ["ocean", "night", "minimal", "surreal", "peaceful"],
    description: "A nocturnal seascape where velvet waves hold a small, private moon. The work turns restlessness into rhythm.",
    artistStatement: "I wanted the horizon to feel less like an ending and more like a breath held in blue.", likes: 1248, views: 9012, rating: 4.9, featured: true, trending: true,
  },
  {
    id: "a2", slug: "fault-lines-of-us", title: "Fault Lines of Us", artist: "Aarav Mehta", artistId: "aarav-m", location: "Mumbai",
    image: "/fault-lines.png", price: 6200, currency: "INR", medium: "Archival mixed-media print", year: 2025, dimensions: "70 × 88 cm",
    style: "Abstract", mood: "Energetic", colors: ["coral", "cream", "black"], tags: ["earth", "texture", "connection", "bold", "warm"],
    description: "Layers of coral pigment fold toward a dark center, tracing the distance and tenderness between people.",
    artistStatement: "The void is not absence. It is the charged space where two forms decide whether to meet.", likes: 934, views: 7204, rating: 4.8, featured: true, trending: true,
  },
  {
    id: "a3", slug: "the-blue-thread", title: "The Blue Thread", artist: "Noor Sen", artistId: "noor-s", location: "Kolkata",
    image: "/blue-thread.png", price: 5400, currency: "INR", medium: "Photographic collage", year: 2026, dimensions: "65 × 82 cm",
    style: "Surrealism", mood: "Dreamy", colors: ["black", "ivory", "blue", "teal"], tags: ["botanical", "portrait", "dream", "fashion", "mysterious"],
    description: "A figure dissolves into pressed botanicals while a cobalt line keeps the composition—and memory—together.",
    artistStatement: "We are held by tiny continuities: a scent, a color, a line returning through years.", likes: 1820, views: 11442, rating: 4.9, featured: true, trending: true,
  },
  {
    id: "a4", slug: "after-the-monsoon", title: "After the Monsoon", artist: "Maya Raman", artistId: "maya-r", location: "Chennai",
    image: "/midnight-tide.png", imagePosition: "76% center", price: 3900, currency: "INR", medium: "Digital pigment print", year: 2025, dimensions: "75 × 50 cm",
    style: "Contemporary", mood: "Peaceful", colors: ["blue", "ivory"], tags: ["water", "nature", "quiet", "meditative"],
    description: "Light pools over dark water in the quiet hour after a storm has passed.", artistStatement: "This is the relief of a city exhaling.", likes: 687, views: 4971, rating: 4.7, featured: false, trending: true,
  },
  {
    id: "a5", slug: "soft-voltage", title: "Soft Voltage", artist: "Kabir Das", artistId: "kabir-d", location: "Bengaluru",
    image: "/fault-lines.png", imagePosition: "18% center", price: 3500, currency: "INR", medium: "Risograph edition", year: 2026, dimensions: "50 × 64 cm",
    style: "Conceptual", mood: "Bold", colors: ["coral", "cream"], tags: ["energy", "future", "graphic", "abstract"],
    description: "A study in controlled friction, where paper-like folds become a landscape of electric intimacy.", artistStatement: "Intensity does not always arrive loudly.", likes: 514, views: 3902, rating: 4.6, featured: false, trending: false,
  },
  {
    id: "a6", slug: "her-secret-garden", title: "Her Secret Garden", artist: "Noor Sen", artistId: "noor-s", location: "Kolkata",
    image: "/blue-thread.png", imagePosition: "65% center", price: 7200, currency: "INR", medium: "Giclée collage", year: 2025, dimensions: "80 × 100 cm",
    style: "Photography", mood: "Mysterious", colors: ["black", "teal", "ivory"], tags: ["botanical", "portrait", "dark", "culture"],
    description: "Botanical traces become both camouflage and biography in this quiet portrait of private becoming.", artistStatement: "The garden is not behind her. It is the architecture of her inner life.", likes: 1050, views: 8301, rating: 4.8, featured: false, trending: true,
  },
  {
    id: "a7", slug: "blue-hour-study", title: "Blue Hour Study", artist: "Ishaan Roy", artistId: "ishaan-r", location: "Pondicherry",
    image: "/midnight-tide.png", imagePosition: "38% center", price: 2800, currency: "INR", medium: "Chromogenic print", year: 2024, dimensions: "42 × 30 cm",
    style: "Minimalism", mood: "Dark", colors: ["blue", "black"], tags: ["minimal", "night", "architecture", "calm"],
    description: "A compact meditation on blue, distance, and the shape of night.", artistStatement: "The darkest blue is never one color.", likes: 419, views: 2800, rating: 4.6, featured: false, trending: false,
  },
  {
    id: "a8", slug: "close-enough-to-touch", title: "Close Enough to Touch", artist: "Aarav Mehta", artistId: "aarav-m", location: "Mumbai",
    image: "/fault-lines.png", imagePosition: "82% center", price: 4100, currency: "INR", medium: "Textured pigment print", year: 2024, dimensions: "58 × 72 cm",
    style: "Impressionism", mood: "Joyful", colors: ["coral", "cream", "gold"], tags: ["warm", "human", "color", "organic"],
    description: "Warm strata curve around one another in an optimistic study of nearness.", artistStatement: "I painted the almost-touch—the moment with the most possibility.", likes: 763, views: 5108, rating: 4.7, featured: false, trending: false,
  },
];

export const artists = [
  { id: "maya-r", name: "Maya Raman", location: "Chennai", discipline: "Generative artist", followers: "12.4K", works: 24, image: "/midnight-tide.png", bio: "Exploring emotion through color, atmosphere and quiet algorithmic systems." },
  { id: "noor-s", name: "Noor Sen", location: "Kolkata", discipline: "Photographic artist", followers: "9.8K", works: 18, image: "/blue-thread.png", bio: "Building dreamlike portraits from botany, memory and interrupted photographs." },
  { id: "aarav-m", name: "Aarav Mehta", location: "Mumbai", discipline: "Mixed-media artist", followers: "7.1K", works: 31, image: "/fault-lines.png", bio: "Material studies about closeness, rupture and the soft geometry of people." },
];

export const moods = ["Joyful", "Calm", "Energetic", "Mysterious", "Dreamy", "Dark", "Peaceful", "Bold"];
export const styles = ["Abstract", "Impressionism", "Minimalism", "Surrealism", "Digital Art", "Photography", "Contemporary", "Conceptual"];

export function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);
}

export function scoreArtwork(artwork: Artwork, preferences: string[]) {
  const haystack = [artwork.mood, artwork.style, ...artwork.colors, ...artwork.tags].map((item) => item.toLowerCase());
  return preferences.reduce((score, pref) => score + (haystack.some((item) => item.includes(pref.toLowerCase())) ? 3 : 0), artwork.trending ? 1 : 0);
}

export function recommendationReason(artwork: Artwork, preferences: string[]) {
  const match = preferences.find((pref) => [artwork.mood, artwork.style, ...artwork.colors, ...artwork.tags].some((item) => item.toLowerCase().includes(pref.toLowerCase())));
  if (match) return `Recommended because your taste leans toward ${match.toLowerCase()} compositions.`;
  return `Recommended for its ${artwork.mood.toLowerCase()} energy and ${artwork.style.toLowerCase()} language.`;
}
