import * as ExpoListInstalledApps from 'expo-list-installed-apps'
import { InstalledApp } from 'expo-list-installed-apps/ExpoListInstalledApps.types'
import { useEffect, useState } from 'react'
import { FlatList, StyleSheet, Text, View, Image } from 'react-native'

export default function App() {
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([])

  useEffect(() => {
    const apps = ExpoListInstalledApps.listInstalledApps()
    setInstalledApps(apps)
  }, [])

  const renderItem = ({
    item,
    index,
  }: {
    item: InstalledApp
    index: number
  }) => (
    <View style={styles.appContainer}>
      <View style={{ display: 'flex', flexDirection: 'row' }}>
        <Image
          source={{ uri: item.icon }}
          style={{ width: 30, height: 30, marginBottom: 10, marginRight: 10 }}
        />
        <Text style={styles.appName}>{`${index + 1}. ${item.appName}`}</Text>
      </View>
      <Text
        style={styles.appDetail}
      >{`Package Name: ${item.packageName}`}</Text>
      <Text
        style={styles.appDetail}
      >{`Version Name: ${item.versionName}`}</Text>
      <Text
        style={styles.appDetail}
      >{`Version Code: ${item.versionCode}`}</Text>
      <Text
        style={styles.appDetail}
      >{`First Install Time: ${item.firstInstallTime}`}</Text>
      <Text
        style={styles.appDetail}
      >{`Last Update Time: ${item.lastUpdateTime}`}</Text>
      <Text style={styles.appDetail}>{`APK Directory: ${item.apkDir}`}</Text>
      <Text style={styles.appDetail}>{`Size: ${item.size} bytes`}</Text>
    </View>
  )

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
