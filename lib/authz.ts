import "server-only";

import { auth } from "@/auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id || session.user.disabled) throw new Error("AUTH_REQUIRED");
  return session.user;
}

export async function requireSeller() {
  const user = await requireUser();
  if (user.role !== "SELLER" && user.role !== "ADMIN") throw new Error("SELLER_REQUIRED");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("ADMIN_REQUIRED");
  return user;
}
