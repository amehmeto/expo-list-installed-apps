import Foundation

#if canImport(FamilyControls)
import FamilyControls
#endif

enum AppGroupStore {
  static let infoPlistKey = "EXListInstalledAppsAppGroup"
  static let selectionKey = "pickerSelection"
  static let selectionDraftKey = "pickerSelectionDraft"
  static let resolvedAppsKey = "resolvedApps"
  static let resolvedAppsErrorKey = "resolvedAppsError"

  static var appGroupId: String? {
    Bundle.main.object(forInfoDictionaryKey: infoPlistKey) as? String
  }

  static var defaults: UserDefaults? {
    guard let id = appGroupId else { return nil }
    return UserDefaults(suiteName: id)
  }
}

#if canImport(FamilyControls)
// The picker edits a draft. The saved selection only changes when the app
// saves that draft, so an edit the user discards never reaches it.
@available(iOS 16.0, *)
enum AppGroupSelectionStore {
  static func loadSaved() -> FamilyActivitySelection? {
    load(forKey: AppGroupStore.selectionKey)
  }

  static func loadDraft() -> FamilyActivitySelection? {
    load(forKey: AppGroupStore.selectionDraftKey)
  }

  static func persistDraft(_ selection: FamilyActivitySelection) {
    // Short-circuit before encoding when no App Group is configured —
    // consumers can enable familyControls without appGroups, in which case
    // there's nowhere to write and JSON encoding the selection is wasted work.
    guard let defaults = AppGroupStore.defaults else { return }
    guard let data = try? JSONEncoder().encode(selection) else { return }
    defaults.set(data, forKey: AppGroupStore.selectionDraftKey)
  }

  static func saveDraft() {
    guard let defaults = AppGroupStore.defaults,
          let draft = defaults.data(forKey: AppGroupStore.selectionDraftKey) else {
      return
    }
    defaults.set(draft, forKey: AppGroupStore.selectionKey)
    // Drop stale resolved data so getResolvedApps() doesn't return names from
    // the previous selection while the OS reschedules the report extension
    // for the new one.
    defaults.removeObject(forKey: AppGroupStore.resolvedAppsKey)
    defaults.removeObject(forKey: AppGroupStore.selectionDraftKey)
  }

  static func discardDraft() {
    AppGroupStore.defaults?.removeObject(forKey: AppGroupStore.selectionDraftKey)
  }

  private static func load(forKey key: String) -> FamilyActivitySelection? {
    guard let data = AppGroupStore.defaults?.data(forKey: key) else { return nil }
    return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
  }
}
#endif
