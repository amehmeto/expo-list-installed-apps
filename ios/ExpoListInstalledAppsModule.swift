import ExpoModulesCore
import UIKit

#if canImport(FamilyControls)
import FamilyControls
#endif

public final class ExpoListInstalledAppsModule: Module {
  // Apple's documented cap on LSApplicationQueriesSchemes. Mirrored at build
  // time by `IOS_SCHEME_LIMIT` in plugin/src/withListInstalledApps.ts —
  // keep both values in sync.
  private static let urlSchemeLimit = 50

  public func definition() -> ModuleDefinition {
    Name("ExpoListInstalledApps")

    AsyncFunction("listInstalledApps") { (_: String, _: String) -> [[String: Any]] in
      return []
    }

    AsyncFunction("canOpenApp") { (scheme: String) -> Bool in
      var trimmed = scheme.trimmingCharacters(in: .whitespacesAndNewlines)
      if trimmed.hasSuffix("://") {
        trimmed = String(trimmed.dropLast(3))
      }
      guard !trimmed.isEmpty, let url = URL(string: "\(trimmed)://") else {
        return false
      }
      return await MainActor.run { UIApplication.shared.canOpenURL(url) }
    }

    AsyncFunction("getPlatformCapabilities") { () -> [String: Any] in
      [
        "platform": "ios",
        "canListInstalledApps": false,
        "canCheckUrlScheme": true,
        "urlSchemeLimit": Self.urlSchemeLimit,
        "requiresSchemeDeclaration": true,
        "requiresRuntimePermission": false,
        "familyControlsAvailable": Self.familyControlsAvailable,
      ]
    }

    AsyncFunction("requestFamilyControlsAuthorization") { () -> Bool in
      #if canImport(FamilyControls)
      if #available(iOS 16.0, *) {
        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        return AuthorizationCenter.shared.authorizationStatus == .approved
      }
      #endif
      return false
    }

    AsyncFunction("getResolvedApps") { () -> [[String: Any]] in
      guard let defaults = AppGroupStore.defaults,
            let data = defaults.data(forKey: AppGroupStore.resolvedAppsKey),
            let entries = try? JSONDecoder().decode([[String: String]].self, from: data) else {
        return []
      }
      return entries.map { entry in
        [
          "appName": entry["appName"] ?? "",
          "packageName": entry["bundleId"] ?? "",
          "versionName": "",
          "versionCode": 0,
          "firstInstallTime": 0,
          "lastUpdateTime": 0,
          "icon": "",
          "apkDir": "",
          "size": 0,
          "activityName": "",
        ] as [String: Any]
      }
    }

    AsyncFunction("getResolvedAppsError") { () -> String? in
      AppGroupStore.defaults?.string(forKey: AppGroupStore.resolvedAppsErrorKey)
    }

    Function("getFamilyControlsAuthorizationStatus") { () -> String in
      #if canImport(FamilyControls)
      if #available(iOS 16.0, *) {
        switch AuthorizationCenter.shared.authorizationStatus {
        case .approved: return "approved"
        case .denied: return "denied"
        case .notDetermined: return "notDetermined"
        @unknown default: return "unknown"
        }
      }
      #endif
      return "unavailable"
    }

    View(FamilyActivityPicker.self)
  }

  private static var familyControlsAvailable: Bool {
    #if canImport(FamilyControls)
    if #available(iOS 16.0, *) { return true }
    #endif
    return false
  }
}
