import {
  NativeModulesProxy,
  EventEmitter,
  Subscription,
} from 'expo-modules-core'

// Import the native module. On web, it will be resolved to ExpoListInstalledApps.web.ts
// and on native platforms to ExpoListInstalledApps.ts
import {
  ChangeEventPayload,
  ExpoListInstalledAppsViewProps,
  InstalledApp,
} from './ExpoListInstalledApps.types'
import ExpoListInstalledAppsModule from './ExpoListInstalledAppsModule'

// My own code attempt

export function listInstalledApps(): InstalledApp[] {
  const apps = ExpoListInstalledAppsModule.listInstalledApps()
  return apps as InstalledApp[]
}

export async function setValueAsync(value: string) {
  return await ExpoListInstalledAppsModule.setValueAsync(value)
}

const emitter = new EventEmitter(
  ExpoListInstalledAppsModule ?? NativeModulesProxy.ExpoListInstalledApps,
)

export function addChangeListener(
  listener: (event: ChangeEventPayload) => void,
): Subscription {
  return emitter.addListener<ChangeEventPayload>('onChange', listener)
}

export { ExpoListInstalledAppsViewProps, ChangeEventPayload }
