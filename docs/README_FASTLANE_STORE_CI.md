# M55 Fastlane Store CI Complete (v1.0)
This bundle provides a **drop-in “Store submission CI”** setup for a Next.js + Capacitor project.

## What you get
- GitHub Actions workflow for **Audit → Build/Export → Capacitor Sync → Fastlane upload**
- Fastlane configs for:
  - **iOS TestFlight** (Pilot) + optional App Store submission (Deliver)
  - **Android Internal testing** (Supply) + optional Production
- A “fail-closed” pipeline shape:
  - **`npm run audit` MUST pass** before any deploy or store upload runs.

## Assumptions
- Your project is a **Next.js app** (Phase6 kit style).
- Capacitor projects exist at:
  - `ios/App` (Xcode workspace: `ios/App/App.xcworkspace`)
  - `android` (Gradle project)
- You already have scripts:
  - `npm run audit`
  - `npm run build`
  - `npm run export`
  - `npx cap sync`

## Quick install
1) Copy these into your repo root:
- `.github/workflows/`
- `fastlane/`
- `Gemfile`

2) In repo root, run locally once:
```bash
bundle install
bundle exec fastlane --version
```

3) Add GitHub Secrets (details below).

4) Trigger the workflow:
- GitHub → Actions → **store-submit** → Run workflow
  - target: `both` (default)

---

## GitHub Secrets (Required)

### iOS (App Store Connect API Key)
- `ASC_KEY_ID`
- `ASC_ISSUER_ID`
- `ASC_KEY_P8_BASE64` : base64 of your `.p8` key

Generate base64:
```bash
base64 -i AuthKey_XXXXXX.p8 | pbcopy
```

### iOS Signing (fastlane match)
- `MATCH_GIT_URL`
- `MATCH_PASSWORD`
- `MATCH_GIT_BASIC_AUTHORIZATION` (optional; if using HTTPS)
- `KEYCHAIN_PASSWORD`

### Android (Google Play + Keystore)
- `PLAY_SERVICE_ACCOUNT_JSON_BASE64`
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

---

## Switching lanes
- iOS:
  - `ios_lane=testflight` (default)
  - `ios_lane=appstore` (optional)
- Android:
  - `android_lane=internal` (default)
  - `android_lane=production` (optional)

