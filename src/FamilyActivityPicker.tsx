import { requireNativeViewManager } from 'expo-modules-core'
import { ComponentType, useEffect } from 'react'
import { Platform, View, ViewProps } from 'react-native'

export type FamilyActivitySelectionCounts = {
  applicationCount: number
  categoryCount: number
  webDomainCount: number
}

export type FamilyActivityPickerProps = ViewProps & {
  headerTitle?: string
  /**
   * Fires with selection counts only — applicationCount, categoryCount, and
   * webDomainCount. The underlying ApplicationTokens stay opaque on the iOS
   * side. To act on the selection (block, restrict, or resolve names), the
   * upcoming M4 DeviceActivityReport extension is required.
   */
  onSelectionCountsChange?: (event: {
    nativeEvent: FamilyActivitySelectionCounts
  }) => void
}

const NativePicker: ComponentType<FamilyActivityPickerProps> | null =
  Platform.OS === 'ios'
    ? requireNativeViewManager<FamilyActivityPickerProps>(
        'ExpoListInstalledApps',
        'FamilyActivityPicker',
      )
    : null

export function FamilyActivityPicker(props: FamilyActivityPickerProps) {
  useEffect(() => {
    if (!NativePicker && __DEV__) {
      console.warn(
        '[expo-list-installed-apps] FamilyActivityPicker is only available on iOS 16+. ' +
          'Check getPlatformCapabilities().familyControlsAvailable before rendering.',
      )
    }
  }, [])

  if (NativePicker) {
    return <NativePicker {...props} />
  }
  return <View {...props} />
}
