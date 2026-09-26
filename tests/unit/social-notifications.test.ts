import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { artistProfiles, follows } from "@/db/schema";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), getDb: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/authz", () => ({ requireUser: mocks.requireUser, requireSeller: vi.fn(), requireAdmin: vi.fn() }));
vi.mock("@/db", () => ({ getDb: mocks.getDb }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/blob-validation", () => ({ isApprovedArtworkBlobUrl: vi.fn() }));

import { setArtistFollowing } from "../../app/actions/marketplace";
import { markAllNotificationsRead, markNotificationRead } from "../../app/actions/notifications";

const artistId = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const notificationId = "b1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const dialect = new PgDialect();
const query = (condition: SQL) => dialect.sqlToQuery(condition);

beforeEach(() => { vi.resetAllMocks(); mocks.requireUser.mockResolvedValue({ id: "buyer-1" }); });

describe("artist following", () => {
  function database(ownerId = "seller-1") {
    let following = false;
    let followerCount = 0;
    const onConflictDoNothing = vi.fn(async () => { if (!following) { following = true; followerCount += 1; } });
    const values = vi.fn().mockReturnValue({ onConflictDoNothing });
    const where = vi.fn(async (condition: SQL) => { void condition; if (following) { following = false; followerCount -= 1; } });
    mocks.getDb.mockReturnValue({
      select: vi.fn().mockReturnValue({ from: (table: unknown) => ({ where: () => {
        if (table === artistProfiles) return { limit: () => Promise.resolve([{ userId: ownerId, slug: "artist" }]) };
        if (table === follows) {
          const rows = Promise.resolve([{ value: followerCount }]) as Promise<Array<{ value: number }>> & { limit: () => Promise<Array<{ artistId: string }>> };
          rows.limit = () => Promise.resolve(following ? [{ artistId }] : []);
          return rows;
        }
        throw new Error("Unexpected table");
      } }) }),
      insert: vi.fn().mockReturnValue({ values }),
      delete: vi.fn().mockReturnValue({ where }),
    });
    return { values, where, onConflictDoNothing, state: () => ({ following, followerCount }) };
  }

  it("inserts only the signed-in follower and uses conflict-safe repeat follows", async () => {
    const db = database();
    expect(await setArtistFollowing(artistId, true)).toEqual({ ok: true, active: true, count: 1 });
    expect(await setArtistFollowing(artistId, true)).toEqual({ ok: true, active: true, count: 1 });
    expect(db.values).toHaveBeenCalledWith({ followerId: "buyer-1", artistId });
    expect(db.state()).toEqual({ following: true, followerCount: 1 });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/artist/artist");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/following");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });

  it("unfollows only the signed-in user's pair", async () => {
    const db = database();
    await setArtistFollowing(artistId, true);
    expect(await setArtistFollowing(artistId, false)).toEqual({ ok: true, active: false, count: 0 });
    const condition = db.where.mock.calls[0][0] as SQL;
    expect(query(condition).params).toEqual(["buyer-1", artistId]);
  });

  it("rejects self-follow and unauthenticated follow", async () => {
    database("buyer-1");
    expect(await setArtistFollowing(artistId, true)).toEqual({ ok: false, error: "You cannot follow your own artist profile." });
    mocks.requireUser.mockRejectedValueOnce(new Error("AUTH_REQUIRED"));
    expect(await setArtistFollowing(artistId, true)).toEqual({ ok: false, error: "Sign in with Google to continue." });
  });

  it("following page selects only public artist fields scoped to the signed-in follower", () => {
    const page = readFileSync("app/following/page.tsx", "utf8");
    expect(page).toContain("eq(follows.followerId, session.user.id)");
    expect(page).toContain("publishedWorkCount");
    expect(page).toContain("followerCount");
    expect(page).not.toMatch(/users\.email|phoneE164|contactEmail|payoutReference/);
  });
});

describe("notification ownership", () => {
  function database() {
    const where = vi.fn().mockResolvedValue(undefined);
    mocks.getDb.mockReturnValue({ update: vi.fn().mockReturnValue({ set: () => ({ where }) }) });
    return where;
  }

  it("scopes one read to both notification and authenticated owner", async () => {
    const where = database();
    expect(await markNotificationRead(notificationId)).toEqual({ ok: true });
    expect(query(where.mock.calls[0][0] as SQL).params).toEqual([notificationId, "buyer-1"]);
  });

  it("scopes mark-all to the authenticated owner", async () => {
    const where = database();
    expect(await markAllNotificationsRead()).toEqual({ ok: true });
    expect(query(where.mock.calls[0][0] as SQL).params).toEqual(["buyer-1"]);
  });

  it("never queries the database without an authenticated user", async () => {
    mocks.requireUser.mockRejectedValue(new Error("AUTH_REQUIRED"));
    expect(await markNotificationRead(notificationId)).toMatchObject({ ok: false });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
