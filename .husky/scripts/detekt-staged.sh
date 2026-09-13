#!/usr/bin/env sh
set -eu

# Runs detekt on the Kotlin sources through the generated example project.
#
# `example/android` is generated output and is not versioned, so a fresh clone
# has no gradlew until someone runs `expo prebuild`. Skip with a hint instead of
# failing the commit on a path that is meant to be absent.
if [ ! -f "example/android/gradlew" ] ||
  [ ! -d "example/node_modules/expo-modules-autolinking/android/expo-gradle-plugin" ]; then
  printf "⚠️  Android project not generated, skipping detekt.\n"
  printf "   To enable it: cd example && npm ci && npx expo prebuild --platform android --no-install\n"
  exit 0
fi

# Extract module name from package.json (format: @scope/name -> scope-name)
MODULE_NAME=$(node -p "require('./package.json').name.replace('@', '').replace('/', '-')")

echo "Running detekt..."
cd example/android && ./gradlew ":${MODULE_NAME}:detekt"
