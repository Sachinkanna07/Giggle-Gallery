import type { VerificationEmailDelivery } from "../email-verification/core";

export function verificationEmailContent(message: Pick<VerificationEmailDelivery, "code" | "expiresInMinutes">) {
  const subject = "Your Giggle Gallery verification code";
  const text = [
    "Giggle Gallery",
    "",
    `Your verification code is ${message.code}.`,
    `It expires in ${message.expiresInMinutes} minutes.`,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#11100f;color:#f6f0e6;font-family:Arial,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#11100f;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border:1px solid #39342e;background:#1a1816;padding:40px">
          <tr><td style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#cfaa73">Giggle Gallery</td></tr>
          <tr><td style="padding-top:22px;font-family:Georgia,serif;font-size:34px;line-height:1.15">Verify your email</td></tr>
          <tr><td style="padding-top:18px;color:#c7c0b6;font-size:16px;line-height:1.6">Use this one-time code to confirm your contact email:</td></tr>
          <tr><td style="padding:28px 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:38px;letter-spacing:10px;font-weight:700">${message.code}</td></tr>
          <tr><td style="color:#c7c0b6;font-size:14px;line-height:1.6">This code expires in ${message.expiresInMinutes} minutes. If you did not request this, you can ignore this email.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  return { subject, text, html };
}
