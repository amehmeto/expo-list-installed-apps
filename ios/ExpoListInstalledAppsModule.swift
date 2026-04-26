import ExpoModulesCore
import UIKit

public final class ExpoListInstalledAppsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoListInstalledApps")

    AsyncFunction("listInstalledApps") { (_: String, _: String) -> [[String: Any]] in
      return []
    }

    AsyncFunction("canOpenApp") { (scheme: String) -> Bool in
      let trimmed = scheme.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !trimmed.isEmpty, let url = URL(string: "\(trimmed)://") else {
        return false
      }
      return await MainActor.run { UIApplication.shared.canOpenURL(url) }
    }

    AsyncFunction("getPlatformCapabilities") { () -> [String: Any?] in
      [
        "platform": "ios",
        "canListInstalledApps": false,
        "canCheckUrlScheme": true,
        "urlSchemeLimit": 50,
        "requiresSchemeDeclaration": true,
        "requiresRuntimePermission": false,
      ]
    }
  }
}
