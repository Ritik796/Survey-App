import { PermissionsAndroid, Platform } from "react-native";



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
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
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
      checkPermission(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, "RECORD_AUDIO")
    ].every(Boolean);

    return allGranted;
  } catch (err) {
    console.warn("Permission error:", err);
    return false;
  }
};
