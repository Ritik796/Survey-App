import { promptForEnableLocationIfNeeded } from 'react-native-android-location-enabler';
import LocationServicesDialogBox from 'react-native-android-location-services-dialog-box';
import { PermissionsAndroid, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

const getGPSStatusDialog = () => {
    return new Promise(resolve => {
        LocationServicesDialogBox.checkLocationServicesIsEnabled({
            message:
                "To continue, let your device turn on location, which uses Google's location",
            ok: 'OK',
            enableHighAccuracy: true,
            showDialog: true,
            openLocationServices: true,
            preventOutSideTouch: false,
            preventBackClick: false,
            providerListener: false,
        })
            .then(success => {
                resolve(success.status);
            })
            .catch(error => {
                resolve(error.message);
            });
    });
}

const getGPSStatus = () => {
    return new Promise(resolve => {
        if (Platform.OS === 'android') {
            const executeWithDebounce = debounce(async () => {
                try {
                    const enableResult = await promptForEnableLocationIfNeeded();
                    resolve('enabled');
                } catch (error) {
                    console.error('Error while enabling GPS:', error);
                    getGPSStatusDialog();
                }
            }, 500);
            executeWithDebounce();
        }
    });
};

const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
};

export const CustomAlertBox = (title, message) => {
    Alert.alert(title, message, [
        {
            text: 'Open Setting',
            onPress: () => {
                Linking.openSettings();
            },
        },
    ]);
};

export const cameraPermission = async () => {
    return new Promise(async resolve => {
        let title = 'Camera Permission';
        let message =
            'Click Open Settings button then click on Permissions then click on Camera and grant permission.';
        let permissionStatus = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        if (permissionStatus === 'granted') {
            resolve(permissionStatus);
        } else if (permissionStatus === 'denied') {
            CustomAlertBox(title, message);
        } else if (permissionStatus === 'never_ask_again') {
            CustomAlertBox(title, message);
        }
    });
};

export const notificationPermission = async () => {
    return new Promise(async resolve => {
        let title = 'Notification Permission';
        let message =
            'Click Open Settings button then click on Permissions then click on Notification and grant permission.';

        let version = parseFloat(DeviceInfo.getSystemVersion());

        if (version <= 12) {
            resolve('granted');
        } else {
            let notificationStatus = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            );
            if (notificationStatus === 'granted') {
                resolve('granted');
            } else if (notificationStatus === 'denied') {
                CustomAlertBox(title, message);
            } else if (notificationStatus === 'never_ask_again') {
                CustomAlertBox(title, message);
            }
        }
    });
};

export const requestPermissionForForground = () => {
    return new Promise(async resolve => {
        let title = 'Location Permission';
        let message =
            'Click Open Settings Button then click on Permissions then click on Location and grant permission Allow only while using app.';
        if (Platform.OS === 'android') {
            let gpsStatus = await getGPSStatus();
            if (gpsStatus === 'enabled') {
                try {
                    await PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    ])
                        .then(async result => {
                            if (
                                result['android.permission.ACCESS_COARSE_LOCATION'] &&
                                result['android.permission.ACCESS_FINE_LOCATION'] === 'granted'
                            ) {
                                resolve('granted');
                            } else if (
                                result['android.permission.ACCESS_COARSE_LOCATION'] &&
                                result['android.permission.ACCESS_FINE_LOCATION'] ===
                                'never_ask_again'
                            ) {
                                CustomAlertBox(title, message);
                            } else if (
                                result['android.permission.ACCESS_COARSE_LOCATION'] &&
                                result['android.permission.ACCESS_FINE_LOCATION'] === 'denied'
                            ) {
                                CustomAlertBox(title, message);
                            }
                        })
                        .catch(error => {
                            console.log('ERROR PERMISSION LOCATION: ', error);
                        });
                } catch (error) {
                    console.error('Error requesting location permissions:', error);
                }
            } else {
                getGPSStatusDialog();
            }
        }
    });
};