// DashboardAction.js
import { Linking } from 'react-native';
import * as locationService from '../../services/LocationService';
import * as permissionsService from '../../services/PermissionServices';
import DeviceInfo from 'react-native-device-info';
// utils/base64ToFile.js
import RNFS from "react-native-fs";


/**
 * appStateChange: handle app lifecycle and optionally reload WebView
 * - ensures reload on resume and stops / restarts trackers
 */
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
      typeof nextAppState === "string"
        ? nextAppState
        : nextAppState?.type ?? String(nextAppState);

    const prev = appStateRef?.current;

    // 🎯 App first launch (no previous state)
    if (state === "active") {
      startConnectivityListener(ConnectivityModule);
    }

    // 🎯 App comes to foreground
    if ((prev === "inactive" || prev === "background") && state === "active") {
      
      // ==========================
      // ✅ Only run this IF appLoadingRef.current === true
      // ==========================
      if (appLoadingRef?.current === true) {
        if (typeof setLoading === "function") setLoading(true);

        if (typeof setWebKey === "function") {
          setWebKey(prevKey =>
            typeof prevKey === "number" ? prevKey + 1 : 1
          );
        }
      } else {
        console.log("⏩ Reload skipped: appLoadingRef is FALSE");
      }
    }

    // 🎯 App moves to background
    if (state === "inactive" || state === "background") {
      stopConnectivityListener(ConnectivityModule);

      if (
        locationRef?.current &&
        typeof locationService?.stopTracking === "function"
      ) {
        locationService.stopTracking(locationRef);
      }
    }

    // Store state
    if (appStateRef && typeof appStateRef === "object") {
      appStateRef.current = state;
    }

    return true;
  } catch (err) {
    console.warn("appStateChange: unexpected error", err);

    // 🔥 Only stop loading if allowed
    if (appLoadingRef?.current === true && typeof setLoading === "function") {
      setLoading(false);
    }

    return false;
  }
};



const startConnectivityListener = (ConnectivityModule) => {
  ConnectivityModule?.startMonitoring?.();
};

const stopConnectivityListener = (ConnectivityModule) => {
  ConnectivityModule?.stopMonitoring?.();
};

/**
 * readWebViewMessage:
 * - central handler for messages from webview
 * - toggles QR/Card/Image UIs using the provided setter callbacks (Dashboard side)
 * - does NOT itself forcibly lock/unlock camera; Dashboard sets cameraLock after handler returns (to avoid race)
 * - returns true/false based on whether the message was handled
 */
export const readWebViewMessage = async (
  event,
  locationRef,
  webViewRef,
  appLoadingRef,
  geoConfigRef,

  setShowQRScanner,
  setShowCardScanner,
  scannerResolveRef,
  setcardScannerConfig,

  setShowImageCapture,

  cameraImageTypeRef,
  qrConfigRef,
  imageCaptureConfig,
  cardOcrConfig,

  logger = console
) => {
  try {
    const message = event?.nativeEvent?.data;
    if (!message) return false;

    let data = message;
    if (typeof message === "string") {
      try { data = JSON.parse(message); } catch { }
    }
    if (!data?.type) return false;

    switch (data.type) {

      /* --------------------------------------------------
            LOCATION & TRACKING
      -------------------------------------------------- */
      case "track_location":
        geoConfigRef.current = data.msg || {
          enableHighAccuracy: true,
          distanceFilter: 10,
          interval: 10000,
          fastestInterval: 6000,
          useSignificantChanges: false,
          maximumAge: 0,
          accuracy: 15,
        };

        await locationService.stopTracking(locationRef);
        await locationService.startLocationTracking(webViewRef, locationRef, geoConfigRef);
        return true;

      case "location_update":
      case "redirectGoogleMaps":
      case "currentLocation": {
        const result = await locationService.getCurrentPositionOnce(geoConfigRef);
        webViewRef?.current?.postMessage(
          JSON.stringify({
            type: data.type,
            success: result.success,
            error: result.error,
            data: result.data,
          })
        );
        return true;
      }

      case "OPEN_GOOGLE_MAP":
        if (data.url) Linking.openURL(data.url);
        return true;

      case "StartAppLoading":
        appLoadingRef.current = true;
        return true;

      case "StopAppLoading":
        appLoadingRef.current = false;
        return true;

      case "checkVersion":
        await checkAppVersion(data.version, webViewRef);
        return true;


      /* --------------------------------------------------
            QR SCANNER REQUEST
      -------------------------------------------------- */
      case "qrScanRequest":
        qrConfigRef.current = data.settings || null;

        scannerResolveRef.current = (scanResult) =>
          webViewRef?.current?.postMessage(
            JSON.stringify({
              type: "qrScanResult",
              success: scanResult.success,
              data: scanResult.data,
            })
          );

        setShowQRScanner(true);
        return true;


      /* --------------------------------------------------
            CARD OCR REQUEST (FIXED HERE)
      -------------------------------------------------- */
      case "cardScanRequest": {
        const cfg = {
          imageUrl: data.imageUrl,
          cardNumbers: data.cardNumbers
        };

        cardOcrConfig.current = data.settings || null;

        scannerResolveRef.current = (scanResult) =>
          webViewRef?.current?.postMessage(
            JSON.stringify({
              type: "cardScanResult",
              success: scanResult.success,
              data: scanResult.data,
            })
          );

        // ✔ FIXED — Store config separately, then show scanner
        setcardScannerConfig(cfg);   // save config
        setShowCardScanner(true);    // open UI

        return true;
      }


      /* --------------------------------------------------
            IMAGE CAPTURE
      -------------------------------------------------- */
      case "captureImage":
        imageCaptureConfig.current = data.settings || null;
        cameraImageTypeRef.current = data.imageType;

        await locationService.stopTracking(locationRef);

        setShowImageCapture(true);
        return true;


      /* --------------------------------------------------
            SAFE LOGGING CASES
      -------------------------------------------------- */
      case "captureImageReceived":
        // logger.log("captureImageReceived:", data);
        return true;

      case "resetWebData":
        // logger.log("resetWebData:", data);
        geoConfigRef.current = null;
        return true;


      default:
        logger.warn("Unhandled WebView message type:", data.type);
        return false;
    }

  } catch (err) {
    console.warn("readWebViewMessage: unexpected error", err);
    return false;
  }
};

