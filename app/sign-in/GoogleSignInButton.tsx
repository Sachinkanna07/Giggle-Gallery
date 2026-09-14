"use client";

import { useFormStatus } from "react-dom";

export function GoogleSignInButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className="button-light w-full disabled:cursor-wait disabled:opacity-65">
      {pending ? "Connecting to Google…" : "Continue with Google"}
    </button>
  );
}
