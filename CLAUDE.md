# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expo native module (`@amehmeto/expo-list-installed-apps`) that lists installed apps on Android devices. Android-only — no iOS or web support. Uses Expo's module system to bridge TypeScript to native Kotlin.

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

# Example app setup
cd example && npm ci && npx expo prebuild --platform android --no-install
```

## Architecture

**TypeScript layer** (`src/`):

- `index.ts` — Public API: `listInstalledApps(options?)` returns `Promise<InstalledApp[]>`. Validates native response and applies defaults (`AppType.ALL`, `UniqueBy.PACKAGE`).
- `ExpoListInstalledAppsModule.ts` — Native bridge via `requireNativeModule('ExpoListInstalledApps')` from expo-modules-core.
- `ExpoListInstalledApps.types.ts` — Type definitions: `InstalledApp`, `AppType` enum (user/system/all), `UniqueBy` enum (none/package).

**Native Android layer** (`android/src/main/java/expo/modules/listinstalledapps/`):

- `ExpoListInstalledAppsModule.kt` — Kotlin module extending `expo.modules.kotlin.modules.Module`. Queries launcher activities via `PackageManager`, filters by app type using `ApplicationInfo.FLAG_SYSTEM`, deduplicates by package name, converts icons to base64 PNG. Handles API level differences (TIRAMISU for ResolveInfoFlags, P for longVersionCode, O for AdaptiveIconDrawable).
- `PlaceholderIcon.kt` — Base64 fallback icon constant.

**Module registration**: `expo-module.config.json` registers the Android module for Expo autolinking.

**Example app** (`example/`): Working Expo app demonstrating the module. Metro config uses monorepo setup pointing to parent directory.

## Code Style

- Prettier: single quotes, trailing commas, no semicolons
- TypeScript tests use `jest.mock()` for native module injection
- Kotlin tests use JUnit 4 + Mockito
- Husky pre-commit runs lint-staged; pre-push blocks direct master push and runs full test suite + detekt

## CI/CD

- GitHub Actions CI: lint → type check → build → Jest tests → Android Kotlin tests → APK build
- Semantic Release on master via `.releaserc.json` (commit-analyzer, npm publish disabled)
