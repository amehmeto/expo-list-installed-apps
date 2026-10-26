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
    guard let data = AppGroupStore.defaults?.data(forKey: AppGroupStore.selectionKey) else {
      return nil
    }
    return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
  }

  static func persistDraft(_ selection: FamilyActivitySelection) {
    // Short-circuit before encoding when no App Group is configured —
    // consumers can enable familyControls without appGroups, in which case
    // there's nowhere to write and JSON encoding the selection is wasted work.
    guard let defaults = AppGroupStore.defaults else { return }
    guard let data = try? JSONEncoder().encode(selection) else { return }
    defaults.set(data, forKey: AppGroupStore.selectionDraftKey)
  }

  // Call on the main queue, where the picker writes the draft, so a last
  // edit cannot land between the copy and the removal of the draft.
  static func saveDraft() {
    guard let defaults = AppGroupStore.defaults,
          let draftData = defaults.data(forKey: AppGroupStore.selectionDraftKey) else {
      return
    }
    defaults.removeObject(forKey: AppGroupStore.selectionDraftKey)
    if let draft = try? JSONDecoder().decode(FamilyActivitySelection.self, from: draftData),
       let saved = loadSaved(),
       draft.hasSameTokens(as: saved) {
      // Same tokens: the resolved names are still right, keep them.
      return
    }
    defaults.set(draftData, forKey: AppGroupStore.selectionKey)
    // Drop stale resolved data so getResolvedApps() doesn't return names from
    // the previous selection while the OS reschedules the report extension
    // for the new one.
    defaults.removeObject(forKey: AppGroupStore.resolvedAppsKey)
  }

  static func discardDraft() {
    AppGroupStore.defaults?.removeObject(forKey: AppGroupStore.selectionDraftKey)
  }
}

@available(iOS 16.0, *)
extension FamilyActivitySelection {
  func hasSameTokens(as other: FamilyActivitySelection) -> Bool {
    applicationTokens == other.applicationTokens
      && categoryTokens == other.categoryTokens
      && webDomainTokens == other.webDomainTokens
  }

  func keepsTokens(of other: FamilyActivitySelection) -> Bool {
    applicationTokens.isSuperset(of: other.applicationTokens)
      && categoryTokens.isSuperset(of: other.categoryTokens)
      && webDomainTokens.isSuperset(of: other.webDomainTokens)
  }
}
#endif
