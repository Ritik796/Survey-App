/**
 * @format
 */

import 'react-native-reanimated';
import {AppRegistry} from 'react-native';
import {name as appName} from './app.json';
import RouterScreen from './src/screens/RouterScreen';

AppRegistry.registerComponent(appName, () => RouterScreen);
