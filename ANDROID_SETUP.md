# Luna Drift — Android Build Guide

This guide walks you through building the Android app from the `android-capacitor` branch.

The same codebase produces **both** the web app (deployed to Vercel) and the
Android app (built as an APK/AAB). No separate repos needed.

---

## Prerequisites

1. **Node.js** 18+ (`node --version`)
2. **Android Studio** (latest) — includes the Android SDK
3. **JDK 17** (bundled with Android Studio, or install separately)
4. **Git**

---

## Step 1 — Clone & install

```bash
git clone -b android-capacitor https://github.com/hasnaingulzar20-blip/luna-drift.git
cd luna-drift
npm install
```

## Step 2 — Environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

Get these from your Supabase dashboard → Settings → API.

## Step 3 — Build the web app (static export)

```bash
npm run build
```

This produces an `out/` directory containing the static HTML/JS/CSS files.
Capacitor bundles these into the Android app.

## Step 4 — Add the Android platform (first time only)

```bash
npx cap add android
```

This creates an `android/` directory — a full Android Studio project.

## Step 5 — Sync the web build into Android

```bash
npx cap sync android
```

Run this every time you rebuild the web app.

## Step 6 — Open in Android Studio

```bash
npx cap open android
```

Android Studio opens with the project loaded.

---

## Step 7 — Configure deep links (for OAuth)

If you want Google/Facebook login buttons to work on Android, you need
to register a deep link so the browser can redirect back to the app.

### 7a. AndroidManifest.xml

Open `android/app/src/main/AndroidManifest.xml` and add this inside the
`<activity>` tag (before the closing `</activity>`):

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="lunadrift" android:host="auth" />
</intent-filter>
```

### 7b. Supabase redirect URLs

Go to your Supabase dashboard → Authentication → URL Configuration:
- **Site URL**: `lunadrift://auth/callback`
- **Redirect URLs**: add `lunadrift://auth/callback`

---

## Step 8 — Test on an emulator or device

1. In Android Studio, select an emulator (or connect a physical device via USB)
2. Click the green **Run** button (or press Shift+F10)
3. The app installs and opens on the device

### Testing background audio

1. Start a soundscape
2. Press the power button to turn off the screen
3. The audio should keep playing (a foreground notification appears)
4. Turn the screen back on — the app is still running

---

## Step 9 — Build the APK (for testing)

In Android Studio:
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. The APK appears in `android/app/build/outputs/apk/debug/`
3. Install it on a device: `adb install app-debug.apk`

---

## Step 10 — Build the AAB (for Play Store)

1. **Build** → **Generate Signed Bundle / APK**
2. Choose **Android App Bundle**
3. Create or select a keystore (keep this safe — you need it for every update)
4. Choose **release** build variant
5. The AAB appears in `android/app/build/outputs/bundle/release/`

---

## Step 11 — Upload to Play Store

1. Go to the [Google Play Console](https://play.google.com/console)
2. Pay the one-time $25 registration fee
3. Create a new app → fill in store listing
4. Upload the AAB under **Production** → **Create release**
5. Submit for review (usually approved in 1-3 days)

---

## Ads — AdMob (native) vs AdSense (web)

The codebase already has AdSense for the web version. For Android, you need
**Google AdMob**:

1. Create an AdMob account at https://admob.google.com
2. Create an app → get the App ID
3. Create ad units (banner, interstitial)
4. Add the `@capacitor-community/admob` plugin:
   ```bash
   npm install @capacitor-community/admob
   npx cap sync android
   ```
5. Initialize AdMob in `src/app/layout.tsx` (platform-aware)
6. Replace the `AdSlot` component's native branch with AdMob calls

The `ad-slot.tsx` component already returns `null` on native — when you're
ready, replace that with AdMob ad calls.

---

## Quick commands

```bash
npm run build           # build the web app (static export)
npx cap sync android    # sync to android
npx cap open android    # open in android studio
npm run mobile:build    # build + sync + open (all in one)
```

---

## Troubleshooting

### Build fails with "output: export" error
Make sure no server-side features are used. The `android-capacitor` branch
has already removed all API routes, middleware, and Prisma.

### White screen on Android
Check that `out/` directory exists and contains `index.html`. Run
`npm run build` first, then `npx cap sync android`.

### Audio stops when screen is off
The `@capacitor-community/background-mode` plugin keeps the WebView alive.
If audio stops, make sure the plugin is installed: `npm install @capacitor-community/background-mode`.

### OAuth doesn't redirect back
Make sure the deep link is configured (Step 7) and the redirect URL
`lunadrift://auth/callback` is added to your Supabase dashboard.

---

## What changed from the web version?

| Before (main) | After (android-capacitor) |
|---|---|
| `output: "standalone"` | `output: "export"` |
| API routes (`/api/*`) | Client-side Supabase calls (`src/lib/supabase-data.ts`) |
| Middleware (session cookies) | Client-side Supabase auth |
| Prisma + SQLite/Postgres | Supabase client (RLS policies already in place) |
| `sitemap.ts` (dynamic) | `public/sitemap.xml` (static) |
| No Capacitor | Capacitor + background-mode plugin |
| AdSense only | AdSense (web) + AdMob-ready (native) |

The web version still works — deploy the static export to Vercel.
