# Enable live verification emails

The app has signup code entry, cryptographically random six-digit codes, hashed challenge storage, a ten-minute expiry, five verification attempts, a resend cooldown and a transactional email queue. Email verification never grants community approval or bypasses the posting restriction.

## Render Free: use HTTPS delivery

Render Free blocks outbound SMTP ports 25, 465 and 587. The backend supports the Resend HTTPS API without an additional dependency. OTPs, alerts and invoice receipts use the same transport.

In the backend service's Render Environment settings, add:

```
EMAIL_PROVIDER=resend
EMAIL_FROM=Help Hub <your-provider-approved-sender>
RESEND_API_KEY=<your-private-sending-key>
```

Never commit the key or paste it into a chat. Redeploy after saving the environment settings.

For an owner-only demonstration, Resend's test sender `onboarding@resend.dev` can deliver to the email address associated with the Resend account. It cannot deliver signup OTPs to arbitrary users. For general signup, verify an owned sending domain and use a sender on that domain. The shared `community-help-hub.vercel.app` domain is not an owned email-sending domain.

The ChatGPT Gmail/Outlook connectors do not provision a transactional delivery service for the deployed backend. An authenticated provider account is required. This repository does not contain a real provider key and this integration alone does not establish live inbox delivery.

## Verify activation

1. Create an account with a permitted test recipient or a real recipient after domain approval.
2. Confirm the signup screen shows the queued code message. Check inbox and spam. Queue processing runs about every 30 seconds while the backend is awake.
3. Enter a wrong code, then the received code. Only the correct, unexpired code should complete the email check.
4. Confirm publishing remains blocked until community approval.
5. Check hosting logs for worker failures without printing keys, OTPs, message bodies or recipient addresses. A provider acknowledgement means accepted for delivery; it is not proof that an inbox received the email.

SMTP remains supported on hosts that permit it, using `EMAIL_PROVIDER=smtp` and the existing SMTP environment variables. `EMAIL_FROM` can replace `SMTP_FROM`.

References: https://render.com/docs/free and https://resend.com/docs/api-reference/emails/send-email and https://resend.com/docs/knowledge-base/403-error-resend-dev-domain
