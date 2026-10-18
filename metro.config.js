const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 1. Add support for .cjs files used by Firebase
config.resolver.sourceExts.push('cjs');

// 2. Disable package exports to ensure Metro resolves firebase/app and firebase/firestore correctly
config.resolver.unstable_enablePackageExports = false;

module.exports = config;

