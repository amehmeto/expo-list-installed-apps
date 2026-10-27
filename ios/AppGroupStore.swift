import Foundation

#if canImport(FamilyControls)
import FamilyControls
#endif

enum AppGroupStore {
  static let infoPlistKey = "EXListInstalledAppsAppGroup"
  static let selectionKey = "pickerSelection"
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
//
// The draft lives in memory, not in the App Group: the report extension
// never reads it, and a draft from a killed app must not come back. Each
// picker owns the draft it writes, and drops only its own draft when it
// closes, so a second picker cannot delete the edit of the first. One draft
// at a time: the last picker that changes it owns it.
//
// Main queue only: the picker runs there, and the module functions run
// there through runOnQueue(.main).
@available(iOS 16.0, *)
enum AppGroupSelectionStore {
  private static var draft: (owner: UUID, selection: FamilyActivitySelection)?

  static func loadSaved() -> FamilyActivitySelection? {
    guard let data = AppGroupStore.defaults?.data(forKey: AppGroupStore.selectionKey) else {
      return nil
    }
    return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
  }

  static func persistDraft(_ selection: FamilyActivitySelection, owner: UUID) {
    draft = (owner, selection)
  }

  static func discardDraft(owner: UUID) {
    guard draft?.owner == owner else { return }
    draft = nil
  }

  static func discardDraft() {
    draft = nil
  }

  static func saveDraft() {
    guard let selection = draft?.selection else { return }
    draft = nil
    if let saved = loadSaved(), selection.hasSameTokens(as: saved) {
      // Same tokens: the resolved names are still right, keep them.
      return
    }
    // Short-circuit before encoding when no App Group is configured —
    // consumers can enable familyControls without appGroups, in which case
    // there's nowhere to write and JSON encoding the selection is wasted work.
    guard let defaults = AppGroupStore.defaults,
          let data = try? JSONEncoder().encode(selection) else {
      return
    }
    defaults.set(data, forKey: AppGroupStore.selectionKey)
    // Drop stale resolved data so getResolvedApps() doesn't return names from
    // the previous selection while the OS reschedules the report extension
    // for the new one.
    defaults.removeObject(forKey: AppGroupStore.resolvedAppsKey)
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
