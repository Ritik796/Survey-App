import Geolocation from "@react-native-community/geolocation";
import DeviceInfo from "react-native-device-info";

export const startLocationTracking = async (webViewRef, locationRef, geoConfigRef) => {

    const isLocationOn = await DeviceInfo.isLocationEnabled().catch((err) => {
        console.error("Error checking GPS status:", err);
        return false;
    });

    if (!isLocationOn) {
        console.warn("Device location (GPS) is OFF. Recording blank location.");
        return () => { };
    }

    console.log("Starting watchPosition…");

    const cfg = geoConfigRef.current;

    const watchId = Geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            console.log("watchPosition callback:", latitude, longitude, accuracy);

            // USE ACCURACY FROM SETTINGS
            if (accuracy != null && accuracy <= Number(cfg.accuracy)) {
                webViewRef?.current?.postMessage(
                    JSON.stringify({
                        type: "location_update",
                        data: { lat: latitude, lng: longitude }
                    })
                );
            } else {
                // console.log("Skipped low-accuracy position:", accuracy);
            }
        },
        (error) => {
            console.log('Error in Location Tracking', error);
        },
        {
            // USE FULL SETTINGS PROVIDED FROM WEB
            enableHighAccuracy: cfg.enableHighAccuracy,
            distanceFilter: cfg.distanceFilter,
            interval: cfg.interval,
            fastestInterval: cfg.fastestInterval,
            useSignificantChanges: cfg.useSignificantChanges,
            maximumAge: cfg.maximumAge
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



export const getCurrentPositionOnce = async (geoConfigRef) => {
    return new Promise(async (resolve) => {

        const isLocationOn = await DeviceInfo.isLocationEnabled().catch(() => false);

        if (!isLocationOn) {
            console.warn("GPS is OFF, cannot get current location.");

            return resolve({
                success: false,
                error: "GPS_OFF",
                data: null
            });
        }

        const cfg = geoConfigRef.current;

        Geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;

                console.log("getCurrentPosition:", latitude, longitude, accuracy);

                // ⭐ Send location AS IS (no accuracy check)
                return resolve({
                    success: true,
                    error: null,
                    data: {
                        lat: latitude,
                        lng: longitude,
                        acc: accuracy
                    }
                });
            },
            (error) => {
                console.log("getCurrentPosition ERROR:", error);

                return resolve({
                    success: false,
                    error: error.message || "UNKNOWN_ERROR",
                    data: null
                });
            },
            {
                enableHighAccuracy: cfg?.enableHighAccuracy || true,
                timeout: 8000,
                maximumAge: 0
            }
        );
    });
};

