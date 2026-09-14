import { getTableConfig } from "drizzle-orm/pg-core";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import { describe, expect, it, vi } from "vitest";
import { accounts, users } from "../../db/schema";
import { withNormalizedAuthEmails } from "../../lib/auth/adapter";
import {
  applyIdentityToToken,
  authErrorMessage,
  authorizePath,
  existingUserCanSignIn,
  isVerifiedGoogleProfile,
  safeRedirectUrl,
  shouldPersistGoogleEmailVerification,
  type AuthIdentity,
} from "../../lib/auth/policy";
import { evaluateProviderLink, hasVerifiedEmailConflict } from "../../lib/identity/rules";

const activeBuyer: AuthIdentity = {
  id: "user-1",
  email: "collector@example.com",
  emailVerified: new Date("2026-09-14T00:00:00Z"),
  role: "BUYER",
  accountStatus: "ACTIVE",
  disabled: false,
};

describe("Google OAuth identity policy", () => {
  it("accepts a verified Google email", () => {
    expect(isVerifiedGoogleProfile({ provider: "google" }, { email: "collector@example.com", email_verified: true })).toBe(true);
  });

  it("rejects an unverified Google email", () => {
    expect(isVerifiedGoogleProfile({ provider: "google" }, { email: "collector@example.com", email_verified: false })).toBe(false);
  });

  it("rejects a Google profile with no email", () => {
    expect(isVerifiedGoogleProfile({ provider: "google" }, { email_verified: true })).toBe(false);
  });

  it("fails closed for an unexpected or missing provider", () => {
    expect(isVerifiedGoogleProfile({ provider: "github" }, { email: "collector@example.com", email_verified: true })).toBe(false);
    expect(isVerifiedGoogleProfile(null, { email: "collector@example.com", email_verified: true })).toBe(false);
  });

  it("normalizes a first-time Google user's email while preserving database-controlled defaults", async () => {
    const createUser = vi.fn(async (user: AdapterUser) => user);
    const adapter = withNormalizedAuthEmails({ createUser } satisfies Adapter, async () => []);
    const created = await adapter.createUser!({
      id: "new-user",
      name: "Collector",
      email: " Collector@EXAMPLE.COM ",
      emailVerified: null,
      image: null,
    });
    expect(created.email).toBe("collector@example.com");
    expect(users.role.default).toBe("BUYER");
    expect(users.accountStatus.default).toBe("ACTIVE");
    expect(users.disabled.default).toBe(false);
  });

  it("loads an existing Google account session from database identity", () => {
    expect(applyIdentityToToken({ sub: "provider-controlled", role: "ADMIN" }, activeBuyer)).toMatchObject({
      sub: "user-1",
      role: "BUYER",
      accountStatus: "ACTIVE",
      disabled: false,
    });
  });

  it("prevents duplicate provider accounts with the installed adapter's composite key", () => {
    const primaryKey = getTableConfig(accounts).primaryKeys[0];
    expect(primaryKey.columns.map((column) => column.name)).toEqual(["provider", "provider_account_id"]);
    expect(evaluateProviderLink({
      targetUserId: "user-1",
      targetEmail: "collector@example.com",
      targetEmailVerified: true,
      existingAccountUserId: "user-2",
      providerEmail: "collector@example.com",
      providerEmailVerified: true,
      mode: "AUTOMATIC",
      authenticatedTargetUser: false,
      recentAuthentication: false,
    })).toEqual({ allowed: false, reason: "PROVIDER_ACCOUNT_IN_USE" });
  });

  it("protects an existing verified email from duplicate normalized identity creation", () => {
    expect(hasVerifiedEmailConflict([
      { id: "user-1", email: "collector@example.com", emailVerified: new Date() },
      { id: "user-2", email: "ARTIST@example.com", emailVerified: new Date() },
    ], "user-1", "artist@EXAMPLE.COM")).toBe(true);
  });

  it("fails closed if normalized lookup finds ambiguous historical users", async () => {
    const duplicate = { id: "duplicate", email: "collector@example.com", emailVerified: null } as AdapterUser;
    const adapter = withNormalizedAuthEmails({} satisfies Adapter, async () => [duplicate, { ...duplicate, id: "duplicate-2" }]);
    await expect(adapter.getUserByEmail!("Collector@example.com")).rejects.toThrow("AUTH_IDENTITY_CONFLICT");
  });

  it("normalizes case-insensitive email lookups before querying", async () => {
    const lookup = vi.fn(async () => [activeBuyer as AdapterUser]);
    const adapter = withNormalizedAuthEmails({} satisfies Adapter, lookup);
    await expect(adapter.getUserByEmail!(" Collector@EXAMPLE.COM ")).resolves.toMatchObject({ id: "user-1" });
    expect(lookup).toHaveBeenCalledWith("collector@example.com");
  });

  it("normalizes updateUser email values and rejects invalid supplied emails", async () => {
    const updateUser = vi.fn(async (user: AdapterUser) => user);
    const adapter = withNormalizedAuthEmails({ updateUser } satisfies Adapter, async () => []);
    await adapter.updateUser!({ id: "user-1", email: " Collector@EXAMPLE.COM " });
    expect(updateUser).toHaveBeenCalledWith({ id: "user-1", email: "collector@example.com" });
    await expect(adapter.updateUser!({ id: "user-1", email: "" })).rejects.toThrow();
  });

  it("refuses to create or update an auth identity over another verified contact email", async () => {
    const createUser = vi.fn(async (user: AdapterUser) => user);
    const updateUser = vi.fn(async (user: AdapterUser) => user);
    const contactConflict = vi.fn(async (email: string, id?: string) => email === "contact@example.com" && id !== "contact-owner");
    const adapter = withNormalizedAuthEmails({ createUser, updateUser } satisfies Adapter, async () => [], contactConflict);
    await expect(adapter.createUser!({ id: "new-user", email: "CONTACT@example.com", emailVerified: null })).rejects.toThrow("AUTH_IDENTITY_CONFLICT");
    await expect(adapter.updateUser!({ id: "other-user", email: "contact@example.com" })).rejects.toThrow("AUTH_IDENTITY_CONFLICT");
    await expect(adapter.updateUser!({ id: "contact-owner", email: "contact@example.com" })).resolves.toBeTruthy();
  });

  it("marks only the matching trusted Google email for verification after first login", () => {
    const pending = { ...activeBuyer, emailVerified: null };
    expect(shouldPersistGoogleEmailVerification(
      { provider: "google" },
      { email: "COLLECTOR@example.com", email_verified: true },
      pending,
    )).toBe(true);
    expect(shouldPersistGoogleEmailVerification(
      { provider: "google" },
      { email: "attacker@example.com", email_verified: true },
      pending,
    )).toBe(false);
    expect(shouldPersistGoogleEmailVerification(
      { provider: "github" },
      { email: "collector@example.com", email_verified: true },
      pending,
    )).toBe(false);
    expect(shouldPersistGoogleEmailVerification(
      { provider: "google" },
      { email: "collector@example.com", email_verified: true },
      activeBuyer,
    )).toBe(false);
  });
});

