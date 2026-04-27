import { requireNativeViewManager } from 'expo-modules-core'
import { ComponentType } from 'react'
import { Platform, View, ViewProps } from 'react-native'

export type FamilyActivitySelectionSummary = {
  applicationCount: number
  categoryCount: number
  webDomainCount: number
}

export type FamilyActivityPickerViewProps = ViewProps & {
  headerTitle?: string
  onSelectionChange?: (event: {
    nativeEvent: FamilyActivitySelectionSummary
  }) => void
}

const NativePicker: ComponentType<FamilyActivityPickerViewProps> | null =
  Platform.OS === 'ios'
    ? requireNativeViewManager<FamilyActivityPickerViewProps>(
        'ExpoListInstalledApps',
        'FamilyActivityPickerView',
      )
    : null

export function FamilyActivityPickerView(props: FamilyActivityPickerViewProps) {
  if (NativePicker) {
    return <NativePicker {...props} />
  }
  return <View {...props} />
}
