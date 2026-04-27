import ExpoModulesCore
import UIKit

#if canImport(FamilyControls)
import FamilyControls
#endif

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
        "familyControlsAvailable": Self.familyControlsAvailable,
      ]
    }

    AsyncFunction("requestFamilyControlsAuthorization") { () -> Bool in
      #if canImport(FamilyControls)
      if #available(iOS 16.0, *) {
        do {
          try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
          return AuthorizationCenter.shared.authorizationStatus == .approved
        } catch {
          return false
        }
      }
      #endif
      return false
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

    View(FamilyActivityPickerView.self)
  }

  private static var familyControlsAvailable: Bool {
    #if canImport(FamilyControls)
    if #available(iOS 16.0, *) { return true }
    #endif
    return false
  }
}
