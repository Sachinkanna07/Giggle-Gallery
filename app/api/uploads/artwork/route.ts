import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { artworkUploads } from "@/db/schema";
import { requireSeller } from "@/lib/authz";
import { artworkUploadPrefix, isApprovedArtworkBlobUrl } from "@/lib/blob-validation";
import { isAllowedBrowserOrigin, originErrorResponse, rateLimitRequest, rateLimitResponse } from "@/lib/security/request";

const uploadIntentSchema = z.object({ intentId: z.string().uuid() });
const tokenPayloadSchema = uploadIntentSchema.extend({ userId: z.string().min(1) });
const allowedContentTypes = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  try {
    const body = await request.json() as HandleUploadBody;
    if (body.type === "blob.generate-client-token") {
      if (!isAllowedBrowserOrigin(request)) return originErrorResponse();
      const rateLimit = rateLimitRequest(request, "artwork-upload-token", 20, 60_000);
      if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await requireSeller();
        const intent = uploadIntentSchema.parse(JSON.parse(clientPayload ?? "null"));
        const expectedPrefix = artworkUploadPrefix(user.id, intent.intentId);
        const filename = pathname.slice(expectedPrefix.length);
        if (!pathname.startsWith(expectedPrefix) || !filename || filename.includes("/") || !/^[a-zA-Z0-9._-]{1,180}$/.test(filename)) throw new Error("INVALID_UPLOAD_PATH");

        const validUntil = Date.now() + 15 * 60 * 1_000;
        await getDb().insert(artworkUploads).values({
          id: intent.intentId,
          userId: user.id,
          pathname,
          expiresAt: new Date(validUntil),
        }).onConflictDoNothing({ target: artworkUploads.id });
        const [authorized] = await getDb().select({ userId: artworkUploads.userId, pathname: artworkUploads.pathname, status: artworkUploads.status, expiresAt: artworkUploads.expiresAt }).from(artworkUploads).where(eq(artworkUploads.id, intent.intentId)).limit(1);
        if (!authorized || authorized.userId !== user.id || authorized.pathname !== pathname || authorized.status !== "AUTHORIZED" || authorized.expiresAt < new Date()) throw new Error("INVALID_UPLOAD_INTENT");
        return {
          allowedContentTypes,
          maximumSizeInBytes: 12 * 1024 * 1024,
          validUntil: authorized.expiresAt.getTime(),
          tokenPayload: JSON.stringify({ userId: user.id, intentId: intent.intentId }),
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const token = tokenPayloadSchema.parse(JSON.parse(tokenPayload ?? "null"));
        const [upload] = await getDb().select({ pathname: artworkUploads.pathname, url: artworkUploads.url, contentType: artworkUploads.contentType, status: artworkUploads.status, expiresAt: artworkUploads.expiresAt }).from(artworkUploads).where(and(eq(artworkUploads.id, token.intentId), eq(artworkUploads.userId, token.userId))).limit(1);
        if (!upload) throw new Error("UPLOAD_INTENT_MISSING");
        if (!allowedContentTypes.includes(blob.contentType) || !isApprovedArtworkBlobUrl(blob.url, upload.pathname) || blob.pathname !== upload.pathname) throw new Error("INVALID_COMPLETED_UPLOAD");
        if ((upload.status === "UPLOADED" || upload.status === "ATTACHED") && upload.url === blob.url && upload.contentType === blob.contentType) return;
        if (upload.status !== "AUTHORIZED" || upload.expiresAt < new Date()) throw new Error("UPLOAD_INTENT_EXPIRED");
        await getDb().update(artworkUploads).set({ url: blob.url, contentType: blob.contentType, status: "UPLOADED", completedAt: new Date(), updatedAt: new Date() }).where(and(eq(artworkUploads.id, token.intentId), eq(artworkUploads.status, "AUTHORIZED")));
      },
    });
    return Response.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error && error.message === "SELLER_REQUIRED" ? "Seller access required." : "Upload could not be authorized.";
    const status = error instanceof SyntaxError || error instanceof z.ZodError ? 400 : 403;
    return Response.json({ error: message }, { status });
  }
}
