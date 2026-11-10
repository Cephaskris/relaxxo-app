# Relaxxo

Location-based marketplace for **verified massage therapists** and **hotels with available rooms** in Lagos and Abuja.
Clients buy **connection credits** (Paystack) to unlock a therapist's phone number and in-app chat.
Therapists and hotels spend credits to **go online** (1 hour, 2 hours, 2 days, 3 days). Hotel contacts are free for clients.

One codebase:

| Part | Tech | Where it runs |
| --- | --- | --- |
| Client, therapist and hotel app | Expo (React Native) + Expo Router | Android app + web app |
| Admin dashboard | Same Expo app, `/admin` route (web only, admin role only) | Web |
| Backend | Convex (database, auth, file storage, real-time chat, scheduled jobs) | Convex cloud |
| Payments | Paystack (server-verified) | — |
| SMS login codes | Termii | — |
| Address search | Google Places (through a server proxy) | — |
| Web hosting | Cloudflare Pages, deployed from GitHub | — |

## Folder map

```
app/                    Screens (Expo Router — the file path is the URL)
  index.tsx             Sends each user to the right home
  auth/                 Phone + OTP sign-in, choose account type
  home/                 Client tabs: area wheel, Stays, Chats, Wallet, Account
  therapists.tsx        Therapists online in the chosen area (swipe cards)
  therapist/[id].tsx    Therapist profile + Connect (unlock) + call/copy/chat
  hotel/[id].tsx        Hotel profile, rooms, call to reserve, directions
  chat/[id].tsx         In-app chat, "I've spoken to them", rating, report
  pro/                  Therapist tabs: dashboard (go online), inbox, services, wallet, account
  host/                 Hotel tabs: dashboard (go online, availability), rooms, wallet, account
  onboarding/           Therapist and hotel setup + verification uploads
  admin/                Admin web dashboard
  payment-return.tsx    Paystack return page
components/             Design system (floating nav, area wheel, buttons, sheets…)
lib/                    Theme, areas, helpers, uploads, payments hook
convex/                 Backend: schema, auth, every query/mutation/action, webhook, cron
```

## Setup

Follow **ANTIGRAVITY.md** step by step (it's written so you can paste it to the Antigravity agent).
Security design is explained in **SECURITY.md**.

## Default business rules (all editable in Admin → Pricing & settings)

- Credit packs: 5 for ₦2,500 · 12 for ₦5,000 · 30 for ₦10,000
- Unlock a therapist: 1 credit, lasts 7 days, chat included
- Auto-refund if the therapist doesn't reply (or tap "I've spoken to them") within 30 minutes
- Going online: 1h = 1 credit · 2h = 2 · 2 days = 8 · 3 days = 10 (no refund for going offline early)
- New approved therapists and hotels get 2 welcome credits
- 3 reports from different people auto-suspends an account until an admin reviews it
- Cities start **closed**: open each one in admin once it has around 20 approved therapists
