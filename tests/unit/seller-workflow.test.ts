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

import { createArtwork, reviewSellerApplication, submitSellerApplication } from "../../app/actions/marketplace";

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
