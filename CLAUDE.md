# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expo native module (`@amehmeto/expo-list-installed-apps`) that lists installed apps. Cross-platform (Android + iOS); web unsupported. Uses Expo's module system to bridge TypeScript to native Kotlin and Swift. On iOS, `listInstalledApps()` currently returns `[]` — Apple provides no public API to enumerate installed apps. Real iOS detection lands in M2 (URL-scheme probing) and M3 (FamilyActivityPicker). See `docs/ios-implementation-plan.md`.

## Commands

```bash
# Build TypeScript
npm run build

# Lint
npm run lint

# Run TypeScript tests (Jest)
npm test

# Run a single test file
npx jest src/index.test.ts

# Run Kotlin unit tests (from repo root, requires Android SDK)
cd example/android && ./gradlew :amehmeto-expo-list-installed-apps:testDebugUnitTest

# Run Kotlin static analysis
cd example/android && ./gradlew :amehmeto-expo-list-installed-apps:detekt

# Type check without emitting
tsc --noEmit

# Example app setup (Android)
cd example && npm ci && npx expo prebuild --platform android --no-install

# Example app setup (iOS, requires macOS + Xcode + CocoaPods)
cd example && npm ci && npx expo prebuild --platform ios --no-install
cd example/ios && pod install
cd .. && npx expo run:ios
```

## Architecture

**TypeScript layer** (`src/`):

- `index.ts` — Public API: `listInstalledApps(options?)` returns `Promise<InstalledApp[]>`. Validates native response and applies defaults (`AppType.ALL`, `UniqueBy.PACKAGE`).
- `ExpoListInstalledAppsModule.ts` — Native bridge via `requireNativeModule('ExpoListInstalledApps')` from expo-modules-core.
- `ExpoListInstalledApps.types.ts` — Type definitions: `InstalledApp`, `AppType` enum (user/system/all), `UniqueBy` enum (none/package).

**Native Android layer** (`android/src/main/java/expo/modules/listinstalledapps/`):

- `ExpoListInstalledAppsModule.kt` — Kotlin module extending `expo.modules.kotlin.modules.Module`. Queries launcher activities via `PackageManager`, filters by app type using `ApplicationInfo.FLAG_SYSTEM`, deduplicates by package name, converts icons to base64 PNG. Handles API level differences (TIRAMISU for ResolveInfoFlags, P for longVersionCode, O for AdaptiveIconDrawable).
- `PlaceholderIcon.kt` — Base64 fallback icon constant.

**Native iOS layer** (`ios/`):

- `ExpoListInstalledAppsModule.swift` — Swift module extending `Module` from `ExpoModulesCore`. M1 stub: `listInstalledApps(type, uniqueBy)` returns `[]`. Real implementation lands in M2/M3.
- `ExpoListInstalledApps.podspec` — CocoaPods spec; depends on `ExpoModulesCore`, iOS 15.1, Swift 5.9. Reads version/license/etc. from `package.json`.

**Module registration**: `expo-module.config.json` registers both the Android (`expo.modules.listinstalledapps.ExpoListInstalledAppsModule`) and iOS (`ExpoListInstalledAppsModule`) modules for Expo autolinking.

**Example app** (`example/`): Working Expo app demonstrating the module. Metro config uses monorepo setup pointing to parent directory.

## Code Style

- Prettier: single quotes, trailing commas, no semicolons
- TypeScript tests use `jest.mock()` for native module injection
- Kotlin tests use JUnit 4 + Mockito
- Husky pre-commit runs lint-staged; pre-push blocks direct master push and runs full test suite + detekt

## CI/CD

- GitHub Actions CI: lint → type check → build → Jest tests → Android Kotlin tests → APK build → iOS xcodebuild (gated on `ios/**` path filter to keep macOS runner cost down)
- Semantic Release on master via `.releaserc.json` (commit-analyzer, npm publish disabled)
