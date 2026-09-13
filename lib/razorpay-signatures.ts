import { createHmac, timingSafeEqual } from "node:crypto";

function secureEqualHex(expected: string, received: string): boolean {
  const expectedBytes = Buffer.from(expected, "utf8");
  const receivedBytes = Buffer.from(received, "utf8");
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}

export function createRazorpayPaymentSignature(orderId: string, paymentId: string, secret: string): string {
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

export function verifyRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  return secureEqualHex(createRazorpayPaymentSignature(orderId, paymentId, secret), signature);
}

export function createRazorpayWebhookSignature(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  return secureEqualHex(createRazorpayWebhookSignature(rawBody, secret), signature);
}
