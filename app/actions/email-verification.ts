"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  parseEmailVerificationAttempt,
  parseEmailVerificationCancellation,
  parseEmailVerificationRequest,
} from "@/lib/email-verification/core";
import {
  cancelEmailChallenge,
  requestEmailVerification,
  verifyEmailChallenge,
} from "@/lib/email-verification/service";
import { getVerificationEmailProvider } from "@/lib/email/provider";
import { requireServerEnv } from "@/lib/env";
import { requireUser } from "@/lib/authz";
import { hashDestination } from "@/lib/identity/rules";
import { enforceServerActionRateLimitDimensions } from "@/lib/security/server-actions";

export type EmailVerificationActionState = {
  status: "idle" | "sent" | "verified" | "already_verified" | "cancelled" | "error";
  message: string;
  eventId?: string;
  email?: string;
  cancelledEventId?: string;
};

function formEntries(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

function errorState(message: string, context?: { eventId?: string; email?: string }): EmailVerificationActionState {
  return { status: "error", message, ...context };
}

function safeActionError(error: unknown, fallback: string, context?: { eventId?: string; email?: string }): EmailVerificationActionState {
  if (error instanceof Error && (error.message === "RATE_LIMITED" || error.message === "AUTH_REQUIRED")) {
    return errorState(error.message === "RATE_LIMITED" ? "Please wait before trying again." : "Sign in again to continue.", context);
  }
  if (error instanceof z.ZodError) return errorState("Check the email address or verification code and try again.", context);
  return errorState(fallback, context);
}

export async function requestEmailVerificationAction(
  previousState: EmailVerificationActionState,
  formData: FormData,
): Promise<EmailVerificationActionState> {
  try {
    const user = await requireUser();
    const parsed = parseEmailVerificationRequest(formEntries(formData));
    const destinationHash = hashDestination("EMAIL", parsed.email, requireServerEnv("IDENTITY_HASH_PEPPER"));
    await enforceServerActionRateLimitDimensions("email-verification-request", [
      { name: "user", key: user.id, limit: 5, windowMs: 10 * 60_000 },
      { name: "destination", key: destinationHash, limit: 5, windowMs: 10 * 60_000 },
      { name: "ip", key: "request", limit: 10, windowMs: 10 * 60_000 },
    ]);
    const result = await requestEmailVerification({ userId: user.id, email: parsed.email, provider: getVerificationEmailProvider() });
    if (result.status === "SENT") {
      return { status: "sent", message: "Verification code sent.", eventId: result.eventId, email: result.email };
    }
    if (result.status === "ALREADY_VERIFIED") {
      return { status: "already_verified", message: "This email is already verified.", email: result.email };
    }
    if (result.status === "COOLDOWN") {
      const eventId = previousState.email === result.email ? previousState.eventId : undefined;
      return errorState("Please wait before requesting another code.", { email: result.email, eventId });
    }
    if (result.status === "EMAIL_UNAVAILABLE") return errorState("This email cannot be used.");
    if (result.status === "ACCOUNT_UNAVAILABLE") return errorState("This account cannot request email verification.");
    return errorState("The verification email could not be delivered. Please try again later.");
  } catch (error) {
    return safeActionError(error, "Email verification is temporarily unavailable.");
  }
}

export async function verifyEmailChallengeAction(
  _previousState: EmailVerificationActionState,
  formData: FormData,
): Promise<EmailVerificationActionState> {
  let context: { eventId?: string; email?: string } = {};
  try {
    const user = await requireUser();
    const parsed = parseEmailVerificationAttempt(formEntries(formData));
    context = { eventId: parsed.eventId, email: parsed.email };
    await enforceServerActionRateLimitDimensions("email-verification-attempt", [
      { name: "user", key: user.id, limit: 15, windowMs: 10 * 60_000 },
      { name: "ip", key: "attempt", limit: 30, windowMs: 10 * 60_000 },
    ]);
    const result = await verifyEmailChallenge({ userId: user.id, ...parsed });
    if (result.status === "VERIFIED") {
      revalidatePath("/account");
      return { status: "verified", message: "Email ownership verified.", email: result.email, eventId: parsed.eventId };
    }
    if (result.status === "TOO_MANY_ATTEMPTS") return errorState("Too many attempts. Request a new code.", context);
    if (result.status === "EMAIL_UNAVAILABLE") return errorState("This email cannot be used.", context);
    if (result.status === "ACCOUNT_UNAVAILABLE") return errorState("This account cannot verify an email.", context);
    return errorState("That code is invalid or expired.", context);
  } catch (error) {
    return safeActionError(error, "That code is invalid or expired.", context);
  }
}

export async function cancelEmailChallengeAction(
  _previousState: EmailVerificationActionState,
  formData: FormData,
): Promise<EmailVerificationActionState> {
  try {
    const user = await requireUser();
    const parsed = parseEmailVerificationCancellation(formEntries(formData));
    await enforceServerActionRateLimitDimensions("email-verification-cancel", [
      { name: "user", key: user.id, limit: 10, windowMs: 10 * 60_000 },
      { name: "ip", key: "cancel", limit: 20, windowMs: 10 * 60_000 },
    ]);
    await cancelEmailChallenge(user.id, parsed.eventId);
    return { status: "cancelled", message: "Pending verification cancelled.", cancelledEventId: parsed.eventId };
  } catch (error) {
    return safeActionError(error, "The pending verification could not be cancelled.");
  }
}
