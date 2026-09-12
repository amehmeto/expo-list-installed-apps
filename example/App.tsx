import * as ExpoListInstalledApps from 'expo-list-installed-apps'
import {
  AuthorizationStatus,
  getFamilyControlsAuthorizationStatus,
  getResolvedApps,
  getResolvedAppsError,
  requestFamilyControlsAuthorization,
} from 'expo-list-installed-apps'
import {
  AppType,
  InstalledApp,
  PlatformCapabilities,
} from 'expo-list-installed-apps/ExpoListInstalledApps.types'
import {
  FamilyActivityPicker,
  FamilyActivitySelectionCounts,
} from 'expo-list-installed-apps/picker'
import { memo, useCallback, useEffect, useState } from 'react'
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context'

import {
  CONTENT_MAX_WIDTH,
  Panel as PanelTokens,
  TOUCH_GAP,
  TOUCH_TARGET,
  spacing,
  useTheme,
} from './theme'

// Dedupe against the catalog so future catalog additions can't double up.
const PROBE_SCHEMES = Array.from(
  new Set([
    ...ExpoListInstalledApps.DEFAULT_IOS_APP_SCHEMES,
    'maps',
    'music',
    'messages',
    'facetime',
    'mailto',
  ]),
)

const APP_TYPE_FILTER_LABEL: Record<AppType, string> = {
  [AppType.ALL]: 'All',
  [AppType.USER]: 'User',
  [AppType.SYSTEM]: 'System',
}

const AUTH_STATUS_LABEL: Record<AuthorizationStatus, string> = {
  approved: 'Approved',
  denied: 'Denied',
  notDetermined: 'Not requested yet',
  unavailable: 'Unavailable on this device',
  unknown: 'Unrecognised status',
}

const CAPABILITY_LABEL: Record<keyof PlatformCapabilities, string> = {
  platform: 'Platform',
  canListInstalledApps: 'Can list installed apps',
  canCheckUrlScheme: 'Can check URL schemes',
  urlSchemeLimit: 'URL scheme limit',
  requiresSchemeDeclaration: 'Requires scheme declaration',
  requiresRuntimePermission: 'Requires runtime permission',
  familyControlsAvailable: 'Family Controls available',
}

const isAndroid = Platform.OS === 'android'
const isIOS = Platform.OS === 'ios'

// Intl ships with Hermes on current React Native, but the example must not
// crash on an engine build without it.
const collator =
  typeof Intl !== 'undefined' && typeof Intl.Collator === 'function'
    ? new Intl.Collator(undefined, { sensitivity: 'base' })
    : null

function compareByName(a: InstalledApp, b: InstalledApp) {
  return collator
    ? collator.compare(a.appName, b.appName)
    : a.appName.localeCompare(b.appName)
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function formatCapability(
  value: PlatformCapabilities[keyof PlatformCapabilities],
) {
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (value === null) return 'no limit'
  return String(value)
}

function keyExtractor(item: InstalledApp) {
  return item.packageName
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    let active = true
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduced(enabled)
    })
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    )
    return () => {
      active = false
      subscription.remove()
    }
  }, [])

  return reduced
}

function ActionButton({
  label,
  onPress,
  variant = 'secondary',
  disabled = false,
  busy = false,
  fill = false,
}: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  busy?: boolean
  fill?: boolean
}) {
  const theme = useTheme()
  const isPrimary = variant === 'primary'
  const isDisabled = disabled || busy
  const foreground = isPrimary ? theme.onPrimary : theme.onSurface

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        fill && styles.actionFill,
        {
          backgroundColor: isPrimary ? theme.primary : theme.surfaceVariant,
          borderColor: isPrimary ? theme.primary : theme.outline,
          opacity: isDisabled ? 0.5 : pressed ? 0.82 : 1,
        },
      ]}
    >
      {busy && <ActivityIndicator size="small" color={foreground} />}
      <Text style={[styles.actionLabel, { color: foreground }]}>{label}</Text>
    </Pressable>
  )
}

function Panel({
  title,
  tokens,
  children,
}: {
  title: string
  tokens: PanelTokens
  children: React.ReactNode
}) {
  return (
    <View style={[styles.panel, { backgroundColor: tokens.background }]}>
      <Text
        accessibilityRole="header"
        style={[styles.panelTitle, { color: tokens.foreground }]}
      >
        {title}
      </Text>
      {children}
    </View>
  )
}

function DetailLine({ text, color }: { text: string; color: string }) {
  return <Text style={[styles.detail, { color }]}>{text}</Text>
}

