import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireSeller } from "@/lib/authz";

export async function POST(request: Request) {
  const body = await request.json() as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await requireSeller();
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 12 * 1024 * 1024,
          tokenPayload: user.id,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => undefined,
    });
    return Response.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error && error.message === "SELLER_REQUIRED" ? "Seller access required." : "Upload could not be authorized.";
    return Response.json({ error: message }, { status: 403 });
  }
}
