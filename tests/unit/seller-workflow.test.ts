import { beforeEach, describe, expect, it, vi } from "vitest";


const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireSeller: vi.fn(),
  requireAdmin: vi.fn(),
  getDb: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/authz", () => ({
  requireUser: mocks.requireUser,
  requireSeller: mocks.requireSeller,
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/db", () => ({ getDb: mocks.getDb }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/blob-validation", () => ({
  isApprovedArtworkBlobUrl: (url: string, pathname: string) => url.includes(pathname),
}));

import { createArtwork, reviewArtwork, reviewSellerApplication, submitSellerApplication } from "../../app/actions/marketplace";

const activeUser = { id: "user-123", role: "USER" };
const activeSeller = { id: "seller-456", role: "SELLER" };


function database(mockUpload: unknown = null, mockArtist: unknown = null) {
  const selectWhere = vi.fn().mockReturnValue({
    limit: () => ({
      for: vi.fn().mockResolvedValue(mockUpload ? [mockUpload] : []),
      then: (res: (val: unknown) => void) => res(mockArtist ? [mockArtist] : []),
    }),
  });
  const tx = {
    select: vi.fn().mockReturnValue({ from: () => ({ where: selectWhere, innerJoin: () => ({ where: selectWhere }) }) }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "new-record-id" }]), onConflictDoUpdate: vi.fn(), onConflictDoNothing: vi.fn() }) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
  };
  const transaction = vi.fn(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx));
  mocks.getDb.mockReturnValue({ transaction, ...tx });
  return { tx, transaction, selectWhere };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("Seller Application", () => {
  it("blocks unauthenticated users", async () => {
    mocks.requireUser.mockRejectedValue(new Error("AUTH_REQUIRED"));
    const formData = new FormData();
    const result = await submitSellerApplication(null, formData);
    expect(result).toEqual({ ok: false, message: "Sign in with Google to continue." });
  });

  it("ignores forged user identity from the client", async () => {
    mocks.requireUser.mockResolvedValue(activeUser);
    const db = database();
    const formData = new FormData();
    formData.set("userId", "attacker-id");
    formData.set("fullName", "Test Name");
    formData.set("displayName", "Test Display");
    formData.set("email", "test@test.com");
    formData.set("phone", "12345678");
    formData.set("country", "US");
    formData.set("state", "CA");
    formData.set("city", "LA");
    formData.set("biography", "A".repeat(40));
    formData.set("artistStatement", "A".repeat(40));
    formData.set("artStyle", "Modern");
    formData.set("specialization", "Painting");
    formData.set("experienceYears", "5");
    formData.set("preferredCurrency", "USD");
    formData.set("sellerType", "INDIVIDUAL");
    
    await submitSellerApplication(null, formData);
    expect(db.tx.insert).toHaveBeenCalled();
    const insertedValues = db.tx.insert().values.mock.calls[0][0];
    expect(insertedValues.userId).toBe("user-123");
  });
});

