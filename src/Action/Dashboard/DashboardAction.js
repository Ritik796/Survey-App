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
  ConnectivityModule,
  appLoadingRef
) => {
  try {
    const state =
      typeof nextAppState === 'string'
        ? nextAppState
        : nextAppState?.type ?? String(nextAppState);

    const prev = appStateRef?.current;

    if (state === 'active') {
      startConnectivityListener(ConnectivityModule);
    }

    if ((prev === 'inactive' || prev === 'background') && state === 'active') {

      // ✅ Loading only if appLoadingRef.current === true
      if (appLoadingRef?.current === true && typeof setLoading === 'function') {
        setLoading(true);
      }

      // ✅ WebView reload only if allowed
      if (appLoadingRef?.current === true && typeof setWebKey === 'function') {
        setWebKey(prevKey => (typeof prevKey === 'number' ? prevKey + 1 : 1));
      }
    }

    if (state === 'inactive' || state === 'background') {
      stopConnectivityListener(ConnectivityModule);

      if (locationRef?.current && typeof locationService?.stopTracking === 'function') {
        locationService.stopTracking(locationRef);
      }
    }

    if (appStateRef && typeof appStateRef === 'object') {
      appStateRef.current = state;
    }

    return true;
  } catch (err) {
    console.warn('appStateChange: unexpected error', err);

    // ✅ Only stop loading if allowed
    if (appLoadingRef?.current === true && typeof setLoading === 'function') {
      setLoading(false);
    }
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
export const readWebViewMessage = async (event, locationRef, webViewRef, appLoadingRef, geoConfigRef, logger = console) => {
  const message = event?.nativeEvent?.data;

  if (!message) return false;

  // 1) If string commands:
  if (message === "Stop_location") {
    try { locationService.stopTracking(locationRef); geoConfigRef.current = null; } catch { }
    return true;
  }

  // 2) Convert only if needed
  let data = message;
  if (typeof message === "string") {
    try { data = JSON.parse(message); } catch { return false; }
  }

  if (!data?.type) return false;

  switch (data.type) {
    case "track_location":
      geoConfigRef.current = data.msg || {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 10000,
        fastestInterval: 6000,
        useSignificantChanges: false,
        maximumAge: 0,
        accuracy: 15
      };

      await locationService.stopTracking(locationRef);

      locationService.startLocationTracking(webViewRef, locationRef, geoConfigRef);
      return true;

    case "OPEN_GOOGLE_MAP":
      data.url && Linking.openURL(data.url);
      return true;

    case "checkVersion":
      await checkAppVersion(data.version, webViewRef);
      return true;

    case "StartAppLoading":
      appLoadingRef.current = true;
      return true;

    case "StopAppLoading":
      appLoadingRef.current = false;
      return true;
    case "resetWebData":
      webAccRef.current = 0;
      return true;
    case "onConnectivityStatus":
      console.log("Connectivity from Web:", data.status);

      // You may want to update native logic:
      // Example: if offline, show native toast / alert
      // For now just return true
      return true;

    case "onLocationStatus":
      console.log("Location status from Web:", data.status);

      // Again, handle accordingly if needed
      return true;
    case "location_update":
    case "redirectGoogleMaps":
    case "currentLocation":
      logger.log("JS requested current location...");

      const result = await locationService.getCurrentPositionOnce(geoConfigRef);

      logger.log("Sending current location to web:", result);

      webViewRef?.current?.postMessage(
        JSON.stringify({
          type: data.type,        // returns same type back ("request_current_location" or "currentLocation")
          success: result.success,
          error: result.error,
          data: result.data
        })
      );

      return true;

    default:
      console.warn("Unhandled WebView message type:", data.type);
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