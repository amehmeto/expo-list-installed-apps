import * as ExpoListInstalledApps from 'expo-list-installed-apps'
import {
  AuthorizationStatus,
  getFamilyControlsAuthorizationStatus,
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
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  Button,
  ActivityIndicator,
} from 'react-native'
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context'

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
            <Text
              key={label}
              style={styles.appDetail}
            >{`${label}: ${value}`}</Text>
          ))}
        </View>
      )}
    </View>
  )
}

const PROBE_SCHEMES = ['maps', 'music', 'messages', 'facetime', 'mailto']

const FILTER_ACTIVE = 'blue'
const FILTER_INACTIVE = 'grey'

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
    <View style={styles.detectionPanel}>
      <Text style={styles.header}>App detection</Text>
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
            <Text key={s} style={styles.appDetail}>
              {`${s}://`} → {results[s] ? 'installed ✓' : 'not installed'}
            </Text>
          ))}
        </View>
      )}
      {capabilities && (
        <Text style={styles.appDetail}>
          {JSON.stringify(capabilities, null, 2)}
        </Text>
      )}
    </View>
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

  return (
    <View style={styles.familyPanel}>
      <Text style={styles.header}>Family Controls</Text>
      <Text style={styles.appDetail}>{`Status: ${status}`}</Text>
      {lastResult !== null && (
        <Text style={styles.appDetail}>
          {`Last request → ${lastResult ? 'approved' : 'declined / unavailable'}`}
        </Text>
      )}
      {selection && (
        <Text style={styles.appDetail}>
          {`Selection → apps: ${selection.applicationCount}, categories: ${selection.categoryCount}, domains: ${selection.webDomainCount}`}
        </Text>
      )}
      <View style={styles.familyButtons}>
        <View style={styles.familyButtonRow}>
          <Button
            title={requesting ? 'Requesting…' : 'Request authorization'}
            onPress={requestAuth}
            disabled={requesting}
          />
          <Button title="Refresh status" onPress={refreshStatus} />
        </View>
        <Pressable
          style={styles.primaryAction}
          onPress={() => setPickerVisible(true)}
        >
          <Text style={styles.primaryActionLabel}>Show picker</Text>
        </Pressable>
      </View>
      <Modal
        visible={pickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Button title="Done" onPress={() => setPickerVisible(false)} />
          </View>
          <FamilyActivityPicker
            style={{ flex: 1 }}
            headerTitle="Pick apps to manage"
            onSelectionCountsChange={({ nativeEvent }) =>
              setSelection(nativeEvent)
            }
          />
        </View>
      </Modal>
    </View>
  )
}

function AppContent() {
  const insets = useSafeAreaInsets()
  const [appType, setAppType] = useState(AppType.ALL)
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([])
  const [isLoading, setLoading] = useState(true)

  const filters: { type: AppType; label: string }[] = [
    { type: AppType.ALL, label: 'All' },
    { type: AppType.USER, label: 'User' },
    { type: AppType.SYSTEM, label: 'System' },
  ]

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const apps = await ExpoListInstalledApps.listInstalledApps({
          type: appType,
        })
        const sortedApps = apps.sort((a, b) =>
          a.appName.localeCompare(b.appName),
        )
        setInstalledApps(sortedApps)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
      setLoading(false)
    }
    fetchData()
  }, [appType])

  const renderItem = ({
    item,
    index,
  }: {
    item: InstalledApp
    index: number
  }) => {
    return <AppCard item={item} index={index} />
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {Platform.OS === 'ios' && (
        <>
          <DetectionPanel />
          <FamilyControlsPanel />
        </>
      )}
      {Platform.OS === 'android' && (
        <View style={styles.filterButtons}>
          {filters.map(({ type, label }) => {
            const isActive = appType === type
            return (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => setAppType(type)}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: isActive ? FILTER_ACTIVE : FILTER_INACTIVE,
                  },
                ]}
              >
                <Text style={styles.filterButtonLabel}>{label}</Text>
              </Pressable>
            )
          })}
        </View>
      )}
      {Platform.OS === 'android' &&
        (isLoading ? (
          <ActivityIndicator size="large" color="blue" />
        ) : (
          <>
            <Text style={styles.header}>
              Installed apps ({installedApps.length}):
            </Text>
            <FlatList
              data={installedApps}
              renderItem={renderItem}
              keyExtractor={(item) => item.packageName}
              style={styles.list}
              contentContainerStyle={{
                paddingBottom: Math.max(insets.bottom, 40) + 20,
              }}
              overScrollMode="never"
              bounces={false}
            />
          </>
        ))}
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
  detectionPanel: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
  },
  familyPanel: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f5f0ff',
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
