import { useColorScheme } from 'react-native'

/**
 * Single source of truth for colour in the example app.
 *
 * Every value is a semantic role, never a raw hex at the call site, so the
 * light and dark schemes stay in step. Contrast ratios below are measured
 * against the surface each role sits on; body text clears WCAG AA (4.5:1).
 *
 * Panel roles carry their own foregrounds: text on a tinted surface is tinted
 * from the same hue rather than falling back to neutral grey.
 */
export type Panel = {
  background: string
  foreground: string
  foregroundMuted: string
}

export type Theme = {
  scheme: 'light' | 'dark'
  background: string
  surface: string
  surfaceVariant: string
  onSurface: string
  onSurfaceVariant: string
  primary: string
  onPrimary: string
  outline: string
  separator: string
  error: string
  errorContainer: string
  onErrorContainer: string
  success: string
  detectionPanel: Panel
  familyPanel: Panel
}

const lightTheme: Theme = {
  scheme: 'light',
  background: '#ffffff',
  surface: '#f4f4f5',
  surfaceVariant: '#e4e4e7',
  onSurface: '#18181b', // 16.9:1 on background
  onSurfaceVariant: '#52525b', // 7.5:1 on background
  primary: '#4338ca', // 7.9:1 against onPrimary
  onPrimary: '#ffffff',
  outline: '#a1a1aa',
  separator: '#e4e4e7',
  error: '#b91c1c', // 6.5:1 on background
  errorContainer: '#fee2e2',
  onErrorContainer: '#7f1d1d',
  success: '#166534', // 7.1:1 on background, 6.4:1 on the detection panel
  detectionPanel: {
    background: '#eef2ff',
    foreground: '#1e1b4b',
    foregroundMuted: '#4a4d78', // 7.2:1 on the panel
  },
  familyPanel: {
    background: '#f5f3ff',
    foreground: '#2e1065',
    foregroundMuted: '#5b4a86', // 6.8:1 on the panel
  },
}

const darkTheme: Theme = {
  scheme: 'dark',
  background: '#09090b',
  surface: '#18181b',
  surfaceVariant: '#27272a',
  onSurface: '#fafafa',
  onSurfaceVariant: '#a1a1aa', // 6.9:1 on surface
  primary: '#818cf8', // 5.4:1 against onPrimary
  onPrimary: '#1e1b4b',
  outline: '#3f3f46',
  separator: '#27272a',
  error: '#fca5a5', // 8.5:1 on background
  errorContainer: '#2a1215',
  onErrorContainer: '#fecaca',
  success: '#4ade80',
  detectionPanel: {
    background: '#171a2e',
    foreground: '#e0e7ff',
    foregroundMuted: '#a5b4fc',
  },
  familyPanel: {
    background: '#1f172e',
    foreground: '#ede9fe',
    foregroundMuted: '#c4b5fd',
  },
}

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme
}

/** Smallest tappable box: 44 pt on iOS, 48 dp on Android. Take the larger. */
export const TOUCH_TARGET = 48

/** Minimum gap between adjacent touch targets (Material). */
export const TOUCH_GAP = 8

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const

/** Keeps the column readable on tablets and in landscape. */
export const CONTENT_MAX_WIDTH = 640
