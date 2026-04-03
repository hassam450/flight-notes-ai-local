const { withAppBuildGradle, withGradleProperties } = require("expo/config-plugins");

function withAndroidReleaseSigning(config) {
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;

    const keystoreProps = [
      { type: "property", key: "RELEASE_STORE_FILE", value: "../../keystore/flight-notes-ai.keystore" },
      { type: "property", key: "RELEASE_STORE_PASSWORD", value: "12345678" },
      { type: "property", key: "RELEASE_KEY_ALIAS", value: "flight-notes-ai" },
      { type: "property", key: "RELEASE_KEY_PASSWORD", value: "12345678" },
    ];

    for (const prop of keystoreProps) {
      const index = props.findIndex((p) => p.type === "property" && p.key === prop.key);
      if (index !== -1) {
        props[index] = prop;
      } else {
        props.push(prop);
      }
    }

    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    if (buildGradle.includes("signingConfigs.release")) {
      return config;
    }

    // Add release signing config block
    let contents = buildGradle.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        release {
            storeFile file(RELEASE_STORE_FILE)
            storePassword RELEASE_STORE_PASSWORD
            keyAlias RELEASE_KEY_ALIAS
            keyPassword RELEASE_KEY_PASSWORD
        }`
    );

    // Replace signingConfig in the release buildType only
    // Match: release { ... signingConfig signingConfigs.debug
    contents = contents.replace(
      /(buildTypes\s*\{[\s\S]*?)(release\s*\{[^}]*?)signingConfig\s+signingConfigs\.debug/,
      (match, before, releaseBlock) => {
        // Only replace if this is inside the release buildType (not debug)
        return before + releaseBlock + "signingConfig signingConfigs.release";
      }
    );

    config.modResults.contents = contents;

    return config;
  });

  return config;
}

module.exports = withAndroidReleaseSigning;
