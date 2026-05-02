export const EXTENSION_TARGET_NAME = 'DeviceActivityReportExtension'

const swiftEntryTemplate = `import DeviceActivity
import SwiftUI

@main
struct DeviceActivityReportExtensionMain: DeviceActivityReportExtension {
  var body: some DeviceActivityReportScene {
    TotalActivityReport { _ in TotalActivityView() }
  }
}

struct TotalActivityView: View {
  var body: some View {
    Text("")
  }
}
`

const totalActivityReportTemplate = (
  appGroup: string,
) => `import DeviceActivity
import FamilyControls
import Foundation
import os.log
import SwiftUI

extension DeviceActivityReport.Context {
  static let totalActivity = Self("TotalActivity")
}

// Log to Console.app (subsystem visible when filtering by the host app's
// bundle id). Extensions can't print to the host process, so this is the
// only way to surface failures from inside the extension.
private let extensionLog = OSLog(
  subsystem: "expo-list-installed-apps",
  category: "DeviceActivityReportExtension"
)

struct TotalActivityReport: DeviceActivityReportScene {
  let context: DeviceActivityReport.Context = .totalActivity
  // The protocol requires a synchronous content builder — async work happens
  // inside makeConfiguration. We pass an empty marker String through.
  let content: (String) -> TotalActivityView

  func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> String {
    await TokenResolver.resolveAndPersist(from: data)
    return ""
  }
}

enum TokenResolver {
  // App Group identifier — template-baked at prebuild time. The main module
  // reads it from Info.plist via AppGroupStore, but the extension's Info.plist
  // is also plugin-generated, so baking the constant here keeps the extension
  // self-contained and avoids round-tripping through another Info.plist key.
  // The plugin re-renders this file on every prebuild, so it stays in sync.
  static let appGroup = "${appGroup}"
  static let storageKey = "resolvedApps"
  static let errorKey = "resolvedAppsError"

  static func resolveAndPersist(from results: DeviceActivityResults<DeviceActivityData>) async {
    var resolved: [[String: String]] = []
    var seen = Set<String>()

    for await data in results {
      for await activitySegment in data.activitySegments {
        for await categoryActivity in activitySegment.categories {
          for await applicationActivity in categoryActivity.applications {
            let app = applicationActivity.application
            let bundleId = app.bundleIdentifier ?? ""
            let displayName = app.localizedDisplayName ?? ""
            let dedupeKey = bundleId.isEmpty ? displayName : bundleId
            if dedupeKey.isEmpty || seen.contains(dedupeKey) { continue }
            seen.insert(dedupeKey)
            resolved.append([
              "appName": displayName,
              "bundleId": bundleId,
            ])
          }
        }
      }
    }

    guard let defaults = UserDefaults(suiteName: appGroup) else {
      os_log(
        "Failed to open shared UserDefaults for App Group %{public}@",
        log: extensionLog,
        type: .error,
        appGroup
      )
      return
    }

    do {
      let data = try JSONEncoder().encode(resolved)
      defaults.set(data, forKey: storageKey)
      defaults.removeObject(forKey: errorKey)
    } catch {
      os_log(
        "Failed to encode resolved apps: %{public}@",
        log: extensionLog,
        type: .error,
        String(describing: error)
      )
      defaults.set(String(describing: error), forKey: errorKey)
    }
  }
}
`

const infoPlistTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>${EXTENSION_TARGET_NAME}</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.deviceactivity.report-extension</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).DeviceActivityReportExtensionMain</string>
  </dict>
</dict>
</plist>
`

const entitlementsTemplate = (
  appGroup: string,
) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.developer.family-controls</key>
  <true/>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${appGroup}</string>
  </array>
</dict>
</plist>
`

export const templateFiles = (
  appGroup: string,
): Record<string, string> => ({
  'DeviceActivityReportExtension.swift': swiftEntryTemplate,
  'TotalActivityReport.swift': totalActivityReportTemplate(appGroup),
  'Info.plist': infoPlistTemplate,
  [`${EXTENSION_TARGET_NAME}.entitlements`]: entitlementsTemplate(appGroup),
})
