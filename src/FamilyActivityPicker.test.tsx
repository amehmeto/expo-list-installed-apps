describe('FamilyActivityPicker', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('calls requireNativeViewManager on iOS with the module + view name', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      View: 'View',
    }))
    const requireNativeViewManager = jest.fn(() => 'NativeStub')
    jest.doMock('expo-modules-core', () => ({ requireNativeViewManager }))

    require('./FamilyActivityPicker')

    expect(requireNativeViewManager).toHaveBeenCalledWith(
      'ExpoListInstalledApps',
      'FamilyActivityPicker',
    )
  })

  it('does not call requireNativeViewManager on Android', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'android' },
      View: 'View',
    }))
    const requireNativeViewManager = jest.fn(() => 'NativeStub')
    jest.doMock('expo-modules-core', () => ({ requireNativeViewManager }))

    require('./FamilyActivityPicker')

    expect(requireNativeViewManager).not.toHaveBeenCalled()
  })

  it('exports the FamilyActivityPicker component', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      View: 'View',
    }))
    jest.doMock('expo-modules-core', () => ({
      requireNativeViewManager: jest.fn(() => 'NativeStub'),
    }))

    const mod = require('./FamilyActivityPicker')
    expect(typeof mod.FamilyActivityPicker).toBe('function')
  })
})
