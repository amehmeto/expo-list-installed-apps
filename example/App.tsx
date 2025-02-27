import * as ExpoListInstalledApps from 'expo-list-installed-apps'
import { InstalledApp } from 'expo-list-installed-apps/ExpoListInstalledApps.types'
import { useEffect, useState } from 'react'
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
} from 'react-native'

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

export default function App() {
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([])

  useEffect(() => {
    const apps = ExpoListInstalledApps.listInstalledApps()
    const sortedApps = apps.sort((a, b) => a.appName.localeCompare(b.appName))
    setInstalledApps(sortedApps)
  }, [])

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
    <View style={styles.container}>
      <Text style={styles.header}>
        Installed apps ({installedApps.length}):
      </Text>
      <FlatList
        data={installedApps}
        renderItem={renderItem}
        keyExtractor={(item) => item.packageName}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
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
})
