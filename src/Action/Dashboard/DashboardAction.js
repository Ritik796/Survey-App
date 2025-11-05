import { Linking } from 'react-native';
import * as locationService from '../../services/LocationService';
import * as permissionsService from '../../services/PermissionServices';

export const appStateChange = (
  nextAppState,      // string or event object from AppState
  appStateRef,       // React ref (e.g. useRef) holding previous app state
  setLoading,        // setter from useState
  setWebKey,         // setter from useState (for forcing WebView reload)
  locationRef        // React ref used by LocationService.stopTracking/startTracking
) => {
  try {
    // Normalize nextAppState (some platforms/events may send an object)
    const state =
      typeof nextAppState === 'string'
        ? nextAppState
        : nextAppState?.type ?? String(nextAppState);

    // console.log('AppState changed:', state, 'previous:', appStateRef?.current);

    const prev = appStateRef?.current;

    // If coming from background/inactive -> active, reload WebView (via key)
    if ((prev === 'inactive' || prev === 'background') && state === 'active') {
      // console.log('Reloading WebView on app foreground via key change.');
      if (typeof setLoading === 'function') setLoading(true);
      if (typeof setWebKey === 'function') {
        setWebKey(prevKey => (typeof prevKey === 'number' ? prevKey + 1 : 1));
      }
    }

    // When app moves to background/inactive, stop location tracking safely
    if (state === 'inactive' || state === 'background') {
      // console.log('App moved to background/inactive. Stopping location tracking.');
      if (locationRef && locationRef.current) {
        // ensure stopTracking exists
        if (typeof locationService.stopTracking === 'function') {
          locationService.stopTracking(locationRef);
        } else {
          // console.warn('locationService.stopTracking is not a function');
        }
      } else {
        // console.log('locationRef not provided or not initialized; skipping stopTracking.');
      }
    }

    // Update stored app state
    if (appStateRef && typeof appStateRef === 'object') {
      appStateRef.current = state;
    }
    return true;
  } catch (err) {
    console.warn('appStateChange: unexpected error', err);
    // best-effort fallback updates so UI doesn't hang
    try {
      if (typeof setLoading === 'function') setLoading(false);
    } catch { }
    return false;
  }
};

export const readWebViewMessage = (event, locationRef, webViewRef, logger = console) => {
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
      if (data.type === "OPEN_GOOGLE_MAP" && data.url) {
        Linking.openURL(data.url);    // ✅ Opens Google Maps App / Browser
      }
    default:
      logger.warn("Unhandled WebView message type:", data.type);
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