import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getDb, hasDatabase } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "development" ? "giggle-gallery-local-development-only-secret" : undefined),
  adapter: hasDatabase()
    ? DrizzleAdapter(getDb(), { usersTable: users, accountsTable: accounts, sessionsTable: sessions, verificationTokensTable: verificationTokens })
    : undefined,
  providers: [Google({ allowDangerousEmailAccountLinking: false })],
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  trustHost: true,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google" && profile && profile.email_verified !== true) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (token.sub && hasDatabase()) {
        const [record] = await getDb().select({ role: users.role, accountStatus: users.accountStatus, disabled: users.disabled }).from(users).where(eq(users.id, token.sub)).limit(1);
        token.role = record?.role ?? "BUYER";
        token.accountStatus = record?.accountStatus ?? "DISABLED";
        token.disabled = !record || record.disabled || record.accountStatus !== "ACTIVE";
      } else {
        token.accountStatus ??= "ACTIVE";
        token.disabled ??= false;
      }
      return token;
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
    authorized({ auth: session, request }) {
      const path = request.nextUrl.pathname;
      const protectedRoute = ["/account", "/checkout", "/collections", "/orders", "/sell", "/seller", "/admin"].some((prefix) => path.startsWith(prefix));
      if (!protectedRoute) return true;
      if (!session?.user || session.user.disabled || session.user.accountStatus !== "ACTIVE") return false;
      if (path.startsWith("/admin")) return session.user.role === "ADMIN";
      return true;
    },
  },
});
