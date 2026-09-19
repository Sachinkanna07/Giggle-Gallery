"use client";

import { useActionState, useRef, useState, type InvalidEvent } from "react";
import { upload } from "@vercel/blob/client";
import { createArtwork, submitSellerApplication } from "@/app/actions/marketplace";

type FormState = { ok: boolean; message: string };
const initialState: FormState = { ok: false, message: "" };
const artworkFieldLabels: Record<string, string> = {
  image: "Artwork image",
  title: "Title",
  description: "Description",
  artistStatement: "Artist statement",
  price: "Price",
  currency: "Currency",
  medium: "Medium",
  year: "Year",
  widthCm: "Width",
  heightCm: "Height",
  type: "Format",
  stock: "Stock",
  colors: "Dominant colors",
  ownershipDeclaration: "Ownership confirmation",
};

function Status({ state }: { state: FormState }) {
  if (!state.message) return null;
  return <p role="status" className={`rounded-lg border p-4 text-sm ${state.ok ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-red-400/30 bg-red-400/10 text-red-100"}`}>{state.message}</p>;
}

export function SellerApplicationForm({ email, name }: { email?: string | null; name?: string | null }) {
  const [state, action, pending] = useActionState(submitSellerApplication, initialState);
  return (
    <form action={action} className="mt-10 grid gap-5 sm:grid-cols-2">
      <Status state={state} />
      <label className="form-label">Full name<input name="fullName" required defaultValue={name ?? ""} className="field mt-2" /></label>
      <label className="form-label">Artist display name<input name="displayName" required className="field mt-2" /></label>
      <label className="form-label">Email<input name="email" type="email" required defaultValue={email ?? ""} className="field mt-2" /></label>
      <label className="form-label">Phone<input name="phone" type="tel" required className="field mt-2" /></label>
      <label className="form-label">Country<input name="country" required defaultValue="India" className="field mt-2" /></label>
      <label className="form-label">State<input name="state" required className="field mt-2" /></label>
      <label className="form-label">City<input name="city" required className="field mt-2" /></label>
      <label className="form-label">Years of experience<input name="experienceYears" type="number" min="0" max="80" required defaultValue="0" className="field mt-2" /></label>
      <label className="form-label">Primary art style<input name="artStyle" required placeholder="Abstract, photography, digital…" className="field mt-2" /></label>
      <label className="form-label">Specialization<input name="specialization" required placeholder="Portraits, generative editions…" className="field mt-2" /></label>
      <label className="form-label">Portfolio URL<input name="portfolioUrl" type="url" placeholder="https://" className="field mt-2" /></label>
      <label className="form-label">Social URL<input name="socialUrl" type="url" placeholder="https://" className="field mt-2" /></label>
      <label className="form-label">Preferred currency<select name="preferredCurrency" defaultValue="INR" className="field mt-2"><option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></label>
      <label className="form-label">Seller type<select name="sellerType" defaultValue="INDIVIDUAL" className="field mt-2"><option value="INDIVIDUAL">Individual</option><option value="STUDIO">Studio</option><option value="GALLERY">Gallery</option></select></label>
      <label className="form-label sm:col-span-2">Biography<textarea name="biography" required minLength={40} rows={5} className="field mt-2 resize-y" /></label>
      <label className="form-label sm:col-span-2">Artist statement<textarea name="artistStatement" required minLength={40} rows={5} className="field mt-2 resize-y" /></label>
      <div className="sm:col-span-2"><p className="mb-4 text-sm leading-relaxed text-white/45">Identity and payout details are requested only after approval. Never enter bank or card details here.</p><button disabled={pending} className="button-light disabled:opacity-50">{pending ? "Submitting…" : "Submit for review"}</button></div>
    </form>
  );
}

