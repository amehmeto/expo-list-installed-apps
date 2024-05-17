import * as React from 'react';

import { ExpoListInstalledAppsViewProps } from './ExpoListInstalledApps.types';

export default function ExpoListInstalledAppsView(props: ExpoListInstalledAppsViewProps) {
  return (
    <div>
      <span>{props.name}</span>
    </div>
  );
}
