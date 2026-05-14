# Sherpa Fit — iOS App Store Build Guide

This guide walks you through building Sherpa Fit for the App Store. You need:

- A **Mac** running macOS 13+ (Ventura or newer)
- **Xcode 15+** (free from the Mac App Store)
- **Node.js 22+** — required by `@capacitor/cli` v8 ([download](https://nodejs.org))
- An **Apple Developer account** ($99/year) at developer.apple.com

---

## Step 1 — Install Node dependencies

Run this in the project root on your Mac:

```bash
npm install
```

> Installs `@capacitor/cli`, `@capacitor/ios`, `@capacitor/assets`, and all other dependencies.

---

## Step 2 — Build the web app

```bash
npm run build
```

Produces the production bundle in `dist/public/` — the directory Capacitor copies into the native iOS project.

---

## Step 3 — Generate iOS icon + splash screen assets

```bash
npm run generate:assets
```

This script (in `scripts/generate-ios-assets.mjs`) does two things:

1. Creates `assets/logo.png` (1024×1024, orange bg) and `assets/splash.png` (2732×2732, light bg) from the project logo.
2. Calls `@capacitor/assets` to write all required iOS icon and splash sizes into `ios/App/` (run after Step 4 if `ios/` doesn't exist yet).

> **To replace the auto-generated icon** with a custom design: place a 1024×1024 PNG (no alpha channel) at `assets/logo.png` and re-run this step.

---

## Step 4 — Initialise the iOS native project (first time only)

```bash
npx cap add ios
```

Scaffolds `ios/App/` with a full Xcode project. Only needed once. After that, use `npm run cap:sync` (Step 5) to update it.

---

## Step 5 — Add Info.plist permission strings

After `cap add ios`, open `ios/App/App/Info.plist` and add the entries in `ios-metadata/Info.plist.additions.xml`. The key ones are:

```xml
<key>NSCameraUsageDescription</key>
<string>Sherpa Fit uses your camera to scan food barcodes and packaging for instant nutrition info.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Sherpa Fit can read photos from your library to identify and log meals automatically.</string>

<key>CFBundleDisplayName</key>
<string>Sherpa Fit</string>
```

> Apple will **reject** your app without camera/photo usage strings if those features are detected.

---

## Step 6 — Re-run asset generation (now that `ios/` exists)

```bash
npm run generate:assets
```

This time `@capacitor/assets` can find `ios/App/` and will write all icon and splash sizes into the Xcode asset catalog.

---

## Step 7 — Sync web assets + plugins into Xcode

```bash
npm run cap:sync
```

This builds the web app and syncs everything into the native project. Run this every time you change web code or add/update a Capacitor plugin.

---

## Step 8 — Open Xcode

```bash
npm run cap:open
```

Opens `ios/App/App.xcworkspace` in Xcode.

---

## Step 9 — Configure signing in Xcode

1. In the Xcode project navigator, click **App** (top-level blue icon).
2. Select the **App** target → **Signing & Capabilities** tab.
3. Set **Team** to your Apple Developer team.
4. Xcode will auto-generate a provisioning profile.
5. Confirm **Bundle Identifier** is `com.sherpafit.app`.

---

## Step 10 — Set the minimum iOS version

1. Still in the **App** target → **General** tab.
2. Set **Minimum Deployments** to **iOS 16.0**.

---

## Step 11 — Archive and upload

1. In Xcode, select **Any iOS Device (arm64)** as the run destination (top bar).
2. Menu → **Product → Archive**. Wait for the archive to build (~5 min).
3. The **Organizer** window opens automatically.
4. Click **Distribute App → App Store Connect → Upload**.
5. Follow the wizard; Xcode handles signing and upload automatically.

---

## Step 12 — Submit in App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com).
2. Open your app → **TestFlight** to run internal/external beta testing first.
3. When ready, go to **App Store** → add a new version and select your build.
4. Add screenshots (6.7" iPhone required, 6.1" recommended), description, keywords, and ratings.
5. Click **Submit for Review** (Apple typically reviews in 24–48 hours).

---

## Quick reference

| Command | What it does |
|---|---|
| `npm run build` | Build web assets into `dist/public/` |
| `npm run generate:assets` | Generate iOS icon + splash from logo |
| `npm run cap:sync` | Build + sync into Xcode project |
| `npm run cap:open` | Open Xcode workspace |
| `npx cap add ios` | Scaffold iOS project (first time only) |
| `npx cap run ios` | Run on a connected iPhone (dev build) |
| `npx cap doctor` | Check Capacitor environment health |

---

## Capacitor config reference

| Setting | Value |
|---|---|
| App ID | `com.sherpafit.app` |
| App Name | `Sherpa Fit` |
| Web directory | `dist/public` |
| iOS scheme | `SherpaFit` |
| Status bar | Light content (white icons) — consistent across all screens |
| Minimum iOS | 16.0 |
| Plugins | StatusBar, SplashScreen, Keyboard, Haptics, PushNotifications, Share |

---

## Troubleshooting

**`npx cap sync` fails with engine warning** — Ensure you are on Node.js 22+. `@capacitor/cli` v8 requires it.

**Icons not showing after archive** — Re-run `npm run generate:assets` then `npm run cap:sync`, clean build folder in Xcode (Product → Clean Build Folder), then archive again.

**Camera permission crash** — Confirm you added the `NSCameraUsageDescription` key to `Info.plist` (Step 5).
