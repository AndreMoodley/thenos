// Metro config — adds Rive (.riv) and 3D model (.glb/.gltf) to the asset pipeline.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('riv', 'glb', 'gltf', 'bin');

module.exports = config;
