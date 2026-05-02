import ExpoModulesCore
import SwiftUI

#if canImport(FamilyControls)
import FamilyControls
#endif

public final class FamilyActivityPickerProps: ExpoSwiftUI.ViewProps {
  @Field public var headerTitle: String = ""
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

  // TODO: when the iOS floor moves to 17, use FamilyActivityPicker(headerText:selection:)
  // and drop the manual Text() wrapper.
  var body: some View {
    VStack(spacing: 0) {
      if !props.headerTitle.isEmpty {
        Text(props.headerTitle)
          .font(.headline)
          .padding()
      }
      FamilyControls.FamilyActivityPicker(selection: $selection)
        .onChange(of: selection) { newValue in
          props.onSelectionCountsChange([
            "applicationCount": newValue.applicationTokens.count,
            "categoryCount": newValue.categoryTokens.count,
            "webDomainCount": newValue.webDomainTokens.count,
          ])
          // Drop stale resolved data so getResolvedApps() doesn't return
          // names from the previous selection while the OS reschedules the
          // report extension for the new one.
          if let defaults = AppGroupStore.defaults {
            defaults.removeObject(forKey: AppGroupStore.resolvedAppsKey)
            AppGroupSelectionStore.persist(newValue)
          }
        }
    }
  }
}
#endif
