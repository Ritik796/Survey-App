import { Linking } from 'react-native';
import * as locationService from '../../services/LocationService';
import * as permissionsService from '../../services/PermissionServices';
import DeviceInfo from 'react-native-device-info';

export const appStateChange = (
  nextAppState,
  appStateRef,
  setLoading,
  setWebKey,
  locationRef,
  ConnectivityModule
) => {
  try {
    const state =
      typeof nextAppState === 'string'
        ? nextAppState
        : nextAppState?.type ?? String(nextAppState);

    const prev = appStateRef?.current;

    // 🎯 App first launch (no previous state)
    if (state === 'active') {
      startConnectivityListener(ConnectivityModule);
    }

    // 🎯 App comes to foreground
    if ((prev === 'inactive' || prev === 'background') && state === 'active') {
      if (typeof setLoading === 'function') setLoading(true);
      if (typeof setWebKey === 'function') {
        setWebKey(prevKey => (typeof prevKey === 'number' ? prevKey + 1 : 1));
      }
    }

    // 🎯 App moves to background
    if (state === 'inactive' || state === 'background') {
      stopConnectivityListener(ConnectivityModule);

      if (locationRef?.current && typeof locationService?.stopTracking === 'function') {
        locationService.stopTracking(locationRef);
      }
    }

    // Store state
    if (appStateRef && typeof appStateRef === 'object') {
      appStateRef.current = state;
    }

    return true;
  } catch (err) {
    console.warn('appStateChange: unexpected error', err);
    if (typeof setLoading === 'function') setLoading(false);
    return false;
  }
};


const startConnectivityListener = (ConnectivityModule) => {
  ConnectivityModule.startMonitoring();

  // ConnectivityModule.openAutoStartSettings()
};
const stopConnectivityListener = (ConnectivityModule) => {
  ConnectivityModule.stopMonitoring();

};
export const readWebViewMessage = async (event, locationRef, webViewRef, logger = console) => {
  const message = event?.nativeEvent?.data;

  if (!message) {
    logger.warn("readWebViewMessage: empty message received");
    return false;
  }

  // Handle plain string commands first
  if (message === "Stop_location") {
    try {
      locationService.stopTracking(locationRef);

    } catch (err) {
      logger.error("Error stopping location tracking:", err);
    }
    return true;
  }

  // Try to parse JSON
  let data;
  try {
    data = JSON.parse(message);
  } catch (err) {
    logger.warn("readWebViewMessage: non-JSON or malformed message:", message);
    return false;
  }

  if (!data || typeof data !== "object" || !data.type) {
    logger.warn("readWebViewMessage: invalid message format", data);
    return false;
  }
  switch (data.type) {
    case "track_location":
      try {
        logger.log("Starting location tracking with data:", data);
        locationService.startLocationTracking(webViewRef, locationRef, data.msg.accruracy);
      } catch (err) {
        logger.error("Error starting location tracking:", err);
      }
      return true;

    case "OPEN_GOOGLE_MAP":
      if (data.url) {
        Linking.openURL(data.url);
      }
      return true; // ✅ Stop here

    case "checkVersion":
      await checkAppVersion(data.version, webViewRef);
      return true; // ✅ Stop here

    default:
      logger.warn("Unhandled WebView message type:", data.type);
      return false;
  }

};

export const checkAppVersion = async (version, webViewRef) => {
  if (version) {
    const currentVersion = await DeviceInfo.getVersion();
    const required = version?.toString()?.trim();
    if (required === currentVersion?.toString()?.trim()) {
      webViewRef.current?.postMessage(JSON.stringify({ type: "Version_Not_Experied" }));
      return true;
    } else {
      // Step 1: Just inform JS, don’t close app yet
      webViewRef.current?.postMessage(JSON.stringify({ type: "Version_Experied" }));
      return false;
    }
  } else {
    webViewRef.current?.postMessage(JSON.stringify({ type: "Version_Experied" }));
    return false;
  }
};

export const requestAllPermission = async () => {
  try {
    const permissions = await Promise.allSettled([
      permissionsService.cameraPermission(),
      permissionsService.notificationPermission(),
      permissionsService.requestPermissionForForground(),
    ]);

    const cameraStatus = permissions[0].status === 'fulfilled' ? permissions[0].value : 'denied';
    const notificationStatus = permissions[1].status === 'fulfilled' ? permissions[1].value : 'denied';
    const locationStatus = permissions[2].status === 'fulfilled' ? permissions[2].value : 'denied';

    if (cameraStatus === 'granted' && notificationStatus === 'granted' && locationStatus === 'granted') {
      // console.log('All permissions granted.');
    } else {
      // console.log('Some permissions are not granted:', { cameraStatus, notificationStatus, locationStatus });
    }
  } catch (error) {
    console.error('Error requesting permissions:', error);
  }
};