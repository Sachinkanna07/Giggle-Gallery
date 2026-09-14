"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelEmailChallengeAction,
  requestEmailVerificationAction,
  verifyEmailChallengeAction,
  type EmailVerificationActionState,
} from "@/app/actions/email-verification";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const initialState: EmailVerificationActionState = { status: "idle", message: "" };

function StatusMessage({ state }: { state: EmailVerificationActionState }) {
  if (!state.message) return null;
  const positive = state.status === "sent" || state.status === "verified" || state.status === "already_verified" || state.status === "cancelled";
  return (
    <p
      role={positive ? "status" : "alert"}
      className={`mt-4 border p-3 text-sm ${positive ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : "border-amber-300/25 bg-amber-300/10 text-amber-100"}`}
    >
      {state.message}
    </p>
  );
}

export function EmailSettings({
  primaryEmail,
  primaryEmailVerified,
  contactEmail,
  contactEmailVerified,
}: {
  primaryEmail: string;
  primaryEmailVerified: boolean;
  contactEmail: string | null;
  contactEmailVerified: boolean;
}) {
  const router = useRouter();
  const [requestState, requestAction, requestPending] = useActionState(requestEmailVerificationAction, initialState);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyEmailChallengeAction, initialState);
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelEmailChallengeAction, initialState);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const eventId = requestState.eventId;
  const pendingEmail = requestState.email;
  const challengeActive = Boolean(
    eventId
    && pendingEmail
    && !(verifyState.status === "verified" && verifyState.eventId === eventId)
    && cancelState.cancelledEventId !== eventId,
  );
  const displayedState = cancelState.cancelledEventId && cancelState.cancelledEventId === eventId
    ? cancelState
    : verifyState.eventId === eventId && verifyState.status !== "idle"
      ? verifyState
      : requestState;

useEffect(() => {
  if (!requestState.eventId) return;

  const startTimer = window.setTimeout(() => {
    setCooldownSeconds(60);
  }, 0);

  const timer = window.setInterval(() => {
    setCooldownSeconds((seconds) => {
      if (seconds <= 1) {
        window.clearInterval(timer);
        return 0;
      }

      return seconds - 1;
    });
  }, 1_000);

  return () => {
    window.clearTimeout(startTimer);
    window.clearInterval(timer);
  };
}, [requestState.eventId]);

  useEffect(() => {
    if (verifyState.status === "verified") router.refresh();
  }, [router, verifyState.status]);

  return (
    <div className="mt-6 border-t border-white/10 pt-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border border-white/10 bg-white/[.025] p-4">
          <p className="text-xs uppercase tracking-[.2em] text-white/35">Primary sign-in email</p>
          <p className="mt-2 break-all text-sm text-white/80">{primaryEmail}</p>
          <p className="mt-2 text-xs text-white/45">{primaryEmailVerified ? "Verified by your sign-in provider" : "Not verified"}</p>
        </div>
        <div className="border border-white/10 bg-white/[.025] p-4">
          <p className="text-xs uppercase tracking-[.2em] text-white/35">Verified contact email</p>
          <p className="mt-2 break-all text-sm text-white/80">{contactEmail ?? (primaryEmailVerified ? primaryEmail : "No verified contact email")}</p>
          <p className="mt-2 text-xs text-white/45">{contactEmail ? (contactEmailVerified ? "Verified" : "Not verified") : (primaryEmailVerified ? "Verified" : "Not verified")}</p>
        </div>
      </div>

      {!challengeActive && !(verifyState.status === "verified" && verifyState.eventId === eventId) ? (
        <form action={requestAction} className="mt-6">
          <label htmlFor="contact-email" className="text-sm text-white/75">Verify or change contact email</label>
          <p className="mt-1 text-xs leading-relaxed text-white/40">Your Google sign-in email stays unchanged. A new contact address becomes active only after verification.</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={contactEmail ?? primaryEmail}
              required
              maxLength={320}
              disabled={requestPending}
              className="min-h-12 flex-1 border border-white/15 bg-transparent px-4 text-sm text-white outline-none transition focus:border-white/60 disabled:opacity-50"
            />
            <button type="submit" disabled={requestPending} className="button-light disabled:cursor-wait disabled:opacity-60">
              {requestPending ? "Sending…" : "Send code"}
            </button>
          </div>
        </form>
      ) : null}

      {challengeActive && eventId && pendingEmail ? (
        <div className="mt-6 border border-white/10 bg-white/[.025] p-5">
          <p className="text-sm text-white/75">Enter the code sent to <span className="break-all text-white">{pendingEmail}</span>.</p>
          <p className="mt-1 text-xs text-white/40">The six-digit code expires in 10 minutes and can be used once.</p>
          <form action={verifyAction} className="mt-5">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="email" value={pendingEmail} />
            <InputOTP name="code" maxLength={6} inputMode="numeric" autoComplete="one-time-code" disabled={verifyPending} required>
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, index) => (
                  <InputOTPSlot key={index} index={index} className="h-11 w-10 border-white/20 bg-black/20 text-base sm:w-12" />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <button type="submit" disabled={verifyPending} className="button-light mt-5 disabled:cursor-wait disabled:opacity-60">
              {verifyPending ? "Verifying…" : "Verify email"}
            </button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <form action={requestAction}>
              <input type="hidden" name="email" value={pendingEmail} />
              <button type="submit" disabled={requestPending || cooldownSeconds > 0} className="text-link text-xs disabled:cursor-not-allowed disabled:opacity-40">
                {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : requestPending ? "Sending…" : "Resend code"}
              </button>
            </form>
            <form action={cancelAction}>
              <input type="hidden" name="eventId" value={eventId} />
              <button type="submit" disabled={cancelPending} className="text-xs text-white/45 underline-offset-4 hover:text-white hover:underline disabled:opacity-40">
                {cancelPending ? "Cancelling…" : "Cancel pending change"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <StatusMessage state={displayedState} />
    </div>
  );
}