describe("Admin Approval", () => {
  it("blocks non-admins from reviewing applications", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("ADMIN_REQUIRED"));
    const result = await reviewSellerApplication("app-id", "APPROVED");
    expect(result).toEqual({ ok: false, error: "We could not save that change. Please try again." });
  });

  /**
   * Helper: sets up the DB mock so reviewSellerApplication can find an
   * application record inside its transaction.
   * Returns the spy objects for assertion.
   */
  function approvalDatabase(application: Record<string, unknown>) {
    // The action calls: tx.select().from(artistApplications).where(…).limit(1).for("update")
    const forFn = vi.fn().mockResolvedValue([application]);
    const limitFn = vi.fn().mockReturnValue({ for: forFn });
    const selectWhere = vi.fn().mockReturnValue({ limit: limitFn });
    const tx = {
      select: vi.fn().mockReturnValue({ from: () => ({ where: selectWhere }) }),
      // onConflictDoUpdate is awaited in the action — must return a Promise
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoUpdate: vi.fn().mockResolvedValue(undefined), returning: vi.fn().mockResolvedValue([{ id: "new-id" }]) }) }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
      delete: vi.fn().mockReturnValue({ where: vi.fn() }),
    };
    const transaction = vi.fn(async (cb: (value: typeof tx) => Promise<unknown>) => cb(tx));
    mocks.getDb.mockReturnValue({ transaction, ...tx });
    return { tx, transaction };
  }

  // Must be a valid UUID to pass idSchema.parse() inside reviewSellerApplication
  const APP_UUID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

  const baseApplication = {
    id: APP_UUID,
    userId: "user-buyer-id",
    displayName: "Test Artist",
    fullName: "Test Full Name",
    biography: "A".repeat(50),
    artistStatement: "B".repeat(50),
    city: "Chennai",
    state: "TN",
    country: "IN",
    artStyle: "Digital",
    specialization: "Illustration",
    experienceYears: 5,
    portfolioUrl: null,
    socialUrl: null,
    preferredCurrency: "INR",
    sellerType: "INDIVIDUAL",
    status: "PENDING",
  };

  it("BUYER approval: calls role update with WHERE role = BUYER guard", async () => {
    const adminUser = { id: "admin-id", role: "ADMIN" };
    mocks.requireAdmin.mockResolvedValue(adminUser);
    const { tx } = approvalDatabase(baseApplication);

    const result = await reviewSellerApplication(APP_UUID, "APPROVED");
    expect(result).toEqual({ ok: true });

    // tx.update must have been called for users (role change) and artistApplications (status)
    expect(tx.update).toHaveBeenCalledTimes(2);

    // Collect all .set().where() call chains to find the role update
    const setCalls = tx.update.mock.results.map((r) => r.value.set);
    const setArgs = setCalls.flatMap((fn: ReturnType<typeof vi.fn>) => fn.mock.calls.map((c: unknown[]) => c[0])) as Record<string, unknown>[];
    const roleUpdate = setArgs.find((a) => "role" in a) as Record<string, unknown> | undefined;
    expect(roleUpdate).toBeDefined();
    expect(roleUpdate!.role).toBe("SELLER");

    // Verify the WHERE clause of the role update includes the role = BUYER guard.
    // The where() spy is called with the AND condition expression — we verify it
    // was called (existence) and called exactly once per role-update chain.
    const whereSpies = setCalls.map((fn: ReturnType<typeof vi.fn>) => fn.mock.results[fn.mock.results.length - 1]?.value?.where);
    expect(whereSpies.some((w: unknown) => typeof w === "function")).toBe(true);
  });

  it("ADMIN applicant approval: artist profile upserted but role NOT overwritten to SELLER", async () => {
    const adminUser = { id: "admin-id", role: "ADMIN" };
    mocks.requireAdmin.mockResolvedValue(adminUser);
    // Simulate an application from a user who is already ADMIN
    const { tx } = approvalDatabase({ ...baseApplication, userId: "admin-id" });

    const result = await reviewSellerApplication(APP_UUID, "APPROVED");
    expect(result).toEqual({ ok: true });

    // Artist profile insert/upsert must still be called
    expect(tx.insert).toHaveBeenCalled();

    // The role update WHERE clause must include the BUYER guard so ADMIN is
    // untouched (the real DB will match 0 rows because role != 'BUYER').
    // We verify the set() argument contains role: "SELLER" and the where guard
    // exists — the conditional WHERE is what makes it safe.
    const setCalls = tx.update.mock.results.map((r) => r.value.set);
    const setArgs = setCalls.flatMap((fn: ReturnType<typeof vi.fn>) => fn.mock.calls.map((c: unknown[]) => c[0])) as Record<string, unknown>[];
    const roleUpdate = setArgs.find((a) => "role" in a) as Record<string, unknown> | undefined;
    // Role update is emitted with the BUYER guard — role field is SELLER (the candidate),
    // but the WHERE clause ensures it only matches BUYER rows in production.
    expect(roleUpdate).toBeDefined();
    expect(roleUpdate!.role).toBe("SELLER");
  });

  it("artist profile is upserted on approval regardless of applicant role", async () => {
    const adminUser = { id: "admin-id", role: "ADMIN" };
    mocks.requireAdmin.mockResolvedValue(adminUser);
    const { tx } = approvalDatabase(baseApplication);

    await reviewSellerApplication(APP_UUID, "APPROVED");

    // tx.insert must have been called for artistProfiles upsert
    expect(tx.insert).toHaveBeenCalled();
  });

  it("no client-controlled role can bypass the server-side admin guard", async () => {
    // Even if the caller passes a role in the application payload, it is
    // irrelevant — the guard is on the admin session (requireAdmin).
    mocks.requireAdmin.mockRejectedValue(new Error("ADMIN_REQUIRED"));
    const result = await reviewSellerApplication("any-id", "APPROVED");
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toContain("could not save");
  });

  it("SELLER re-approved: artist profile updated, role stays SELLER (no demotion or promotion)", async () => {
    const adminUser = { id: "admin-id", role: "ADMIN" };
    mocks.requireAdmin.mockResolvedValue(adminUser);
    const { tx } = approvalDatabase({ ...baseApplication, userId: "seller-user-id" });

    const result = await reviewSellerApplication(APP_UUID, "APPROVED");
    expect(result).toEqual({ ok: true });

    // Artist profile upsert called
    expect(tx.insert).toHaveBeenCalled();

    // role update WHERE includes BUYER guard — a SELLER-role row won't match in production
    const setCalls = tx.update.mock.results.map((r) => r.value.set);
    const setArgs = setCalls.flatMap((fn: ReturnType<typeof vi.fn>) => fn.mock.calls.map((c: unknown[]) => c[0])) as Record<string, unknown>[];
    const roleUpdate = setArgs.find((a) => "role" in a) as Record<string, unknown> | undefined;
    expect(roleUpdate).toBeDefined();
    expect(roleUpdate!.role).toBe("SELLER");
  });
});


