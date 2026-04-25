const { createRunOncePlugin, withSettingsGradle, withAppBuildGradle } = require('@expo/config-plugins');

function withBlePeripheral(config) {
  // Step 1: Add the library to settings.gradle so Gradle knows where to find it
  config = withSettingsGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (!contents.includes(':react-native-multi-ble-peripheral')) {
      const libPath = require
        .resolve('react-native-multi-ble-peripheral/package.json')
        .replace('/package.json', '');
      config.modResults.contents =
        contents +
        `\ninclude ':react-native-multi-ble-peripheral'\n` +
        `project(':react-native-multi-ble-peripheral').projectDir = new File('${libPath}/android')\n`;
    }
    return config;
  });

  // Step 2: Add the dependency to app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (!contents.includes('react-native-multi-ble-peripheral')) {
      config.modResults.contents = contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n    implementation project(':react-native-multi-ble-peripheral')`
      );
    }
    return config;
  });

  return config;
}

module.exports = createRunOncePlugin(withBlePeripheral, 'withBlePeripheral', '1.0.0');
