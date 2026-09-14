import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getDb, hasDatabase } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { withNormalizedAuthEmails } from "@/lib/auth/adapter";
import {
  authorizePath,
  applyIdentityToToken,
  existingUserCanSignIn,
  isActiveIdentity,
  isVerifiedGoogleProfile,
  safeRedirectUrl,
  shouldPersistGoogleEmailVerification,
} from "@/lib/auth/policy";
import { normalizeEmail } from "@/lib/identity/rules";

const adapter = hasDatabase()
  ? withNormalizedAuthEmails(
      DrizzleAdapter(getDb(), { usersTable: users, accountsTable: accounts, sessionsTable: sessions, verificationTokensTable: verificationTokens }),
      async (normalizedEmail) => getDb().select().from(users).where(sql`lower(${users.email}) = ${normalizedEmail}`).limit(2),
      async (normalizedEmail, userId) => {
        const [conflict] = await getDb().select({ id: users.id }).from(users).where(and(
          isNotNull(users.contactEmailVerifiedAt),
          sql`lower(${users.contactEmail}) = ${normalizedEmail}`,
          ...(userId ? [ne(users.id, userId)] : []),
        )).limit(1);
        return Boolean(conflict);
      },
    )
  : undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "development" ? "giggle-gallery-local-development-only-secret" : undefined),
  adapter,
  providers: [Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
    allowDangerousEmailAccountLinking: false,
  })],
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in", error: "/sign-in" },
  trustHost: true,
  callbacks: {
    async signIn({ account, profile, user }) {
      if (!isVerifiedGoogleProfile(account, profile)) return "/sign-in?error=google-email-unverified";
      if (!existingUserCanSignIn(user)) return "/sign-in?error=account-unavailable";
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user?.id) token.sub = user.id;
      if (!token.sub || !hasDatabase()) return null;

      const [record] = await getDb().select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        role: users.role,
        accountStatus: users.accountStatus,
        disabled: users.disabled,
      }).from(users).where(eq(users.id, token.sub)).limit(1);
      if (!isActiveIdentity(record)) return null;

      if (shouldPersistGoogleEmailVerification(account, profile, record)) {
        const verifiedAt = new Date();
        await getDb().update(users).set({ emailVerified: verifiedAt, updatedAt: verifiedAt }).where(and(
          eq(users.id, record.id),
          isNull(users.emailVerified),
          sql`lower(${users.email}) = ${normalizeEmail(profile.email)}`,
        ));
      }
      return applyIdentityToToken(token, record);
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as "BUYER" | "SELLER" | "ADMIN") ?? "BUYER";
        session.user.accountStatus = token.accountStatus ?? "ACTIVE";
        session.user.disabled = Boolean(token.disabled);
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      return safeRedirectUrl(url, baseUrl, process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL);
    },
    authorized({ auth: session, request }) {
      return authorizePath(request.nextUrl.pathname, session?.user);
    },
  },
});