describe("JWT and authorization policy", () => {
  it("issues an ACTIVE user session", () => {
    expect(applyIdentityToToken({}, activeBuyer)).toMatchObject({ sub: "user-1", accountStatus: "ACTIVE", disabled: false });
    expect(existingUserCanSignIn(activeBuyer)).toBe(true);
  });

  it("rejects a SUSPENDED user", () => {
    expect(applyIdentityToToken({}, { ...activeBuyer, accountStatus: "SUSPENDED" })).toBeNull();
    expect(existingUserCanSignIn({ accountStatus: "SUSPENDED", disabled: false })).toBe(false);
  });

  it("rejects a DISABLED account status", () => {
    expect(applyIdentityToToken({}, { ...activeBuyer, accountStatus: "DISABLED" })).toBeNull();
  });

  it("rejects a disabled user flag", () => {
    expect(applyIdentityToToken({}, { ...activeBuyer, disabled: true })).toBeNull();
  });

  it("rejects a PENDING_DELETION user", () => {
    expect(applyIdentityToToken({}, { ...activeBuyer, accountStatus: "PENDING_DELETION" })).toBeNull();
  });

  it("fails closed when the database user is missing", () => {
    expect(applyIdentityToToken({}, null)).toBeNull();
  });

  it("does not accept a client or provider supplied role", () => {
    expect(applyIdentityToToken({ role: "ADMIN" }, activeBuyer)?.role).toBe("BUYER");
  });

  it("enforces buyer, seller, and admin protected-route boundaries", () => {
    expect(authorizePath("/account", null)).toBe(false);
    expect(authorizePath("/account", activeBuyer)).toBe(true);
    expect(authorizePath("/seller", activeBuyer)).toBe(true);
    expect(authorizePath("/seller/artworks/new", activeBuyer)).toBe(false);
    expect(authorizePath("/seller/artworks/new", { ...activeBuyer, role: "SELLER" })).toBe(true);
    expect(authorizePath("/admin", { ...activeBuyer, role: "SELLER" })).toBe(false);
    expect(authorizePath("/admin", { ...activeBuyer, role: "ADMIN" })).toBe(true);
    expect(authorizePath("/orders", null)).toBe(false);
    expect(authorizePath("/accounting", null)).toBe(true);
  });

  it("keeps callback and return URLs on the canonical origin", () => {
    const canonical = "https://giggle-gallery-pi.vercel.app";
    expect(safeRedirectUrl("/account", "https://temporary.vercel.app", canonical)).toBe(`${canonical}/account`);
    expect(safeRedirectUrl("https://evil.example/steal", canonical, canonical)).toBe(`${canonical}/`);
    expect(safeRedirectUrl("//evil.example/steal", canonical, canonical)).toBe(`${canonical}/`);
    expect(safeRedirectUrl(`https://user:password@giggle-gallery-pi.vercel.app/account`, canonical, canonical)).toBe(`${canonical}/`);
    expect(safeRedirectUrl(`${canonical}/orders`, canonical, canonical)).toBe(`${canonical}/orders`);
  });

  it.each([
    ["Configuration", "Google sign-in is temporarily unavailable. Please try again shortly."],
    ["AccessDenied", "This account is not permitted to sign in."],
    ["OAuthAccountNotLinked", "An account already exists for this email. Sign in with its original method before linking Google."],
    ["google-email-unverified", "Google must verify your email address before you can sign in."],
    ["account-unavailable", "This account is currently unavailable. Contact support if you think this is a mistake."],
    ["unexpected-provider-detail", "We could not complete sign-in. Please try again."],
  ])("maps auth error %s to a safe message", (code, expected) => {
    expect(authErrorMessage(code)).toBe(expected);
  });
});
