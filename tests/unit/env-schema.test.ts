import { describe, expect, it } from "vitest";
import { parseProductionEnv } from "../../lib/env-schema";

const validEnv = {
  DATABASE_URL: "postgresql://user:password@db.example.com/gallery",
  AUTH_SECRET: "a-secure-test-secret-that-is-at-least-32-characters",
  AUTH_GOOGLE_ID: "google-client-id-for-test",
  AUTH_GOOGLE_SECRET: "google-client-secret-for-test",
  NEXT_PUBLIC_APP_URL: "https://gallery.example.com",
  BLOB_READ_WRITE_TOKEN: "blob-test-token",
  RAZORPAY_KEY_ID: "rzp_test_example",
  RAZORPAY_KEY_SECRET: "razorpay-test-secret",
  RAZORPAY_WEBHOOK_SECRET: "razorpay-webhook-test-secret",
  IDENTITY_HASH_PEPPER: "identity-test-pepper-with-at-least-32-characters",
};

describe("production environment validation", () => {
  it("accepts a complete production configuration", () => {
    expect(parseProductionEnv(validEnv)).toMatchObject({ NEXT_PUBLIC_APP_URL: "https://gallery.example.com", GST_RATE_BPS: 0 });
  });

  it("fails closed when a required secret is missing", () => {
    expect(() => parseProductionEnv({ ...validEnv, AUTH_SECRET: undefined })).toThrow(/AUTH_SECRET/);
  });

  it("requires HTTPS for the production public URL", () => {
    expect(() => parseProductionEnv({ ...validEnv, NEXT_PUBLIC_APP_URL: "http://gallery.example.com" })).toThrow(/NEXT_PUBLIC_APP_URL/);
  });
});
