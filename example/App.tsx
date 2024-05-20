import * as ExpoListInstalledApps from 'expo-list-installed-apps'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

export default function App() {
  const [installedApps, setInstalledApps] = useState<
    { label: string; packageName: string }[]
  >([])

  useEffect(() => {
    const apps = ExpoListInstalledApps.listInstalledApps()
    setInstalledApps(apps)
  }, [])

  return (
    <View style={styles.container}>
      <Text>Installed apps ({installedApps.length}):</Text>
      <Text>{installedApps.map((app) => app.label + '\n')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
