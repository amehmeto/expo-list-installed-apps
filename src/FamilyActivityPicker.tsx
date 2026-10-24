import { requireNativeViewManager } from 'expo-modules-core'
import { type ComponentType, useEffect } from 'react'
import { Platform, View, type ViewProps } from 'react-native'

export type FamilyActivitySelectionCounts = {
  applicationCount: number
  categoryCount: number
  webDomainCount: number
  /**
   * The picked apps, categories and web domains are exactly the saved ones.
   * Compared on the tokens, so swapping one app for another is a change even
   * when the counts stay the same.
   */
  isSameAsSavedSelection: boolean
  /** Every saved app, category and web domain is still picked. */
  isSupersetOfSavedSelection: boolean
}

export type FamilyActivityPickerProps = ViewProps & {
  headerTitle?: string
  /**
   * Opens the picker on the saved selection, and compares each change with
   * it. Leave it off when the screen edits something that does not own the
   * saved selection: the picker then opens empty and compares with nothing.
   */
  restoresSavedSelection?: boolean
  /**
   * Fires with selection counts only — applicationCount, categoryCount, and
   * webDomainCount. The underlying ApplicationTokens stay opaque on the iOS
   * side. To act on the selection (block, restrict, or resolve names), the
   * upcoming M4 DeviceActivityReport extension is required.
   *
   * Each change goes to a draft. Call `saveFamilyActivitySelectionDraft()` to
   * make it the saved selection, or `discardFamilyActivitySelectionDraft()`
   * to drop it.
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
