describe('FamilyActivityPickerView', () => {
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

    require('./FamilyActivityPickerView')

    expect(requireNativeViewManager).toHaveBeenCalledWith(
      'ExpoListInstalledApps',
      'FamilyActivityPickerView',
    )
  })

  it('does not call requireNativeViewManager on Android', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'android' },
      View: 'View',
    }))
    const requireNativeViewManager = jest.fn(() => 'NativeStub')
    jest.doMock('expo-modules-core', () => ({ requireNativeViewManager }))

    require('./FamilyActivityPickerView')

    expect(requireNativeViewManager).not.toHaveBeenCalled()
  })

  it('exports the FamilyActivityPickerView component', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
      View: 'View',
    }))
    jest.doMock('expo-modules-core', () => ({
      requireNativeViewManager: jest.fn(() => 'NativeStub'),
    }))

    const mod = require('./FamilyActivityPickerView')
    expect(typeof mod.FamilyActivityPickerView).toBe('function')
  })
})
