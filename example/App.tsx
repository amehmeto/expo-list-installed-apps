import { StyleSheet, Text, View } from 'react-native';

import * as ExpoListInstalledApps from 'expo-list-installed-apps';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>{ExpoListInstalledApps.hello()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
