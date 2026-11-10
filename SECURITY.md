# Relaxxo security design

## Accounts and access
- Login is phone number + 6-digit SMS code (Convex Auth). Codes are random, expire after 10 minutes and are never logged in production.
- Tokens are stored in the phone's encrypted keychain/keystore (`expo-secure-store`).
- Every backend function checks who is calling and their role **on the server**. Hiding a button in the app is never the only protection.
- The account type (client, therapist, hotel) is set once. **Admin can't be chosen in the app**: it's granted only from the Convex dashboard (`admin:makeAdmin`).
- Suspended or banned users are blocked in every function; their profiles go offline immediately.

## Money and credits
- Prices come only from server settings. The app sends a pack id, never an amount.
- Credits are added **only** after the server confirms the payment with Paystack's API:
  - the webhook checks Paystack's HMAC-SHA512 signature (constant-time compare), then re-verifies with the API;
  - the app's "verify" call also asks Paystack directly.
- The amount and currency must match the stored order exactly; each reference can only be credited once.
- Every credit change writes a ledger row with the balance after it. Balances can't go negative (Convex mutations are transactional, so double-spends aren't possible).
- Admin wallet adjustments are capped, need a reason and are recorded in the admin activity log.
- Stale pending payments are re-checked hourly and then marked abandoned.

## Privacy
- A therapist's phone number is only returned to the client who unlocked them, while the unlock is active.
- Therapists' exact location is never sent to clients: only the area and a distance rounded to the nearest km.
- ID documents, selfies and business documents are "private" uploads. Only admin queries ever create a link to them.
- Paystack receives a placeholder email derived from the phone number, not real personal email.

## Content and abuse
- All profile, service and room text is length-checked and run against the admin's blocked-words list.
- New or edited services, rooms and room photos stay hidden until an admin approves them.
- Uploads must be images or PDFs under 8 MB and can only be used by the person who uploaded them.
- Rate limits: unlocks (20/hour), messages (30/minute), uploads (40/hour), payments (10/hour), reports (5/hour), address search (60/hour).
- Reports from 3 different people auto-suspend the account until an admin reviews it.

## Keys and secrets
- Secrets live only in Convex environment variables: Paystack secret key, Termii key, Google Maps key.
- The app bundle contains only the public Convex URL and the support WhatsApp number.
- Google Maps is called through the server, so the key can't be lifted from the app. Restrict it to "Places API (New)" and set a budget alert.
- The web app sends strict security headers (`public/_headers`): no framing, no MIME sniffing, HSTS.

## Before launch checklist
- [ ] `OTP_DEV_MODE` is **not** set in production
- [ ] Paystack is on **live** keys and the webhook URL is set
- [ ] Google Maps key restricted, with a budget cap
- [ ] Termii sender ID "Relaxxo" approved, with the DND route enabled
- [ ] Blocked-words list filled in (include slang and Pidgin terms)
- [ ] At least one admin created; test approve, reject, suspend and refund flows
- [ ] Convex production deploy key stored only in Cloudflare
