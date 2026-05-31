// Metro config — adds Rive (.riv) and 3D model (.glb/.gltf) to the asset pipeline, and enables
// package-"exports" resolution (required by react-native-web 0.21, which ships an exports map).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('riv', 'glb', 'gltf', 'bin');
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
