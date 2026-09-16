import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { users, verificationEvents } from "../../db/schema";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getDb: vi.fn(),
  rateLimit: vi.fn(),
  dimensions: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/db", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/security/server-actions", () => ({
  enforceServerActionRateLimit: mocks.rateLimit,
  enforceServerActionRateLimitDimensions: mocks.dimensions,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/email/provider", () => ({ getVerificationEmailProvider: vi.fn() }));

import { removeContactEmail } from "../../lib/email-verification/service";
import { removeContactEmailAction } from "../../app/actions/email-verification";

const now = new Date("2026-09-16T10:00:00Z");
const active = { id: "owner", accountStatus: "ACTIVE", disabled: false };
const dialect = new PgDialect();
const query = (condition: SQL) => dialect.sqlToQuery(condition);

function database(identity: typeof active | undefined = active) {
  const lock = vi.fn().mockResolvedValue(identity ? [identity] : []);
  const selectWhere = vi.fn().mockReturnValue({ limit: () => ({ for: lock }) });
  const userWhere = vi.fn().mockResolvedValue(undefined);
  const eventWhere = vi.fn().mockResolvedValue(undefined);
  const userSet = vi.fn().mockReturnValue({ where: userWhere });
  const eventSet = vi.fn().mockReturnValue({ where: eventWhere });
  const tx = {
    select: vi.fn().mockReturnValue({ from: () => ({ where: selectWhere }) }),
    update: vi.fn((table) => ({ set: table === users ? userSet : eventSet })),
  };
  const transaction = vi.fn(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx));
  mocks.getDb.mockReturnValue({ transaction });
  return { ...tx, transaction, lock, selectWhere, userWhere, eventWhere, userSet, eventSet };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: active });
});

describe("contact email removal transaction", () => {
  it("locks only the owner and clears exactly the contact fields plus updatedAt", async () => {
    const db = database();
    await expect(removeContactEmail("owner", now)).resolves.toEqual({ status: "REMOVED" });
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(db.lock).toHaveBeenCalledWith("update");
    expect(query(db.selectWhere.mock.calls[0][0]).params).toEqual(["owner"]);
    expect(db.userSet).toHaveBeenCalledExactlyOnceWith({ contactEmail: null, contactEmailVerifiedAt: null, updatedAt: now });
    expect(query(db.userWhere.mock.calls[0][0])).toMatchObject({ sql: '"users"."id" = $1', params: ["owner"] });
    expect(db.update.mock.calls.map(([table]) => table)).toEqual([users, verificationEvents]);
    expect(db.eventSet).toHaveBeenCalledExactlyOnceWith({ status: "CANCELLED", consumedAt: now });
    const cancellation = query(db.eventWhere.mock.calls[0][0]);
    expect(cancellation.params).toEqual(["owner", "EMAIL", "CHANGE_CONTACT", "PENDING"]);
    expect(cancellation.sql).toContain('"verification_events"."user_id" = $1');
    expect(db.lock.mock.invocationCallOrder[0]).toBeLessThan(db.userSet.mock.invocationCallOrder[0]);
  });

  it.each(["SUSPENDED", "DISABLED", "PENDING_DELETION"])("rejects a persisted %s account even with an ACTIVE session", async (accountStatus) => {
    const db = database({ ...active, accountStatus });
    expect((await removeContactEmailAction()).status).toBe("error");
    expect(db.update).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("rejects the persisted disabled flag", async () => {
    const db = database({ ...active, disabled: true });
    expect((await removeContactEmail("owner")).status).toBe("ACCOUNT_UNAVAILABLE");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects a deleted or missing identity", async () => {
    const db = database();
    db.lock.mockResolvedValue([]);
    expect((await removeContactEmail("owner")).status).toBe("ACCOUNT_UNAVAILABLE");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("safely repeats removal when no contact email remains", async () => {
    const db = database();
    await removeContactEmail("owner", now);
    await expect(removeContactEmail("owner", now)).resolves.toEqual({ status: "REMOVED" });
    expect(db.userSet).toHaveBeenCalledTimes(2);
    expect(db.userSet.mock.calls[1][0]).toEqual({ contactEmail: null, contactEmailVerifiedAt: null, updatedAt: now });
  });
});

describe("contact email removal server action", () => {
  it.each([
    null,
    { user: {} },
    ...["SUSPENDED", "DISABLED", "PENDING_DELETION"].map((accountStatus) => ({ user: { ...active, accountStatus } })),
    { user: { ...active, disabled: true } },
  ])("rejects an unauthorized session %# before database access", async (session) => {
    mocks.auth.mockResolvedValue(session);
    expect(await removeContactEmailAction()).toEqual({ status: "error", message: "Sign in again to continue." });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("uses only the authenticated ID, ignoring forged action arguments", async () => {
    const db = database();
    const forged = new FormData();
    forged.set("userId", "victim");
    forged.set("email", "victim@example.com");
    const call = removeContactEmailAction as (...args: unknown[]) => ReturnType<typeof removeContactEmailAction>;
    expect((await call({ userId: "victim" }, forged)).status).toBe("removed");
    expect(query(db.userWhere.mock.calls[0][0]).params).toEqual(["owner"]);
    expect(mocks.rateLimit).toHaveBeenCalledWith("authenticated-write", "owner");
    expect(mocks.dimensions).toHaveBeenCalledWith("contact-email-remove", expect.arrayContaining([
      expect.objectContaining({ name: "user", key: "owner" }),
      expect.objectContaining({ name: "ip" }),
    ]));
    expect(mocks.revalidate).toHaveBeenCalledExactlyOnceWith("/account");
  });

  it("does not mutate when rate limited", async () => {
    mocks.dimensions.mockRejectedValue(new Error("RATE_LIMITED"));
    expect(await removeContactEmailAction()).toEqual({ status: "error", message: "Please wait before trying again." });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("propagates cancellation failure out of the transaction and returns a safe error", async () => {
    const db = database();
    db.eventWhere.mockRejectedValue(new Error("private database detail"));
    const result = await removeContactEmailAction();
    expect(result.status).toBe("error");
    expect(result.message).not.toContain("private database detail");
    await expect(db.transaction.mock.results[0].value).rejects.toThrow("private database detail");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
