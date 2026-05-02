import * as ExpoListInstalledApps from 'expo-list-installed-apps'
import {
  AuthorizationStatus,
  getFamilyControlsAuthorizationStatus,
  getResolvedApps,
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
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Button,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native'
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context'

const PROBE_SCHEMES = ['maps', 'music', 'messages', 'facetime', 'mailto']
const FILTER_ACTIVE = 'blue'
const FILTER_INACTIVE = 'grey'
const APP_TYPE_FILTER_LABEL: Record<AppType, string> = {
  [AppType.ALL]: 'All',
  [AppType.USER]: 'User',
  [AppType.SYSTEM]: 'System',
}

const isAndroid = Platform.OS === 'android'
const isIOS = Platform.OS === 'ios'

function Panel({
  title,
  background,
  children,
}: {
  title: string
  background: ViewStyle['backgroundColor']
  children: React.ReactNode
}) {
  return (
    <View style={[styles.panel, { backgroundColor: background }]}>
      <Text style={styles.header}>{title}</Text>
      {children}
    </View>
  )
}

function DetailLine({ text }: { text: string }) {
  return <Text style={styles.appDetail}>{text}</Text>
}

function AppCard({ item, index }: { item: InstalledApp; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const details: { label: string; value: string | number }[] = [
    { label: 'Package Name', value: item.packageName },
    { label: 'Version Name', value: item.versionName },
    { label: 'Version Code', value: item.versionCode },
    { label: 'First Install Time', value: item.firstInstallTime },
    { label: 'Last Update Time', value: item.lastUpdateTime },
    { label: 'APK Directory', value: item.apkDir },
    { label: 'Size', value: `${item.size} bytes` },
  ]

  return (
    <View style={styles.appContainer}>
      <Pressable
        style={styles.appCardRow}
        onPress={() => setIsExpanded((v) => !v)}
      >
        <Image source={{ uri: item.icon }} style={styles.appIcon} />
        <Text style={styles.appName}>{`${index + 1}. ${item.appName}`}</Text>
      </Pressable>
      {isExpanded && (
        <View>
          {details.map(({ label, value }) => (
            <DetailLine key={label} text={`${label}: ${value}`} />
          ))}
        </View>
      )}
    </View>
  )
}

function DetectionPanel() {
  const [results, setResults] = useState<Record<string, boolean> | null>(null)
  const [capabilities, setCapabilities] = useState<PlatformCapabilities | null>(
    null,
  )
  const [busy, setBusy] = useState(false)

  const probe = async () => {
    setBusy(true)
    try {
      const entries = await Promise.all(
        PROBE_SCHEMES.map(async (s) => [
          s,
          await ExpoListInstalledApps.canOpenApp(s),
        ]),
      )
      setResults(Object.fromEntries(entries) as Record<string, boolean>)
    } finally {
      setBusy(false)
    }
  }

  const loadCapabilities = async () => {
    setCapabilities(await ExpoListInstalledApps.getPlatformCapabilities())
  }

  return (
    <Panel title="App detection" background="#eef2ff">
      <View style={styles.detectionButtons}>
        <Button
          title={busy ? 'Probing...' : 'Probe schemes'}
          onPress={probe}
          disabled={busy}
        />
        <Button title="Capabilities" onPress={loadCapabilities} />
      </View>
      {results && (
        <View>
          {PROBE_SCHEMES.map((s) => (
            <DetailLine
              key={s}
              text={`${s}:// → ${results[s] ? 'installed ✓' : 'not installed'}`}
            />
          ))}
        </View>
      )}
      {capabilities && (
        <DetailLine text={JSON.stringify(capabilities, null, 2)} />
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
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <Button title="Done" onPress={onClose} />
        </View>
        <FamilyActivityPicker
          style={{ flex: 1 }}
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
  const [status, setStatus] = useState<AuthorizationStatus>(() =>
    getFamilyControlsAuthorizationStatus(),
  )
  const [requesting, setRequesting] = useState(false)
  const [lastResult, setLastResult] = useState<boolean | null>(null)
  const [pickerVisible, setPickerVisible] = useState(false)
  const [selection, setSelection] =
    useState<FamilyActivitySelectionCounts | null>(null)
  const [resolved, setResolved] = useState<InstalledApp[] | null>(null)
  const [resolving, setResolving] = useState(false)

  const refreshStatus = () => setStatus(getFamilyControlsAuthorizationStatus())

  const requestAuth = async () => {
    setRequesting(true)
    try {
      const approved = await requestFamilyControlsAuthorization()
      setLastResult(approved)
      refreshStatus()
    } catch (error) {
      console.warn('FamilyControls authorization failed:', error)
      setLastResult(false)
    } finally {
      setRequesting(false)
    }
  }

  const refreshResolved = async () => {
    setResolving(true)
    try {
      setResolved(await getResolvedApps())
    } finally {
      setResolving(false)
    }
  }

  const detailLines = [
    `Status: ${status}`,
    lastResult !== null
      ? `Last request → ${lastResult ? 'approved' : 'declined / unavailable'}`
      : null,
    selection
      ? `Selection → apps: ${selection.applicationCount}, categories: ${selection.categoryCount}, domains: ${selection.webDomainCount}`
      : null,
    resolved
      ? resolved.length === 0
        ? 'Resolved → none yet (extension is OS-scheduled; try again in a few seconds)'
        : `Resolved (${resolved.length}): ${resolved
            .map((a) => a.appName || a.packageName || '?')
            .join(', ')}`
      : null,
  ].filter((line): line is string => line !== null)

  return (
    <Panel title="Family Controls" background="#f5f0ff">
      {detailLines.map((line) => (
        <DetailLine key={line} text={line} />
      ))}
      <View style={styles.familyButtons}>
        <View style={styles.familyButtonRow}>
          <Button
            title={requesting ? 'Requesting…' : 'Request authorization'}
            onPress={requestAuth}
            disabled={requesting}
          />
          <Button title="Refresh status" onPress={refreshStatus} />
        </View>
        <View style={styles.familyButtonRow}>
          <Pressable
            style={styles.primaryAction}
            onPress={() => setPickerVisible(true)}
          >
            <Text style={styles.primaryActionLabel}>Show picker</Text>
          </Pressable>
          <Button
            title={resolving ? 'Resolving…' : 'Resolve picked apps'}
            onPress={refreshResolved}
            disabled={resolving}
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
  return (
    <View style={styles.filterButtons}>
      {(Object.keys(APP_TYPE_FILTER_LABEL) as AppType[]).map((type) => {
        const isActive = appType === type
        return (
          <Pressable
            key={type}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(type)}
            style={[
              styles.filterButton,
              { backgroundColor: isActive ? FILTER_ACTIVE : FILTER_INACTIVE },
            ]}
          >
            <Text style={styles.filterButtonLabel}>
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
  bottomInset,
}: {
  apps: InstalledApp[]
  isLoading: boolean
  bottomInset: number
}) {
  if (isLoading) {
    return <ActivityIndicator size="large" color="blue" />
  }
  return (
    <>
      <Text style={styles.header}>{`Installed apps (${apps.length}):`}</Text>
      <FlatList
        data={apps}
        renderItem={({ item, index }) => <AppCard item={item} index={index} />}
        keyExtractor={(item) => item.packageName}
        style={styles.list}
        contentContainerStyle={{
          paddingBottom: Math.max(bottomInset, 40) + 20,
        }}
        overScrollMode="never"
        bounces={false}
      />
    </>
  )
}

function AppContent() {
  const insets = useSafeAreaInsets()
  const [appType, setAppType] = useState(AppType.ALL)
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([])
  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const apps = await ExpoListInstalledApps.listInstalledApps({
          type: appType,
        })
        setInstalledApps(
          apps.sort((a, b) => a.appName.localeCompare(b.appName)),
        )
      } catch (error) {
        console.error('Error fetching data:', error)
      }
      setLoading(false)
    }
    fetchData()
  }, [appType])

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {isIOS && (
        <>
          <DetectionPanel />
          <FamilyControlsPanel />
        </>
      )}
      {isAndroid && (
        <>
          <FilterButtons appType={appType} onChange={setAppType} />
          <InstalledAppsList
            apps={installedApps}
            isLoading={isLoading}
            bottomInset={insets.bottom}
          />
        </>
      )}
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
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  list: {
    flex: 1,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  panel: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
  },
  appContainer: {
    marginBottom: 20,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  appCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: 28,
    height: 28,
    marginRight: 10,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  appDetail: {
    fontSize: 14,
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 72,
    alignItems: 'center',
  },
  filterButtonLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  familyButtons: {
    marginTop: 8,
    gap: 8,
  },
  familyButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryAction: {
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryActionLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detectionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
})
