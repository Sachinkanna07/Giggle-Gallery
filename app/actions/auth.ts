"use server";

import { signIn, signOut } from "@/auth";
import { enforceServerActionRateLimit } from "@/lib/security/server-actions";

export async function signInWithGoogle() {
  await enforceServerActionRateLimit("auth-entry", "anonymous", 10, 60_000);
  await signIn("google", { redirectTo: "/" });
}

export async function signOutUser() {
  await signOut({ redirectTo: "/" });
}
