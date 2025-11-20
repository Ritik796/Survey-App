module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // must be BEFORE reanimated
    ['react-native-worklets-core/plugin'],
    
    'react-native-reanimated/plugin',
  ],
};
