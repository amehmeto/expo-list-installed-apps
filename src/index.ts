import { NativeModulesProxy, EventEmitter, Subscription } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to ExpoListInstalledApps.web.ts
// and on native platforms to ExpoListInstalledApps.ts
import ExpoListInstalledAppsModule from './ExpoListInstalledAppsModule';
import ExpoListInstalledAppsView from './ExpoListInstalledAppsView';
import { ChangeEventPayload, ExpoListInstalledAppsViewProps } from './ExpoListInstalledApps.types';

// Get the native constant value.
export const PI = ExpoListInstalledAppsModule.PI;

export function hello(): string {
  return ExpoListInstalledAppsModule.hello();
}

export async function setValueAsync(value: string) {
  return await ExpoListInstalledAppsModule.setValueAsync(value);
}

const emitter = new EventEmitter(ExpoListInstalledAppsModule ?? NativeModulesProxy.ExpoListInstalledApps);

export function addChangeListener(listener: (event: ChangeEventPayload) => void): Subscription {
  return emitter.addListener<ChangeEventPayload>('onChange', listener);
}

export { ExpoListInstalledAppsView, ExpoListInstalledAppsViewProps, ChangeEventPayload };
