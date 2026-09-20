import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getDb: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/authz", () => ({
  requireUser: mocks.requireUser,
  requireSeller: vi.fn(),
  requireAdmin: vi.fn(),
}));
vi.mock("@/db", () => ({ getDb: mocks.getDb }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/blob-validation", () => ({
  isApprovedArtworkBlobUrl: () => true,
}));

import { toggleSave } from "../../app/actions/marketplace";

const ARTWORK_UUID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("wishlist ownership", () => {
  it("requires an authenticated user", async () => {
    mocks.requireUser.mockRejectedValue(new Error("AUTH_REQUIRED"));

    await expect(toggleSave(ARTWORK_UUID)).resolves.toEqual({
      ok: false,
      error: "Sign in with Google to continue.",
    });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("stores the authenticated owner instead of client identity", async () => {
    mocks.requireUser.mockResolvedValue({ id: "viewer-123", role: "BUYER" });
    const values = vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) });
    mocks.getDb.mockReturnValue({
      select: vi.fn().mockReturnValue({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
      }),
      insert: vi.fn().mockReturnValue({ values }),
    });

    await expect(toggleSave(ARTWORK_UUID)).resolves.toEqual({ ok: true, active: true });
    expect(values).toHaveBeenCalledWith({ userId: "viewer-123", artworkId: ARTWORK_UUID });
    expect(mocks.revalidate).toHaveBeenCalledWith("/collections");
  });
});
