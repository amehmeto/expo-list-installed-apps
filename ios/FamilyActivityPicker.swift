import ExpoModulesCore
import SwiftUI

#if canImport(FamilyControls)
import FamilyControls
#endif

public final class FamilyActivityPickerProps: ExpoSwiftUI.ViewProps {
  @Field public var headerTitle: String = ""
  @Field public var restoresSavedSelection: Bool = false
  public var onSelectionCountsChange = EventDispatcher()
}

public struct FamilyActivityPicker: ExpoSwiftUI.View, ExpoSwiftUI.WithHostingView {
  public var props: FamilyActivityPickerProps

  public init(props: FamilyActivityPickerProps) {
    self.props = props
  }

  public var body: some View {
    Group {
      #if canImport(FamilyControls)
      if #available(iOS 16.0, *) {
        FamilyActivityPickerInner(props: props)
      } else {
        EmptyView()
      }
      #else
      EmptyView()
      #endif
    }
  }
}

#if canImport(FamilyControls)
@available(iOS 16.0, *)
private struct FamilyActivityPickerInner: View {
  @ObservedObject var props: FamilyActivityPickerProps
  @State private var selection = FamilyActivitySelection()
  // The selection the picker opened on. Nil until the first seed.
  @State private var baseline: FamilyActivitySelection?
  @State private var hasUserChanged = false
  @State private var lastSentCounts: SelectionCounts?
  @State private var draftOwner = UUID()

  // TODO: when the iOS floor moves to 17:
  //   1. Use FamilyActivityPicker(headerText:selection:) and drop the manual
  //      Text() wrapper.
  //   2. Switch to the `onChange(of:initial:_:)` two-parameter closure form;
  //      the single-parameter `onChange(of:_:)` form below is deprecated.
  var body: some View {
    VStack(spacing: 0) {
      if !props.headerTitle.isEmpty {
        Text(props.headerTitle)
          .font(.headline)
          .padding()
      }
      FamilyControls.FamilyActivityPicker(selection: $selection)
        .onAppear {
          // Wait one main-queue turn, so a prop set in the same update as
          // the mount is there before the first seed and its event.
          DispatchQueue.main.async(execute: seedSelection)
        }
        // The prop can still arrive later than that.
        .onChange(of: props.restoresSavedSelection) { _ in
          seedSelection()
        }
        // A picker closed without a save or a discard leaves no draft.
        .onDisappear {
          AppGroupSelectionStore.discardDraft(owner: draftOwner)
        }
        // Compares tokens, not values: the seed write, or a selection Apple
        // writes back in another form, is not a user change.
        .onChange(of: selection) { newValue in
          guard let baseline else { return }
          if newValue.hasSameTokens(as: baseline) {
            // Back to the opening state: nothing to save.
            AppGroupSelectionStore.discardDraft(owner: draftOwner)
          } else {
            hasUserChanged = true
            AppGroupSelectionStore.persistDraft(newValue, owner: draftOwner)
          }
          sendCounts(of: newValue, against: baseline)
        }
    }
  }

  private func seedSelection() {
    guard !hasUserChanged else { return }
    let seed = props.restoresSavedSelection
      ? AppGroupSelectionStore.loadSaved() ?? FamilyActivitySelection()
      : FamilyActivitySelection()
    baseline = seed
    AppGroupSelectionStore.discardDraft(owner: draftOwner)
    if seed != selection {
      selection = seed
    }
    // The app gets the opening state before the first tap. The onChange that
    // the seed write fires sends the same counts, which sendCounts drops.
    sendCounts(of: seed, against: seed)
  }

  private func sendCounts(
    of value: FamilyActivitySelection,
    against baseline: FamilyActivitySelection
  ) {
    let counts = SelectionCounts(
      applicationCount: value.applicationTokens.count,
      categoryCount: value.categoryTokens.count,
      webDomainCount: value.webDomainTokens.count,
      isSameAsSavedSelection: value.hasSameTokens(as: baseline),
      isSupersetOfSavedSelection: value.keepsTokens(of: baseline)
    )
    guard counts != lastSentCounts else { return }
    lastSentCounts = counts
    props.onSelectionCountsChange([
      "applicationCount": counts.applicationCount,
      "categoryCount": counts.categoryCount,
      "webDomainCount": counts.webDomainCount,
      "isSameAsSavedSelection": counts.isSameAsSavedSelection,
      "isSupersetOfSavedSelection": counts.isSupersetOfSavedSelection,
    ])
  }
}

private struct SelectionCounts: Equatable {
  let applicationCount: Int
  let categoryCount: Int
  let webDomainCount: Int
  let isSameAsSavedSelection: Bool
  let isSupersetOfSavedSelection: Bool
}
#endif
