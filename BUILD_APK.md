# Building a Lunara APK (no servers required)

This guide produces an installable Android APK for Lunara **without any
Lunara-hosted server**. It was written after inspecting this repository's
source, so the details match the actual project configuration.

## Confirmed: no servers needed

- The app is local-first. Core tracking, forecasts, calendar, reminders, and
  reports all run fully offline.
- There are **no build-time environment variables** to set (the only
  `import.meta.env` use is `DEV`) and **no `.env` file** to create.
- The optional backup relay URL is typed in by *you* at runtime in Settings and
  is empty by default — the app works fine without it.
- AI is optional and bring-your-own-key.
- `google-services.json` is optional (only push notifications need it; its
  absence is handled gracefully).

## Requirements (install on your Windows PC)

- **Git**, **Node.js LTS**, and **pnpm** (`npm install -g pnpm`)
- **Android Studio** — on first launch, let it install the default SDK and
  platform tools. This also provides the correct **JDK 17** and Gradle, which is
  what the project's Android Gradle Plugin 8.13 requires (plain Java 11 will
  NOT work).
- The project targets **compileSdk / targetSdk 36**, **minSdk 24**. Android
  Studio's SDK Manager will fetch SDK Platform 36 and Build-Tools 36 for you.

## Build steps

Run from a terminal (PowerShell or Command Prompt):

```sh
cd Downloads\apps\lunara
pnpm install
pnpm --filter @lunara/app native:sync
```

`native:sync` type-checks, builds the web bundle in native mode, and copies it
into the Android project. **Re-run it after any code change.**

### Option A — Debug APK (simplest, installable immediately)

```sh
cd app\android
gradlew.bat assembleDebug
```

Output: `app\android\app\build\outputs\apk\debug\app-debug.apk`
This is signed with Android's debug key and installs directly on a phone with
"install unknown apps" enabled. Good for testing.

### Option B — Release APK (unsigned, then self-sign)

The project defines a `release` build type but **no signing config**, so Gradle
produces an *unsigned* release APK that you sign yourself. No server involved.

```sh
cd app\android
gradlew.bat assembleRelease
```

Output: `app\android\app\build\outputs\apk\release\app-release-unsigned.apk`

Then create a keystore once and sign it (tools ship with the JDK / Android SDK
build-tools):

```sh
keytool -genkey -v -keystore lunara.keystore -alias lunara -keyalg RSA -keysize 2048 -validity 10000

apksigner sign --ks lunara.keystore --out app-release-signed.apk app-release-unsigned.apk

apksigner verify app-release-signed.apk
```

`app-release-signed.apk` is your installable release build.

### Easiest path of all

Open the Android project in Android Studio and press **Run** with your phone
plugged in (USB debugging on), or use **Build > Generate Signed Bundle / APK**
for a release build with a guided keystore wizard:

```sh
pnpm --filter @lunara/app native:android   # opens the project in Android Studio
```

## Reality check

Per the project's own `docs/FEATURE_PARITY.md`, Lunara is an explicit
work-in-progress with open release blockers (encrypted-storage migration,
physical-device QA, clinical/content review, etc.). A debug or release APK will
build and run, but treat it as a functional test build, not a finished product.
Do not rely on it as your only record of health data.