/* --------------------------------------------------
    Helper: checkAppVersion
-------------------------------------------------- */
export const checkAppVersion = async (version, webViewRef) => {
  if (version) {
    const currentVersion = await DeviceInfo.getVersion();
    const required = version?.toString()?.trim();
    if (required === currentVersion?.toString()?.trim()) {
      webViewRef.current?.postMessage(JSON.stringify({ type: "Version_Not_Experied" }));
      return true;
    } else {
      webViewRef.current?.postMessage(JSON.stringify({ type: "Version_Experied" }));
      return false;
    }
  } else {
    webViewRef.current?.postMessage(JSON.stringify({ type: "Version_Experied" }));
    return false;
  }
};

/* --------------------------------------------------
   requestAllAndroidPermission
   (keeps your previous behavior: returns true even if some permissions missing)
-------------------------------------------------- */
export const requestAllAndroidPermission = async () => {
  try {
    const permissions = await Promise.allSettled([
      permissionsService.cameraPermission(),
      permissionsService.notificationPermission(),
      permissionsService.requestPermissionForForground(),
      permissionsService.microphonePermission(),
      permissionsService.photosVideosPermission(),
    ]);

    const cam = permissions[0].status === "fulfilled" ? permissions[0].value : "denied";
    const notif = permissions[1].status === "fulfilled" ? permissions[1].value : "denied";
    const loc = permissions[2].status === "fulfilled" ? permissions[2].value : "denied";
    const mic = permissions[3].status === "fulfilled" ? permissions[3].value : "denied";
    const gallery = permissions[4].status === "fulfilled" ? permissions[4].value : "denied";

    if (
      cam === "granted" &&
      notif === "granted" &&
      loc === "granted" &&
      mic === "granted" &&
      gallery === "granted"
    ) {
      // console.log("All permissions granted.");
      return true;
    } else {
      // console.log("Some permissions missing:", {
      //   camera: cam, notification: notif, location: loc, microphone: mic, gallery: gallery
      // });

      // your flow expects true even if some missing
      return true;
    }
  } catch (error) {
    console.error("Error requesting permissions:", error);
    return true;
  }
};
export async function base64ToFile(base64String) {
  try {
    const cleaned = base64String.replace(/^data:image\/[a-z]+;base64,/, "");
    const filePath = `${RNFS.CachesDirectoryPath}/ocr_${Date.now()}.png`;

    await RNFS.writeFile(filePath, cleaned, "base64");

    return "file://" + filePath;
  } catch (e) {
    console.log("❌ Error saving base64:", e);
    return null;
  }
}