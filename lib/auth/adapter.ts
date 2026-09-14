import type { Adapter, AdapterUser } from "next-auth/adapters";
import { normalizeEmail } from "../identity/rules";

type AdapterUserLookup = (normalizedEmail: string) => Promise<AdapterUser[]>;
type AuthEmailConflictCheck = (normalizedEmail: string, userId?: string) => Promise<boolean>;

export function withNormalizedAuthEmails(
  base: Adapter,
  findUsersByNormalizedEmail: AdapterUserLookup,
  conflictsWithVerifiedContact: AuthEmailConflictCheck = async () => false,
): Adapter {
  return {
    ...base,
    async createUser(user) {
      if (!base.createUser) throw new Error("AUTH_ADAPTER_CREATE_USER_UNAVAILABLE");
      const email = normalizeEmail(user.email);
      if (await conflictsWithVerifiedContact(email, user.id)) throw new Error("AUTH_IDENTITY_CONFLICT");
      return base.createUser({ ...user, email });
    },
    async getUserByEmail(email) {
      const matches = await findUsersByNormalizedEmail(normalizeEmail(email));
      if (matches.length > 1) throw new Error("AUTH_IDENTITY_CONFLICT");
      return matches[0] ?? null;
    },
    async updateUser(user) {
      if (!base.updateUser) throw new Error("AUTH_ADAPTER_UPDATE_USER_UNAVAILABLE");
      const email = user.email !== undefined ? normalizeEmail(user.email) : undefined;
      if (email && await conflictsWithVerifiedContact(email, user.id)) throw new Error("AUTH_IDENTITY_CONFLICT");
      return base.updateUser({
        ...user,
        ...(email !== undefined ? { email } : {}),
      });
    },
  };
}
