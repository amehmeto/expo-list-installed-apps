import Foundation

#if canImport(FamilyControls)
import FamilyControls
#endif

enum AppGroupStore {
  static let infoPlistKey = "EXListInstalledAppsAppGroup"
  static let selectionKey = "pickerSelection"
  static let resolvedAppsKey = "resolvedApps"

  static var appGroupId: String? {
    Bundle.main.object(forInfoDictionaryKey: infoPlistKey) as? String
  }

  static var defaults: UserDefaults? {
    guard let id = appGroupId else { return nil }
    return UserDefaults(suiteName: id)
  }
}

#if canImport(FamilyControls)
@available(iOS 16.0, *)
enum AppGroupSelectionStore {
  static func persist(_ selection: FamilyActivitySelection) {
    guard let defaults = AppGroupStore.defaults,
          let data = try? JSONEncoder().encode(selection) else {
      return
    }
    defaults.set(data, forKey: AppGroupStore.selectionKey)
  }
}
#else
enum AppGroupSelectionStore {
  static func persist(_ selection: Any) {}
}
#endif
