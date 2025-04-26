import { describe, it, expect } from 'vitest';
import * as module from './index';

describe('expo-list-installed-apps module API', () => {
  it('should export listInstalledApps as a function', () => {
    expect(module).toHaveProperty('listInstalledApps');
    expect(typeof module.listInstalledApps).toBe('function');
  });

  it('should export setValueAsync as a function', () => {
    expect(module).toHaveProperty('setValueAsync');
    expect(typeof module.setValueAsync).toBe('function');
  });

  it('should export addChangeListener as a function', () => {
    expect(module).toHaveProperty('addChangeListener');
    expect(typeof module.addChangeListener).toBe('function');
  });
});

