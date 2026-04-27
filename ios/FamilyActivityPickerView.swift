import ExpoModulesCore
import SwiftUI

#if canImport(FamilyControls)
import FamilyControls
#endif

public final class FamilyActivityPickerViewProps: ExpoSwiftUI.ViewProps {
  @Field public var headerTitle: String = ""
  public var onSelectionChange = EventDispatcher()
}

public struct FamilyActivityPickerView: ExpoSwiftUI.View, ExpoSwiftUI.WithHostingView {
  public var props: FamilyActivityPickerViewProps

  public init(props: FamilyActivityPickerViewProps) {
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
  @ObservedObject var props: FamilyActivityPickerViewProps
  @State private var selection = FamilyActivitySelection()

  var body: some View {
    VStack(spacing: 0) {
      if !props.headerTitle.isEmpty {
        Text(props.headerTitle)
          .font(.headline)
          .padding()
      }
      FamilyActivityPicker(selection: $selection)
        .onChange(of: selection) { newValue in
          props.onSelectionChange([
            "applicationCount": newValue.applicationTokens.count,
            "categoryCount": newValue.categoryTokens.count,
            "webDomainCount": newValue.webDomainTokens.count,
          ])
        }
    }
  }
}
#endif
