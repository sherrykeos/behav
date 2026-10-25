const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable .wasm asset extension for expo-sqlite web support
config.resolver.assetExts.push('wasm');

module.exports = config;