function ErrorNotice({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  const theme = useTheme()
  return (
    <View
      accessibilityRole="alert"
      style={[styles.notice, { backgroundColor: theme.errorContainer }]}
    >
      <Text style={[styles.noticeText, { color: theme.onErrorContainer }]}>
        {message}
      </Text>
      {onRetry && <ActionButton label="Try again" onPress={onRetry} />}
    </View>
  )
}

function EmptyState({ message }: { message: string }) {
  const theme = useTheme()
  return (
    <View style={styles.centered}>
      <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>
        {message}
      </Text>
    </View>
  )
}

const AppCard = memo(function AppCard({
  item,
  index,
}: {
  item: InstalledApp
  index: number
}) {
  const theme = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)

  // Only the expanded row needs these; building them for every mounted row
  // allocates seven objects per row on each render for nothing.
  const details: { label: string; value: string | number }[] = isExpanded
    ? [
        { label: 'Package Name', value: item.packageName },
        { label: 'Version Name', value: item.versionName },
        { label: 'Version Code', value: item.versionCode },
        { label: 'First Install Time', value: item.firstInstallTime },
        { label: 'Last Update Time', value: item.lastUpdateTime },
        { label: 'APK Directory', value: item.apkDir },
        { label: 'Size', value: `${item.size} bytes` },
      ]
    : []

  return (
    <View style={[styles.appCard, { backgroundColor: theme.surface }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.appName}
        accessibilityHint={
          isExpanded ? 'Hides package details' : 'Shows package details'
        }
        accessibilityState={{ expanded: isExpanded }}
        onPress={() => setIsExpanded((v) => !v)}
        style={({ pressed }) => [
          styles.appCardRow,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        {/*
          The native module base64-encodes each icon at its intrinsic size
          (up to 432px), and this row shows it at 32dp. `resizeMethod="resize"`
          makes the Android decoder downsample to the target box instead of
          holding a full-size ARGB_8888 bitmap per row.
        */}
        <Image
          accessibilityElementsHidden
          importantForAccessibility="no"
          source={{ uri: item.icon }}
          style={styles.appIcon}
          resizeMode="contain"
          resizeMethod="resize"
        />
        <Text style={[styles.appName, { color: theme.onSurface }]}>
          {`${index + 1}. ${item.appName}`}
        </Text>
      </Pressable>
      {isExpanded && (
        <View style={styles.appDetails}>
          {details.map(({ label, value }) => (
            <DetailLine
              key={label}
              color={theme.onSurfaceVariant}
              text={`${label}: ${value}`}
            />
          ))}
        </View>
      )}
    </View>
  )
})

function DetectionPanel() {
  const theme = useTheme()
  const tokens = theme.detectionPanel
  const [results, setResults] = useState<Record<string, boolean> | null>(null)
  const [capabilities, setCapabilities] = useState<PlatformCapabilities | null>(
    null,
  )
  const [showMissing, setShowMissing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const probe = async () => {
    setBusy(true)
    setError(null)
    try {
      const entries = await Promise.all(
        PROBE_SCHEMES.map(
          async (scheme) =>
            [scheme, await ExpoListInstalledApps.canOpenApp(scheme)] as const,
        ),
      )
      setResults(Object.fromEntries(entries))
    } catch (caught) {
      setError(`Could not probe URL schemes: ${describeError(caught)}`)
    } finally {
      setBusy(false)
    }
  }

  const loadCapabilities = async () => {
    setError(null)
    try {
      setCapabilities(await ExpoListInstalledApps.getPlatformCapabilities())
    } catch (caught) {
      setError(`Could not read platform capabilities: ${describeError(caught)}`)
    }
  }

  const installed = results
    ? PROBE_SCHEMES.filter((scheme) => results[scheme])
    : []
  const missing = results
    ? PROBE_SCHEMES.filter((scheme) => !results[scheme])
    : []

  return (
    <Panel title="App detection" tokens={tokens}>
      <View style={styles.buttonRow}>
        <ActionButton
          fill
          label="Probe schemes"
          busy={busy}
          onPress={probe}
          variant="primary"
        />
        <ActionButton fill label="Capabilities" onPress={loadCapabilities} />
      </View>

      {error && <ErrorNotice message={error} onRetry={probe} />}

      {results && (
        <View style={styles.resultBlock}>
          <DetailLine
            color={tokens.foreground}
            text={`Installed (${installed.length} of ${PROBE_SCHEMES.length})`}
          />
          {installed.length === 0 ? (
            <DetailLine
              color={tokens.foregroundMuted}
              text="None of the probed schemes resolved."
            />
          ) : (
            installed.map((scheme) => (
              <DetailLine
                key={scheme}
                color={theme.success}
                text={`${scheme}://`}
              />
            ))
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showMissing }}
            onPress={() => setShowMissing((v) => !v)}
            style={({ pressed }) => [
              styles.inlineToggle,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.inlineToggleLabel, { color: theme.primary }]}>
              {showMissing
                ? `Hide ${missing.length} not installed`
                : `Show ${missing.length} not installed`}
            </Text>
          </Pressable>

          {showMissing &&
            missing.map((scheme) => (
              <DetailLine
                key={scheme}
                color={tokens.foregroundMuted}
                text={`${scheme}://`}
              />
            ))}
        </View>
      )}

      {capabilities && (
        <View style={styles.resultBlock}>
          {(
            Object.keys(CAPABILITY_LABEL) as (keyof PlatformCapabilities)[]
          ).map((key) => (
            <DetailLine
              key={key}
              color={tokens.foregroundMuted}
              text={`${CAPABILITY_LABEL[key]}: ${formatCapability(
                capabilities[key],
              )}`}
            />
          ))}
        </View>
      )}
    </Panel>
  )
}

function PickerModal({
  visible,
  onClose,
  onSelectionChange,
}: {
  visible: boolean
  onClose: () => void
  onSelectionChange: (counts: FamilyActivitySelectionCounts) => void
}) {
  const theme = useTheme()
  const reduceMotion = useReducedMotion()

  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? 'fade' : 'slide'}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[styles.pickerContainer, { backgroundColor: theme.background }]}
      >
        <View
          style={[styles.pickerHeader, { borderBottomColor: theme.separator }]}
        >
          <Text
            accessibilityRole="header"
            style={[styles.pickerTitle, { color: theme.onSurface }]}
          >
            Pick apps to manage
          </Text>
          <ActionButton label="Done" variant="primary" onPress={onClose} />
        </View>
        <FamilyActivityPicker
          style={styles.pickerBody}
          headerTitle="Pick apps to manage"
          onSelectionCountsChange={({ nativeEvent }) =>
            onSelectionChange(nativeEvent)
          }
        />
      </View>
    </Modal>
  )
}

function FamilyControlsPanel() {
  const theme = useTheme()
  const tokens = theme.familyPanel
  const [status, setStatus] = useState<AuthorizationStatus>(() =>
    getFamilyControlsAuthorizationStatus(),
  )
  const [requesting, setRequesting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<boolean | null>(null)
  const [pickerVisible, setPickerVisible] = useState(false)
  const [selection, setSelection] =
    useState<FamilyActivitySelectionCounts | null>(null)
  const [resolved, setResolved] = useState<InstalledApp[] | null>(null)
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)

  const refreshStatus = useCallback(
    () => setStatus(getFamilyControlsAuthorizationStatus()),
    [],
  )

  // The user can grant Screen Time access in Settings and come back, so the
  // status has to be re-read on foreground rather than only on mount.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') refreshStatus()
    })
    return () => subscription.remove()
  }, [refreshStatus])

  const requestAuth = async () => {
    setRequesting(true)
    setAuthError(null)
    try {
      const approved = await requestFamilyControlsAuthorization()
      setLastResult(approved)
      refreshStatus()
    } catch (caught) {
      setLastResult(false)
      setAuthError(
        `Authorization request failed: ${describeError(
          caught,
        )}. Open Settings › Screen Time and try again.`,
      )
    } finally {
      setRequesting(false)
    }
  }

  const refreshResolved = async () => {
    setResolving(true)
    setResolveError(null)
    try {
      const apps = await getResolvedApps()
      setResolved(apps)
      if (apps.length === 0) {
        const reported = await getResolvedAppsError()
        setResolveError(
          reported ??
            'No names resolved yet. The report extension is OS-scheduled — pick apps, then try again in a few seconds.',
        )
      }
    } catch (caught) {
      setResolved(null)
      setResolveError(`Could not read resolved apps: ${describeError(caught)}`)
    } finally {
      setResolving(false)
    }
  }

  const detailLines = [
    `Status: ${AUTH_STATUS_LABEL[status]}`,
    lastResult !== null
      ? `Last request: ${lastResult ? 'approved' : 'declined or unavailable'}`
      : null,
    selection
      ? `Selection: ${selection.applicationCount} apps, ${selection.categoryCount} categories, ${selection.webDomainCount} domains`
      : null,
    resolved && resolved.length > 0
      ? `Resolved (${resolved.length}): ${resolved
          .map((app) => app.appName || app.packageName || 'unnamed')
          .join(', ')}`
      : null,
  ].filter((line): line is string => line !== null)

  return (
    <Panel title="Family Controls" tokens={tokens}>
      {detailLines.map((line) => (
        <DetailLine key={line} color={tokens.foregroundMuted} text={line} />
      ))}

      {authError && <ErrorNotice message={authError} onRetry={requestAuth} />}
      {resolveError && (
        <ErrorNotice message={resolveError} onRetry={refreshResolved} />
      )}

      <View style={styles.buttonColumn}>
        <View style={styles.buttonRow}>
          <ActionButton
            fill
            label="Request authorization"
            busy={requesting}
            onPress={requestAuth}
          />
          <ActionButton fill label="Refresh status" onPress={refreshStatus} />
        </View>
        <View style={styles.buttonRow}>
          <ActionButton
            fill
            label="Show picker"
            variant="primary"
            onPress={() => setPickerVisible(true)}
          />
          <ActionButton
            fill
            label="Resolve picked apps"
            busy={resolving}
            onPress={refreshResolved}
          />
        </View>
      </View>

      <PickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelectionChange={setSelection}
      />
    </Panel>
  )
}

