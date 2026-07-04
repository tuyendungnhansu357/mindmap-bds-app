// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Reanimated plugin PHẢI ở cuối danh sách plugins
      "react-native-reanimated/plugin",
    ],
  };
};