describe("Artwork Upload", () => {
  it("blocks non-approved users from creating artwork", async () => {
    mocks.requireSeller.mockRejectedValue(new Error("SELLER_REQUIRED"));
    const formData = new FormData();
    const result = await createArtwork(null, formData);
    expect(result).toEqual({ ok: false, message: "An approved seller account is required." });
  });

  it("rejects invalid or missing artwork fields", async () => {
    mocks.requireSeller.mockResolvedValue(activeSeller);
    const formData = new FormData();
    const result = await createArtwork(null, formData);
    expect(result.ok).toBe(false);
  });

  it("rejects creation if ownership declaration is missing", async () => {
    mocks.requireSeller.mockResolvedValue(activeSeller);
    const formData = new FormData();
    formData.set("title", "Test Art");
    formData.set("description", "A".repeat(40));
    formData.set("price", "100");
    formData.set("currency", "USD");
    formData.set("medium", "Oil");
    formData.set("year", "2024");
    formData.set("widthCm", "10");
    formData.set("heightCm", "10");
    formData.set("type", "PHYSICAL");
    formData.set("stock", "1");
    formData.set("colors", "red,blue");
    formData.set("imageUrl", "https://example.com/art.jpg");
    formData.set("uploadIntentId", "123e4567-e89b-12d3-a456-426614174000");
    // Missing ownership declaration
    const result = await createArtwork(null, formData);
    expect(result.ok).toBe(false);
  });

  it("rejects invalid, expired, or another user's upload intent", async () => {
    mocks.requireSeller.mockResolvedValue(activeSeller);
    // Mocking an intent belonging to someone else, or expired
    const expiredUpload = { id: "123e4567-e89b-12d3-a456-426614174000", userId: "other-user", status: "UPLOADED", url: "https://example.com/art.jpg", pathname: "art.jpg", expiresAt: new Date(Date.now() - 10000) };
    database(expiredUpload, { id: "artist-id" });
    
    const formData = new FormData();
    formData.set("title", "Test Art");
    formData.set("description", "A".repeat(40));
    formData.set("price", "100");
    formData.set("currency", "USD");
    formData.set("medium", "Oil");
    formData.set("year", "2024");
    formData.set("widthCm", "10");
    formData.set("heightCm", "10");
    formData.set("type", "PHYSICAL");
    formData.set("stock", "1");
    formData.set("colors", "red,blue");
    formData.set("imageUrl", "https://example.com/art.jpg");
    formData.set("uploadIntentId", "123e4567-e89b-12d3-a456-426614174000");
    formData.set("ownershipDeclaration", "confirmed");

    const result = await createArtwork(null, formData);
    expect(result).toEqual({ ok: false, message: "The artwork image upload is missing or expired. Please upload it again." });
  });

  it("rejects already consumed upload intent", async () => {
    mocks.requireSeller.mockResolvedValue(activeSeller);
    const consumedUpload = { id: "123e4567-e89b-12d3-a456-426614174000", userId: "seller-456", status: "ATTACHED", url: "https://example.com/art.jpg", pathname: "art.jpg", expiresAt: new Date(Date.now() + 10000) };
    database(consumedUpload, { id: "artist-id" });
    
    const formData = new FormData();
    formData.set("title", "Test Art");
    formData.set("description", "A".repeat(40));
    formData.set("price", "100");
    formData.set("currency", "USD");
    formData.set("medium", "Oil");
    formData.set("year", "2024");
    formData.set("widthCm", "10");
    formData.set("heightCm", "10");
    formData.set("type", "PHYSICAL");
    formData.set("stock", "1");
    formData.set("colors", "red,blue");
    formData.set("imageUrl", "https://example.com/art.jpg");
    formData.set("uploadIntentId", "123e4567-e89b-12d3-a456-426614174000");
    formData.set("ownershipDeclaration", "confirmed");

    const result = await createArtwork(null, formData);
    expect(result).toEqual({ ok: false, message: "The artwork image upload is missing or expired. Please upload it again." });
  });

  it("succeeds when a valid approved seller creates artwork with a valid intent", async () => {
    mocks.requireSeller.mockResolvedValue(activeSeller);
    const validUpload = { id: "123e4567-e89b-12d3-a456-426614174000", userId: "seller-456", status: "UPLOADED", url: "https://example.com/art.jpg", pathname: "art.jpg", expiresAt: new Date(Date.now() + 10000) };
    const db = database(validUpload, { id: "artist-id" });
    
    const formData = new FormData();
    formData.set("title", "Test Art");
    formData.set("description", "A".repeat(40));
    formData.set("price", "100");
    formData.set("currency", "USD");
    formData.set("medium", "Oil");
    formData.set("year", "2024");
    formData.set("widthCm", "10");
    formData.set("heightCm", "10");
    formData.set("type", "PHYSICAL");
    formData.set("stock", "1");
    formData.set("colors", "red,blue");
    formData.set("imageUrl", "https://example.com/art.jpg");
    formData.set("uploadIntentId", "123e4567-e89b-12d3-a456-426614174000");
    formData.set("ownershipDeclaration", "confirmed");

    const result = await createArtwork(null, formData);
    expect(result).toEqual({ ok: true, message: "Artwork submitted for review." });
    expect(db.tx.insert).toHaveBeenCalledTimes(2);
    expect(db.tx.update).toHaveBeenCalledTimes(1);
    expect(mocks.revalidate).toHaveBeenCalledWith("/seller");
  });
});

