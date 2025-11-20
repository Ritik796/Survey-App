import { PermissionsAndroid, Platform, Linking, Alert } from "react-native";
import { promptForEnableLocationIfNeeded } from "react-native-android-location-enabler";
import LocationServicesDialogBox from "react-native-android-location-services-dialog-box";
import DeviceInfo from "react-native-device-info";

// 🔥 Shortcut logging
const log = (...a) => console.log("PermissionServices:", ...a);

/* ------------------------------------------------------------------
   🔵 COMMON ALERT
-------------------------------------------------------------------*/
const showAlert = (title, msg) => {
  Alert.alert(title, msg, [
    { text: "Open Settings", onPress: () => Linking.openSettings() },
  ]);
};

/* ------------------------------------------------------------------
   🔵 GPS ENABLE CHECK (ALWAYS RESOLVE)
-------------------------------------------------------------------*/
const getGPSStatus = async () => {
  log("getGPSStatus → prompting...");
  try {
    await promptForEnableLocationIfNeeded();
    log("getGPSStatus: enabled");
    return "enabled";
  } catch (e) {
    log("GPS enable error → showing fallback dialog");
    return await getGPSStatusDialog();
  }
};

const getGPSStatusDialog = () => {
  return new Promise((resolve) => {
    LocationServicesDialogBox.checkLocationServicesIsEnabled({
      message: "Please enable location services.",
      ok: "OK",
      showDialog: true,
      openLocationServices: true,
    })
      .then(() => {
        log("GPS enabled via dialog");
        resolve("enabled");
      })
      .catch(() => {
        log("GPS still disabled");
        resolve("disabled"); // ⭐ Always resolve
      });
  });
};

/* ------------------------------------------------------------------
   🔵 CAMERA PERMISSION
-------------------------------------------------------------------*/
export const cameraPermission = async () => {
  log("🎥 cameraPermission → requesting CAMERA");
  try {
    const res = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );

    log("🎥 cameraPermission → result:", res);

    if (res === "granted") return "granted";

    showAlert("Camera Permission", "Please enable Camera permission.");
    return "denied";
  } catch {
    return "denied";
  }
};

/* ------------------------------------------------------------------
   🔵 NOTIFICATION PERMISSION
-------------------------------------------------------------------*/
export const notificationPermission = async () => {
  log("🔔 notificationPermission → requesting");

  try {
    const version = parseFloat(DeviceInfo.getSystemVersion());

    if (version <= 12) return "granted";

    const res = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );

    log("🔔 Notification result:", res);

    if (res === "granted") return "granted";

    showAlert("Notification Permission", "Please enable notifications.");
    return "denied";
  } catch {
    return "denied";
  }
};

/* ------------------------------------------------------------------
   🔵 LOCATION PERMISSION (NO FREEZE EVER)
-------------------------------------------------------------------*/
export const requestPermissionForForground = () => {
  return new Promise(async (resolve) => {
    log("📍 requestPermissionForForground → start");

    const gps = await getGPSStatus();
    log("📍 GPS status:", gps);

    try {
      const res = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      log("📍 Location results:", res);

      if (
        res["android.permission.ACCESS_COARSE_LOCATION"] === "granted" &&
        res["android.permission.ACCESS_FINE_LOCATION"] === "granted"
      ) {
        resolve("granted");
      } else {
        showAlert("Location Permission", "Please enable location permission.");
        resolve("denied");
      }
    } catch (e) {
      log("📍 Location error:", e);
      resolve("denied");
    }
  });
};

/* ------------------------------------------------------------------
   🔵 MICROPHONE PERMISSION
-------------------------------------------------------------------*/
export const microphonePermission = async () => {
  log("🎤 Requesting Microphone Permission");

  try {
    const res = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );

    if (res === "granted") return "granted";

    showAlert("Microphone", "Enable Microphone permission.");
    return "denied";
  } catch {
    return "denied";
  }
};

/* ------------------------------------------------------------------
   🔵 GALLERY PERMISSION
-------------------------------------------------------------------*/
export const photosVideosPermission = async () => {
  log("🖼 PhotosVideos → requesting READ_MEDIA_IMAGES");

  try {
    const res = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
    );

    if (res === "granted") return "granted";

    showAlert("Photos & Videos", "Please enable gallery access.");
    return "denied";
  } catch {
    return "denied";
  }
};

/* ------------------------------------------------------------------
   🔵 EXTERNAL STORAGE
-------------------------------------------------------------------*/
export const requestExternalStoragePermission = async () => {
  log("🗂 requestExternalStoragePermission");

  try {
    const res = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
    );

    return res === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
};

/* ------------------------------------------------------------------
   🔵 MASTER PERMISSION CHECKER
-------------------------------------------------------------------*/
export const requestPermissions = async () => {
  if (Platform.OS !== "android") return true; // iOS handled differently

  try {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      PermissionsAndroid.PERMISSIONS.ACCESS_MEDIA_LOCATION,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    ];

    const granted = await PermissionsAndroid.requestMultiple(permissions);

    // Helper to check and log denied permissions
    const checkPermission = (perm, name) => {
      if (granted[perm] !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log(`${name} permission denied`);
        return false;
      }
      return true;
    };

    const allGranted = [
      checkPermission(PermissionsAndroid.PERMISSIONS.CAMERA, "Camera"),
      checkPermission(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, "Location"),
      checkPermission(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE, "Read External Storage"),
      checkPermission(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES, "Read Media Images"),
      checkPermission(PermissionsAndroid.PERMISSIONS.ACCESS_MEDIA_LOCATION, "Access Media Location"),
      checkPermission(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, "RECORD_AUDIO"),
      checkPermission(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, "POST_NOTIFICATIONS"),
    ].every(Boolean);

    return allGranted;
  } catch (err) {
    console.warn("Permission error:", err);
    return false;
  }
};
