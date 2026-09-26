import { normalizeEmail } from "../identity/rules";

export type UserRole = "BUYER" | "SELLER" | "ADMIN";
export type UserAccountStatus = "ACTIVE" | "SUSPENDED" | "DISABLED" | "PENDING_DELETION";

export type AuthIdentity = {
  id: string;
  email: string;
  emailVerified: Date | null;
  role: UserRole;
  accountStatus: UserAccountStatus;
  disabled: boolean;
};

type AuthAccount = { provider?: string | null } | null | undefined;
type GoogleProfile = { email?: string | null; email_verified?: boolean | null } | null | undefined;
type ExistingAuthUser = Partial<Pick<AuthIdentity, "accountStatus" | "disabled">>;
type SessionTokenClaims = {
  sub?: string;
  role?: UserRole;
  accountStatus?: UserAccountStatus;
  disabled?: boolean;
};

export function isVerifiedGoogleProfile(account: AuthAccount, profile: GoogleProfile): boolean {
  return account?.provider === "google" && profile?.email_verified === true && Boolean(profile.email);
}

export function isActiveIdentity<T extends Pick<AuthIdentity, "accountStatus" | "disabled">>(
  identity: T | null | undefined,
): identity is T & { accountStatus: "ACTIVE"; disabled: false } {
  return Boolean(identity && !identity.disabled && identity.accountStatus === "ACTIVE");
}

export function existingUserCanSignIn(user: unknown): boolean {
  if (!user || typeof user !== "object") return true;
  const existing = user as ExistingAuthUser;
  if (existing.accountStatus === undefined && existing.disabled === undefined) return true;
  return existing.accountStatus === "ACTIVE" && existing.disabled === false;
}

export function shouldPersistGoogleEmailVerification(
  account: AuthAccount,
  profile: GoogleProfile,
  identity: Pick<AuthIdentity, "email" | "emailVerified">,
): profile is { email: string; email_verified: true } {
  if (account?.provider !== "google" || profile?.email_verified !== true || !profile.email || identity.emailVerified) return false;
  return normalizeEmail(profile.email) === normalizeEmail(identity.email);
}

export function applyIdentityToToken<T extends SessionTokenClaims>(token: T, identity: AuthIdentity | null | undefined): T | null {
  if (!isActiveIdentity(identity)) return null;
  token.sub = identity.id;
  token.role = identity.role;
  token.accountStatus = identity.accountStatus;
  token.disabled = false;
  return token;
}

const protectedPrefixes = ["/account", "/checkout", "/collections", "/favorites", "/following", "/notifications", "/orders", "/settings", "/auctions/won", "/sell", "/seller", "/admin"];

function isPathOrChild(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function authorizePath(path: string, user: Pick<AuthIdentity, "role" | "accountStatus" | "disabled"> | null | undefined): boolean {
  if (!protectedPrefixes.some((prefix) => isPathOrChild(path, prefix))) return true;
  if (!isActiveIdentity(user)) return false;
  if (isPathOrChild(path, "/admin")) return user.role === "ADMIN";
  if (isPathOrChild(path, "/seller/artworks")) return user.role === "SELLER" || user.role === "ADMIN";
  return true;
}

export function safeRedirectUrl(url: string, baseUrl: string, configuredUrl?: string): string {
  const canonical = new URL("/", configuredUrl ?? baseUrl);
  try {
    const requested = new URL(url, canonical);
    const safeProtocol = requested.protocol === "https:" || requested.protocol === "http:";
    const hasCredentials = Boolean(requested.username || requested.password);
    return safeProtocol && !hasCredentials && requested.origin === canonical.origin
      ? requested.toString()
      : canonical.toString();
  } catch {
    return canonical.toString();
  }
}

const authErrorMessages: Record<string, string> = {
  Configuration: "Google sign-in is temporarily unavailable. Please try again shortly.",
  AccessDenied: "This account is not permitted to sign in.",
  OAuthAccountNotLinked: "An account already exists for this email. Sign in with its original method before linking Google.",
  "google-email-unverified": "Google must verify your email address before you can sign in.",
  "account-unavailable": "This account is currently unavailable. Contact support if you think this is a mistake.",
};

export function authErrorMessage(code?: string): string | null {
  if (!code) return null;
  return authErrorMessages[code] ?? "We could not complete sign-in. Please try again.";
}
