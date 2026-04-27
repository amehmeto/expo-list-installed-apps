import * as ExpoListInstalledApps from 'expo-list-installed-apps'
import {
  AuthorizationStatus,
  FamilyActivityPickerView,
  FamilyActivitySelectionSummary,
  getFamilyControlsAuthorizationStatus,
  requestFamilyControlsAuthorization,
} from 'expo-list-installed-apps'
import {
  AppType,
  InstalledApp,
  PlatformCapabilities,
} from 'expo-list-installed-apps/ExpoListInstalledApps.types'
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

function AppCard(props: { item: InstalledApp; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <View style={styles.appContainer}>
      <Pressable
        style={{ display: 'flex', flexDirection: 'row' }}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Image
          source={{ uri: props.item.icon }}
          style={{ width: 28, height: 28, marginRight: 10 }}
        />
        <Text
          style={styles.appName}
        >{`${props.index + 1}. ${props.item.appName}`}</Text>
      </Pressable>
      {isExpanded && (
        <View>
          <Text
            style={styles.appDetail}
          >{`Package Name: ${props.item.packageName}`}</Text>
          <Text
            style={styles.appDetail}
          >{`Version Name: ${props.item.versionName}`}</Text>
          <Text
            style={styles.appDetail}
          >{`Version Code: ${props.item.versionCode}`}</Text>
          <Text
            style={styles.appDetail}
          >{`First Install Time: ${props.item.firstInstallTime}`}</Text>
          <Text
            style={styles.appDetail}
          >{`Last Update Time: ${props.item.lastUpdateTime}`}</Text>
          <Text
            style={styles.appDetail}
          >{`APK Directory: ${props.item.apkDir}`}</Text>
          <Text
            style={styles.appDetail}
          >{`Size: ${props.item.size} bytes`}</Text>
        </View>
      )}
    </View>
  )
}

const PROBE_SCHEMES = ['maps', 'music', 'messages', 'facetime', 'mailto']

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
      <Text style={styles.header}>App detection (M2)</Text>
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
    useState<FamilyActivitySelectionSummary | null>(null)

  const refreshStatus = () => setStatus(getFamilyControlsAuthorizationStatus())

  const requestAuth = async () => {
    setRequesting(true)
    try {
      const approved = await requestFamilyControlsAuthorization()
      setLastResult(approved)
      refreshStatus()
    } finally {
      setRequesting(false)
    }
  }

  return (
    <View style={styles.familyPanel}>
      <Text style={styles.header}>FamilyControls (M3)</Text>
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
          <FamilyActivityPickerView
            style={{ flex: 1 }}
            headerTitle="Pick apps to manage"
            onSelectionChange={({ nativeEvent }) => setSelection(nativeEvent)}
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
      <View style={styles.filterButtons}>
        <Button
          color={appType === AppType.ALL ? 'blue' : 'grey'}
          onPress={() => setAppType(AppType.ALL)}
          title="All"
        />
        <Button
          color={appType === AppType.USER ? 'blue' : 'grey'}
          onPress={() => setAppType(AppType.USER)}
          title="User"
        />
        <Button
          color={appType === AppType.SYSTEM ? 'blue' : 'grey'}
          onPress={() => setAppType(AppType.SYSTEM)}
          title="System"
        />
      </View>
      {isLoading ? (
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
  appContainer: {
    marginBottom: 20,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
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
