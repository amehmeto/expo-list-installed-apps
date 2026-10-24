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
  @State private var pendingSeed: FamilyActivitySelection?
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
        .onChange(of: selection) { newValue in
          if let seed = pendingSeed, newValue == seed {
            pendingSeed = nil
            return
          }
          hasUserChanged = true
          AppGroupSelectionStore.persistDraft(newValue)
          let baseline = savedBaseline()
          props.onSelectionCountsChange([
            "applicationCount": newValue.applicationTokens.count,
            "categoryCount": newValue.categoryTokens.count,
            "webDomainCount": newValue.webDomainTokens.count,
            "isSameAsSavedSelection": newValue.hasSameTokens(as: baseline),
            "isSupersetOfSavedSelection": newValue.keepsTokens(of: baseline),
          ])
        }
    }
  }

  private func seedSelection() {
    guard !hasUserChanged else { return }
    let seed = savedBaseline()
    guard seed != selection else { return }
    pendingSeed = seed
    selection = seed
  }

  private func savedBaseline() -> FamilyActivitySelection {
    guard props.restoresSavedSelection else { return FamilyActivitySelection() }
    return AppGroupSelectionStore.loadSaved() ?? FamilyActivitySelection()
  }
}

@available(iOS 16.0, *)
private extension FamilyActivitySelection {
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
