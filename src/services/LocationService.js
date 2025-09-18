import Geolocation from "@react-native-community/geolocation";
import DeviceInfo from "react-native-device-info";

export const startLocationTracking = async (webViewRef, locationRef, desiredAccuracy) => {


    const isLocationOn = await DeviceInfo.isLocationEnabled().catch((err) => {
        console.error("Error checking GPS status:", err);
        return false;
    });

    if (!isLocationOn) {
        console.warn("Device location (GPS) is OFF. Recording blank location.");
        return () => { };
    }
    console.log("Starting watchPosition…");
    const watchId = Geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            console.log("watchPosition callback:", latitude, longitude, accuracy);

            if (accuracy != null && accuracy <= Number(desiredAccuracy)) {
                webViewRef?.current?.postMessage(JSON.stringify({ type: "location_update", data: { lat: latitude, lng: longitude } }));
            } else {
                console.log("Skipped low-accuracy position:", accuracy);
            }
        },
        (error) => {
            console.log('Error in Location Tracking ', error);
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


export const stopTracking = async (locationRef) => {
    if (locationRef?.current) {
        console.log("Location tracking stopped.", locationRef.current);
        await Geolocation.clearWatch(locationRef.current);
        locationRef.current = null;
    }
};

