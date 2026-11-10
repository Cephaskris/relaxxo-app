module.exports = function (api) {
  api.cache(true);
  let preset;
  try {
    preset = require.resolve("babel-preset-expo");
  } catch {
    preset = require.resolve("expo/node_modules/babel-preset-expo");
  }
  return { presets: [preset] };
};
