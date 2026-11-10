# Instructions for Antigravity

> Paste this whole file into Antigravity as the first prompt after opening the `relaxxo-app` folder.

You are setting up **Relaxxo**, an Expo (React Native + web) app with a Convex backend. The code is complete but has
**not been compiled yet** (it was written without internet access). Your jobs are to install, connect, type-check, fix
any errors **without changing the product behaviour or security rules**, run it, and deploy.

Read `README.md` and `SECURITY.md` first. Don't weaken any server-side check in `convex/` to make something work.

## 1. Install
```bash
npm install
npx expo install --fix          # aligns every Expo package to the installed SDK
```

## 2. Connect Convex
```bash
npx convex dev                  # log in, create project "relaxxo"; keep this running in its own terminal
```
- Make sure `.env.local` contains `EXPO_PUBLIC_CONVEX_URL=https://<deployment>.convex.cloud`. Add it if Convex only wrote `CONVEX_URL`.
- Set up Convex Auth keys:
```bash
npx @convex-dev/auth            # choose "Expo/React Native"; it sets JWT_PRIVATE_KEY, JWKS and SITE_URL
```
- Set the secrets (use test keys for now):
```bash
npx convex env set SITE_URL http://localhost:8081
npx convex env set OTP_DEV_MODE true                 # dev only: OTP codes appear in the Convex logs
npx convex env set PAYSTACK_SECRET_KEY sk_test_xxx
npx convex env set GOOGLE_MAPS_API_KEY xxx           # enable "Places API (New)" for this key
npx convex env set TERMII_API_KEY xxx                # optional while OTP_DEV_MODE=true
npx convex env set TERMII_SENDER_ID Relaxxo
```
- Seed settings: `npx convex run admin:seedSettings`

## 3. Type-check and fix
```bash
npm run typecheck
```
Fix every error. Expected kinds: package version differences (e.g. lucide/expo API names), Convex generated-type
strictness, and small TS mismatches. Keep the design (`lib/theme.ts`, `components/`) as it is.

## 4. Run
```bash
npx expo start --web            # web app at http://localhost:8081
npx expo start                  # Android: scan with Expo Go
```
Push notifications need a development build (`npx expo run:android` or EAS), not Expo Go. Everything else works in Expo Go.

## 5. Create the first admin
1. Sign in once on the web app with your phone number (read the code from the Convex logs).
2. `npx convex run admin:makeAdmin '{"phone":"+234XXXXXXXXXX"}'`
3. Open `http://localhost:8081/admin`.

## 6. Test the full loop (test keys)
1. Second number → sign up as **Therapist** → profile, 3 photos, area, a service → upload documents → submit.
2. Admin → Verification → approve (they get 2 welcome credits). Admin → Settings → open **Lagos**.
3. Therapist → Go online for 1 hour.
4. Third number → **Client** → pick the area → see the therapist → Connect → buy credits with a Paystack test card → unlock → call, copy, chat.
5. Don't reply as the therapist: after 30 minutes the client's credit is refunded automatically.
6. Hotel: sign up → details + cover + rooms → documents → admin approves hotel and rooms → go online → shows in Stays.

## 7. Push to GitHub
```bash
git init && git add . && git commit -m "Relaxxo v1"
git branch -M main
git remote add origin https://github.com/<you>/relaxxo.git
git push -u origin main
```
`.env.local` is git-ignored. Never commit keys.

## 8. Production Convex + Cloudflare Pages (web app + admin)
1. Convex dashboard → production deployment → **Settings → Deploy key** → copy it.
2. Set production secrets: `npx convex env set --prod NAME value` for every variable in step 2, using **live** Paystack keys, `SITE_URL=https://app.relaxxo.com`, **no** `OTP_DEV_MODE`. Then run `npx @convex-dev/auth --prod` and `npx convex run --prod admin:seedSettings`.
3. Cloudflare → Workers & Pages → Create → Pages → connect the GitHub repo:
   - Build command: `npx convex deploy --cmd 'npx expo export --platform web' --cmd-url-env-var-name EXPO_PUBLIC_CONVEX_URL`
   - Build output directory: `dist`
   - Environment variables: `CONVEX_DEPLOY_KEY=<prod deploy key>`, `NODE_VERSION=20`, `EXPO_PUBLIC_SUPPORT_WHATSAPP=234…`
4. Add the custom domain `app.relaxxo.com`. Every push to `main` now deploys the backend and the web app together.

## 9. Paystack
- Dashboard → Settings → API Keys & Webhooks → Webhook URL: `https://<prod-deployment>.convex.site/paystack/webhook`
- The callback URL is set by the app (`SITE_URL/payment-return`); nothing to set here.

## 10. Android app (Play Store)
```bash
npm i -g eas-cli && eas login
eas build:configure
eas build -p android --profile production
```
Set `EXPO_PUBLIC_CONVEX_URL` (production URL) as an EAS environment variable. Add the EAS `projectId` to `app.json` (`extra.eas.projectId`) for push notifications.
