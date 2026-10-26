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
  @State private var hasUserChanged = false

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
        .onAppear(perform: seedSelection)
        // The prop can arrive after the first appearance.
        .onChange(of: props.restoresSavedSelection) { _ in
          seedSelection()
        }
        // Compares tokens, not values: the seed write, or a selection Apple
        // writes back in another form, is not a user change.
        .onChange(of: selection) { newValue in
          let baseline = savedBaseline()
          if !newValue.hasSameTokens(as: baseline) {
            hasUserChanged = true
          }
          // A draft with the saved tokens is no draft: Save then keeps the
          // saved selection and the names resolved for it.
          let saved = AppGroupSelectionStore.loadSaved() ?? FamilyActivitySelection()
          if newValue.hasSameTokens(as: saved) {
            AppGroupSelectionStore.discardDraft()
          } else {
            AppGroupSelectionStore.persistDraft(newValue)
          }
          sendCounts(of: newValue, against: baseline)
        }
    }
  }

  private func seedSelection() {
    guard !hasUserChanged else { return }
    let seed = savedBaseline()
    // A draft left by an earlier session (app killed, screen closed without
    // a discard) is not part of this one.
    AppGroupSelectionStore.discardDraft()
    if seed != selection {
      selection = seed
    }
    // The app gets the opening state before the first tap.
    sendCounts(of: seed, against: seed)
  }

  private func sendCounts(
    of value: FamilyActivitySelection,
    against baseline: FamilyActivitySelection
  ) {
    props.onSelectionCountsChange([
      "applicationCount": value.applicationTokens.count,
      "categoryCount": value.categoryTokens.count,
      "webDomainCount": value.webDomainTokens.count,
      "isSameAsSavedSelection": value.hasSameTokens(as: baseline),
      "isSupersetOfSavedSelection": value.keepsTokens(of: baseline),
    ])
  }

  private func savedBaseline() -> FamilyActivitySelection {
    guard props.restoresSavedSelection else { return FamilyActivitySelection() }
    return AppGroupSelectionStore.loadSaved() ?? FamilyActivitySelection()
  }
}
#endif