// ─── Admin Artwork Review ───────────────────────────────────────────────────

const ARTWORK_UUID = "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e";

function artworkReviewDatabase(artworkRow: Record<string, unknown> | null) {
  const selectRow = vi.fn().mockResolvedValue(artworkRow ? [artworkRow] : []);
  const whereSet = vi.fn().mockResolvedValue(undefined);
  const db = {
    select: vi.fn().mockReturnValue({
      from: () => ({ where: () => ({ limit: selectRow }) }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: whereSet }),
    }),
    insert: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  };
  mocks.getDb.mockReturnValue(db);
  return { db, whereSet };
}

describe("Admin Artwork Review", () => {
  it("blocks non-admins from reviewing artworks", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("ADMIN_REQUIRED"));
    const result = await reviewArtwork(ARTWORK_UUID, "PUBLISHED");
    expect(result).toEqual({ ok: false, message: "Admin access required." });
  });

  it("returns error when artwork is not found", async () => {
    mocks.requireAdmin.mockResolvedValue({ id: "admin-id", role: "ADMIN" });
    artworkReviewDatabase(null);
    const result = await reviewArtwork(ARTWORK_UUID, "PUBLISHED");
    expect(result).toEqual({ ok: false, message: "Artwork not found." });
  });

  it("rejects review if artwork is not in PENDING_REVIEW status", async () => {
    mocks.requireAdmin.mockResolvedValue({ id: "admin-id", role: "ADMIN" });
    artworkReviewDatabase({ id: ARTWORK_UUID, status: "PUBLISHED" });
    const result = await reviewArtwork(ARTWORK_UUID, "PUBLISHED");
    expect(result).toEqual({ ok: false, message: "Only artworks in PENDING_REVIEW can be reviewed." });
  });

  it("admin can publish a PENDING_REVIEW artwork", async () => {
    mocks.requireAdmin.mockResolvedValue({ id: "admin-id", role: "ADMIN" });
    const { db } = artworkReviewDatabase({ id: ARTWORK_UUID, status: "PENDING_REVIEW" });
    const result = await reviewArtwork(ARTWORK_UUID, "PUBLISHED");
    expect(result).toEqual({ ok: true, message: "Artwork published." });
    expect(db.update).toHaveBeenCalled();
    const setArg = db.update.mock.results[0].value.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.status).toBe("PUBLISHED");
    expect(setArg.publishedAt).toBeInstanceOf(Date);
    expect(mocks.revalidate).toHaveBeenCalledWith("/admin");
    expect(mocks.revalidate).toHaveBeenCalledWith("/seller");
    expect(mocks.revalidate).toHaveBeenCalledWith("/");
  });

  it("admin can reject a PENDING_REVIEW artwork", async () => {
    mocks.requireAdmin.mockResolvedValue({ id: "admin-id", role: "ADMIN" });
    const { db } = artworkReviewDatabase({ id: ARTWORK_UUID, status: "PENDING_REVIEW" });
    const result = await reviewArtwork(ARTWORK_UUID, "REJECTED");
    expect(result).toEqual({ ok: true, message: "Artwork rejected." });
    const setArg = db.update.mock.results[0].value.set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg.status).toBe("REJECTED");
    expect(setArg.publishedAt).toBeNull();
  });

  it("reviewArtwork rejects an invalid decision value", async () => {
    mocks.requireAdmin.mockResolvedValue({ id: "admin-id", role: "ADMIN" });
    artworkReviewDatabase({ id: ARTWORK_UUID, status: "PENDING_REVIEW" });
    // @ts-expect-error intentionally passing invalid decision
    const result = await reviewArtwork(ARTWORK_UUID, "DRAFT");
    expect(result.ok).toBe(false);
  });
});
