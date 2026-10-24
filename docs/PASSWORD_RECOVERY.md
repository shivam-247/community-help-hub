# Forgot password

The sign-in page now links to `/forgot-password`. Enter the account email, receive an eight-digit reset code, choose and confirm a new password, and enter the current authenticator code if MFA is enabled. Successful recovery signs out previous sessions and returns the member to sign-in. MFA remains enabled.

## Protections

- Existing, unknown, restricted and resend-cooldown accounts receive the same request acknowledgement. Fast responses are padded to a comparable minimum duration; this is not a guarantee of identical timing under load.
- Codes use cryptographic randomness and a purpose/user-bound HMAC in a separate additive challenge table. Email-verification codes cannot reset passwords.
- Codes expire after ten minutes, permit five attempts and are consumed once. Requests have a one-minute resend cooldown plus shared IP/account authentication rate limits.
- A new request cancels queued older reset emails. Changing a password while signed in also cancels pending recovery. Account deletion clears its recovery challenge.
- Successful reset rotates the account's authentication version, clears the current browser cookie and invalidates old bearer tokens. Passwords use the existing Argon2 hasher and 12–128 character policy.
- Authenticator checking and recovery consumption stay in the same database transaction. Recovery does not disable MFA, restore a suspended account, grant community verification or change a plan.
- Passwords, codes and provider response bodies are excluded from application logs and error responses. The transactional outbox necessarily holds email content for delivery.

## Email activation

This uses the same Resend HTTPS or SMTP transport as signup verification and invoices. Actual inbox delivery requires the private provider key and permitted sender described in `EMAIL_SETUP.md`. If email is unavailable, the request fails visibly without claiming that a code was sent. A provider-accepted queue message is not proof of inbox delivery.

## Validation

Backend coverage includes generic acknowledgements, hashing, cooldown, expiry, attempt limits, code replay, user/purpose binding, old-session revocation, MFA preservation, authenticated password-change invalidation, restrictions and rate limiting. Frontend unit coverage checks clearing the reset browser cookie. `frontend/tests/recovery-browser.mjs` uses an isolated fictional account and captured test mail to check the complete UI flow, Gujarati/Hindi, keyboard access, password visibility/matching, unavailable email and accessibility/overflow at 360, 390, 768 and 1280 pixels. It does not send to real inboxes.
