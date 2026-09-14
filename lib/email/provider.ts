import "server-only";

import { Resend } from "resend";
import type { VerificationEmailProvider } from "@/lib/email-verification/core";
import { verificationEmailContent } from "@/lib/email/templates";
import { requireServerEnv } from "@/lib/env";

class ResendEmailProvider implements VerificationEmailProvider {
  readonly name = "resend";

  constructor(
    private readonly resend: Resend,
    private readonly from: string,
  ) {}

  async sendVerificationCode(message: Parameters<VerificationEmailProvider["sendVerificationCode"]>[0]): Promise<void> {
    const content = verificationEmailContent(message);
    const result = await this.resend.emails.send({
      from: this.from,
      to: message.to,
      subject: content.subject,
      text: content.text,
      html: content.html,
    }, { idempotencyKey: message.idempotencyKey });
    if (result.error || !result.data?.id) throw new Error("EMAIL_DELIVERY_FAILED");
  }
}

export function getVerificationEmailProvider(): VerificationEmailProvider {
  const provider = requireServerEnv("EMAIL_PROVIDER").toLowerCase();
  if (provider !== "resend") throw new Error("Unsupported email provider configuration.");
  return new ResendEmailProvider(new Resend(requireServerEnv("RESEND_API_KEY")), requireServerEnv("EMAIL_FROM"));
}
