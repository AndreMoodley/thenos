module.exports = function (api) {
  api.cache(true);
  const isProd = process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production';
  return {
    // babel-preset-expo (SDK 56) AUTOMATICALLY adds react-native-worklets/plugin when the package is
    // installed — adding it again here double-transforms worklets and breaks Reanimated (an infinite
    // render loop on web). So we do NOT add the worklets plugin manually.
    presets: ['babel-preset-expo'],
    plugins: [
      // Optimization: strip console.* (keep warn/error) from optimized/production builds.
      ...(isProd ? [['transform-remove-console', { exclude: ['error', 'warn'] }]] : []),
    ],
  };
};