export function ArtworkUploadForm({ sellerId }: { sellerId: string }) {
  const [state, submit, pending] = useActionState(createArtwork, initialState);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [validationError, setValidationError] = useState("");
  const invalidHandledRef = useRef(false);

  function handleInvalid(event: InvalidEvent<HTMLFormElement>) {
    const field = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (invalidHandledRef.current) return;
    invalidHandledRef.current = true;
    const label = artworkFieldLabels[field.name] ?? "This field";
    setValidationError(`Please check ${label}: ${field.validationMessage}`);
    field.focus();
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      invalidHandledRef.current = false;
    }, 0);
  }

  async function action(formData: FormData) {
    setUploadError("");
    const file = formData.get("image");
    if (!(file instanceof File) || !file.size) {
      setUploadError("Please select an image file to upload.");
      return;
    }
    setUploading(true);
    try {
      const intentId = crypto.randomUUID();
      const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-150) || "artwork-image";
      const blob = await upload(`artworks/${sellerId}/${intentId}/${safeFilename}`, file, { access: "public", handleUploadUrl: "/api/uploads/artwork", clientPayload: JSON.stringify({ intentId }) });
      formData.set("imageUrl", blob.url);
      formData.set("uploadIntentId", intentId);
      submit(formData);
    } catch (err) {
      let message = "Image upload failed. Please try again.";
      if (err instanceof Error && err.message) {
        const raw = err.message;
        if (!/token|secret|key|bearer|postgres|database|url|http|@/i.test(raw) && raw.length <= 120) {
          message = `Image upload failed: ${raw}`;
        }
      }
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  }

  const effectiveState = validationError
    ? { ok: false, message: validationError }
    : uploadError
      ? { ok: false, message: uploadError }
      : state;

  return (
    <form action={action} onInvalid={handleInvalid} onChange={() => setValidationError("")} className="grid gap-5 sm:grid-cols-2">
      <Status state={effectiveState} />
      <label className="form-label sm:col-span-2">Artwork image<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required className="field mt-2 file:mr-4 file:rounded-full file:border-0 file:bg-ivory file:px-4 file:py-2 file:text-ink" /></label>
      <input name="imageUrl" type="hidden" />
      <input name="uploadIntentId" type="hidden" />
      <label className="form-label sm:col-span-2">Title<input name="title" required className="field mt-2" /></label>
      <label className="form-label sm:col-span-2">Description<textarea name="description" required minLength={40} rows={5} className="field mt-2" /></label>
      <label className="form-label sm:col-span-2">Artist statement<textarea name="artistStatement" rows={4} className="field mt-2" /></label>
      <label className="form-label">Price<input name="price" type="number" min="1" step="0.01" required className="field mt-2" /></label>
      <label className="form-label">Currency<select name="currency" defaultValue="INR" className="field mt-2"><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></label>
      <label className="form-label">Medium<input name="medium" required className="field mt-2" /></label>
      <label className="form-label">Year<input name="year" type="number" min="1000" max={new Date().getFullYear()} required defaultValue={new Date().getFullYear()} className="field mt-2" /></label>
      <label className="form-label">Width (cm)<input name="widthCm" type="number" min="0.1" step="0.1" required className="field mt-2" /></label>
      <label className="form-label">Height (cm)<input name="heightCm" type="number" min="0.1" step="0.1" required className="field mt-2" /></label>
      <label className="form-label">Format<select name="type" defaultValue="PHYSICAL" className="field mt-2"><option value="PHYSICAL">Physical</option><option value="DIGITAL">Digital</option></select></label>
      <label className="form-label">Stock<input name="stock" type="number" min="1" max="999" required defaultValue="1" className="field mt-2" /></label>
      <label className="form-label sm:col-span-2">Dominant colors<input name="colors" placeholder="blue, ivory, black" className="field mt-2" /></label>
      <label className="flex items-start gap-3 text-sm leading-relaxed text-white/60 sm:col-span-2"><input name="ownershipDeclaration" value="confirmed" type="checkbox" required className="mt-1 size-4" />I confirm that I own this work or hold the rights required to sell it.</label>
      <button type="submit" onClick={() => { setValidationError(""); invalidHandledRef.current = false; }} disabled={pending || uploading} className="button-light w-fit disabled:opacity-50 sm:col-span-2">{uploading ? "Uploading image…" : pending ? "Submitting…" : "Submit artwork for review"}</button>
    </form>
  );
}