function FilterButtons({
  appType,
  onChange,
}: {
  appType: AppType
  onChange: (type: AppType) => void
}) {
  const theme = useTheme()

  return (
    <View style={styles.filterRow}>
      {(Object.keys(APP_TYPE_FILTER_LABEL) as AppType[]).map((type) => {
        const isActive = appType === type
        return (
          <Pressable
            key={type}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(type)}
            style={({ pressed }) => [
              styles.filterButton,
              {
                backgroundColor: isActive
                  ? theme.primary
                  : theme.surfaceVariant,
                borderColor: isActive ? theme.primary : theme.outline,
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.filterLabel,
                { color: isActive ? theme.onPrimary : theme.onSurface },
              ]}
            >
              {APP_TYPE_FILTER_LABEL[type]}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function InstalledAppsList({
  apps,
  isLoading,
  error,
  onRetry,
  bottomInset,
}: {
  apps: InstalledApp[]
  isLoading: boolean
  error: string | null
  onRetry: () => void
  bottomInset: number
}) {
  const theme = useTheme()

  const renderItem = useCallback(
    ({ item, index }: { item: InstalledApp; index: number }) => (
      <AppCard item={item} index={index} />
    ),
    [],
  )

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          accessibilityLabel="Loading installed apps"
          accessibilityRole="progressbar"
          color={theme.primary}
          size="large"
        />
      </View>
    )
  }

  if (error) return <ErrorNotice message={error} onRetry={onRetry} />

  return (
    <>
      <Text
        accessibilityRole="header"
        style={[styles.sectionTitle, { color: theme.onSurface }]}
      >
        {`Installed apps (${apps.length})`}
      </Text>
      <FlatList
        data={apps}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.list}
        contentContainerStyle={{
          paddingBottom: Math.max(bottomInset, spacing.xl) + spacing.xl,
        }}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        ListEmptyComponent={<EmptyState message="No apps match this filter." />}
      />
    </>
  )
}

function AppContent() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const [appType, setAppType] = useState(AppType.ALL)
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const retry = useCallback(() => setReloadToken((token) => token + 1), [])

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const apps = await ExpoListInstalledApps.listInstalledApps({
          type: appType,
        })
        if (cancelled) return
        setInstalledApps([...apps].sort(compareByName))
      } catch (caught) {
        if (cancelled) return
        setInstalledApps([])
        setError(`Could not read installed apps: ${describeError(caught)}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [appType, reloadToken])

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top,
          paddingLeft: Math.max(insets.left, spacing.xl),
          paddingRight: Math.max(insets.right, spacing.xl),
        },
      ]}
    >
      <StatusBar
        barStyle={theme.scheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <View style={styles.column}>
        {isIOS && (
          <ScrollView
            contentContainerStyle={{
              paddingBottom: insets.bottom + spacing.xxl,
            }}
            showsVerticalScrollIndicator
          >
            <DetectionPanel />
            <FamilyControlsPanel />
          </ScrollView>
        )}
        {isAndroid && (
          <>
            <FilterButtons appType={appType} onChange={setAppType} />
            <InstalledAppsList
              apps={installedApps}
              isLoading={isLoading}
              error={error}
              onRetry={retry}
              bottomInset={insets.bottom}
            />
          </>
        )}
      </View>
    </View>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  list: {
    flex: 1,
  },
  centered: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  panel: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  detail: {
    fontSize: 14,
    lineHeight: 20,
  },
  resultBlock: {
    marginTop: spacing.md,
    gap: 2,
  },
  inlineToggle: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  inlineToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  notice: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
    gap: spacing.md,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  action: {
    minHeight: TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionFill: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TOUCH_GAP,
  },
  buttonColumn: {
    marginTop: spacing.md,
    gap: TOUCH_GAP,
  },
  appCard: {
    marginBottom: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  appCardRow: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  appIcon: {
    width: 32,
    height: 32,
  },
  appName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  appDetails: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: TOUCH_GAP,
    marginVertical: spacing.sm,
  },
  filterButton: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  pickerContainer: {
    flex: 1,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  pickerBody: {
    flex: 1,
  },
})
