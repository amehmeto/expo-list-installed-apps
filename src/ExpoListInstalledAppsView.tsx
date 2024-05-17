import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';

import { ExpoListInstalledAppsViewProps } from './ExpoListInstalledApps.types';

const NativeView: React.ComponentType<ExpoListInstalledAppsViewProps> =
  requireNativeViewManager('ExpoListInstalledApps');

export default function ExpoListInstalledAppsView(props: ExpoListInstalledAppsViewProps) {
  return <NativeView {...props} />;
}
