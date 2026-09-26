type ProviderPayment = { id: string; order_id: string; amount: number | string; currency: string; status: string };

export function matchesProviderPaymentIdentity(payment: ProviderPayment, paymentId: string, orderId: string): boolean {
  return payment.id === paymentId && payment.order_id === orderId;
}

export function isCapturedExpectedPayment(payment: ProviderPayment, amountPaise: bigint): boolean {
  return payment.status === "captured" && payment.currency === "INR" && String(payment.amount) === String(amountPaise);
}
