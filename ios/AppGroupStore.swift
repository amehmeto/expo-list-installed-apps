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
    // Short-circuit before encoding when no App Group is configured —
    // consumers can enable familyControls without appGroups, in which case
    // there's nowhere to write and JSON encoding the selection is wasted work.
    guard let defaults = AppGroupStore.defaults else { return }
    guard let data = try? JSONEncoder().encode(selection) else { return }
    defaults.set(data, forKey: AppGroupStore.selectionKey)
  }
}
#endif
