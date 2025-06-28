import Geolocation from "@react-native-community/geolocation";
import DeviceInfo from "react-native-device-info";
import { getCurrentDatabase } from "../Firebase";
import { ref, set } from "firebase/database";
export const startLocationTracking = async (userId, databaseURL, locationRef) => {
    if (!userId || !databaseURL) {
        console.warn("Invalid userId or databaseURL");
        return () => { };
    }

    const isLocationOn = await DeviceInfo.isLocationEnabled().catch((err) => {
        console.error("Error checking GPS status:", err);
        return false;
    });

    if (!isLocationOn) {
        console.warn("Device location (GPS) is OFF. Recording blank location.");
        updateLocationByUserId(userId, databaseURL, "", "");
        return () => { };
    }
    console.log("Starting watchPosition…");
    const watchId = Geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            console.log("watchPosition callback:", latitude, longitude, accuracy);

            if (accuracy != null && accuracy <= 15) {
                updateLocationByUserId(userId, databaseURL, latitude, longitude);
            } else {
                console.log("Skipped low-accuracy position:", accuracy);
            }
        },
        (error) => {
            updateLocationByUserId(userId, databaseURL, "", "");
        },
        {
            enableHighAccuracy: true,
            distanceFilter: 10,          // Trigger every ~10 meter
            interval: 10000,            // Regular update every 10s
            fastestInterval: 6000,      // Minimum interval for updates
            useSignificantChanges: false,
            maximumAge: 0
        }

    );

    locationRef.current = watchId;
    console.log("watchId stored:", watchId);

    return () => {
        if (locationRef.current != null) {
            console.log("Clearing watchPosition with id:", locationRef.current);
            Geolocation.clearWatch(locationRef.current);
            locationRef.current = null;
        }
    };
};

export const stopLocationTracking = (locationRef, setWebData) => {
    if (locationRef?.current) {
        console.log("Location tracking stopped.", locationRef.current);
        Geolocation.clearWatch(locationRef.current);
        locationRef.current = null;

        if (setWebData) {
            setWebData((prev) => ({ ...prev, userId: "", databaseUrl: "" }));
        }
    }
};
export const stopTracking = async (locationRef) => {
  if (locationRef?.current) {
    console.log("Location tracking stopped.", locationRef.current);
    await Geolocation.clearWatch(locationRef.current);
    locationRef.current = null;
  }
};

export const updateLocationByUserId = async (userId, databaseurl, lat, lng) => {
    return new Promise(async (resolve) => {
        if (userId && databaseurl) {
            let database = await getCurrentDatabase(databaseurl);
            console.log(databaseurl, lat, lng, userId, `/Surveyors/${userId}/latLng`);
            set(ref(database, `/Surveyors/${userId}/latLng`), { lat, lng });
            resolve('success');
        }
        else {
            console.log(`Error saving location : userId : ${userId},city : ${city},lat : ${lat},lng : ${lng}`);
        }
    });
};