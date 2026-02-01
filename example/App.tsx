import * as ExpoListInstalledApps from 'expo-list-installed-apps'
import {
  AppType,
  InstalledApp,
} from 'expo-list-installed-apps/ExpoListInstalledApps.types'
import { useEffect, useState } from 'react'
import {
  FlatList,
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
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
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
})
