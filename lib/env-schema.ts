import { z } from "zod";

export const requiredProductionEnvKeys = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "BLOB_READ_WRITE_TOKEN",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "IDENTITY_HASH_PEPPER",
] as const;

const nonEmpty = z.string().trim().min(1);

export const productionEnvSchema = z.object({
  DATABASE_URL: nonEmpty.url().refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), "must be a PostgreSQL URL"),
  AUTH_SECRET: nonEmpty.min(32),
  AUTH_GOOGLE_ID: nonEmpty,
  AUTH_GOOGLE_SECRET: nonEmpty,
  NEXT_PUBLIC_APP_URL: nonEmpty.url().refine((value) => value.startsWith("https://"), "must use HTTPS in production"),
  BLOB_READ_WRITE_TOKEN: nonEmpty,
  RAZORPAY_KEY_ID: nonEmpty,
  RAZORPAY_KEY_SECRET: nonEmpty,
  RAZORPAY_WEBHOOK_SECRET: nonEmpty,
  IDENTITY_HASH_PEPPER: nonEmpty.min(32),
  GST_RATE_BPS: z.coerce.number().int().min(0).max(10_000).default(0),
});

export type ProductionEnv = z.infer<typeof productionEnvSchema>;

export function parseProductionEnv(source: Record<string, string | undefined>): ProductionEnv {
  const parsed = productionEnvSchema.safeParse(source);
  if (parsed.success) return parsed.data;

  const details = parsed.error.issues.map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`).join("; ");
  throw new Error(`Invalid production environment: ${details}`);
}

export function isProductionRuntime(source: Record<string, string | undefined> = process.env): boolean {
  return source.NODE_ENV === "production" && source.NEXT_PHASE !== "phase-production-build";
}
