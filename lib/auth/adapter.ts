import type { Adapter, AdapterUser } from "next-auth/adapters";
import { normalizeEmail } from "../identity/rules";

type AdapterUserLookup = (normalizedEmail: string) => Promise<AdapterUser[]>;

export function withNormalizedAuthEmails(base: Adapter, findUsersByNormalizedEmail: AdapterUserLookup): Adapter {
  return {
    ...base,
    async createUser(user) {
      if (!base.createUser) throw new Error("AUTH_ADAPTER_CREATE_USER_UNAVAILABLE");
      return base.createUser({ ...user, email: normalizeEmail(user.email) });
    },
    async getUserByEmail(email) {
      const matches = await findUsersByNormalizedEmail(normalizeEmail(email));
      if (matches.length > 1) throw new Error("AUTH_IDENTITY_CONFLICT");
      return matches[0] ?? null;
    },
    async updateUser(user) {
      if (!base.updateUser) throw new Error("AUTH_ADAPTER_UPDATE_USER_UNAVAILABLE");
      return base.updateUser({
        ...user,
        ...(user.email !== undefined ? { email: normalizeEmail(user.email) } : {}),
      });
    },
  };
}
