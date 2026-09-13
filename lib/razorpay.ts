import "server-only";

import Razorpay from "razorpay";
import { requireServerEnv } from "@/lib/env";
import { verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature } from "@/lib/razorpay-signatures";

let client: Razorpay | null = null;

export function getRazorpay() {
  const keyId = requireServerEnv("RAZORPAY_KEY_ID");
  const keySecret = requireServerEnv("RAZORPAY_KEY_SECRET");
  client ??= new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
}

export function verifyRazorpayPayment(orderId: string, paymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  return verifyRazorpayPaymentSignature(orderId, paymentId, signature, secret);
}

export function verifyRazorpayWebhook(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  return verifyRazorpayWebhookSignature(rawBody, signature, secret);
}
