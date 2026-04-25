module.exports = {
  dependencies: {
    'react-native-multi-ble-peripheral': {
      root: require.resolve('react-native-multi-ble-peripheral/package.json').replace('/package.json', ''),
      platforms: {
        android: {
          sourceDir: require.resolve('react-native-multi-ble-peripheral/package.json').replace('/package.json', '') + '/android',
          packageImportPath: 'import com.fugood.reactnativemultibleperipheral.ReactNativeMultiBlePeripheralPackage;',
        },
        ios: null, // Android only for now
      },
    },
  },
};
