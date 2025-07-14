import React, { useEffect, useRef, useState } from 'react';
import WebView from 'react-native-webview';
import * as common from '../services/PermissionServices';
import { SafeAreaView, AppState } from 'react-native';
import { startLocationTracking, stopLocationTracking } from '../services/LocationService';
import LoadingScreen from './LoadingScreen';

const Dashboard = () => {
    // const WEB_URL = "https://wevois-qa-bgservices.web.app";
    const WEB_URL = "http://192.168.29.156:3000";
    // const WEB_URL = "https://interview-8f792.web.app";
    const appState = useRef(AppState.currentState);
    let locationRef = useRef(null);
    const webViewRef = useRef(null);
    const [webKey, setWebKey] = useState(0);
    const [webData, setWebData] = useState({ userId: "", databaseUrl: "" });
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        requestAllPermissions();
        const subscription = AppState.addEventListener("change", handleAppStateChange);
        return () => subscription.remove();
        // eslint-disable-next-line
    }, []);
    useEffect(() => {
        if (webData.userId && webData.databaseUrl) {
            startLocationTracking(webData.userId, webData.databaseUrl, locationRef);
        }
        // eslint-disable-next-line
    }, [webData.userId, webData.databaseUrl]);
    const requestAllPermissions = async () => {
        try {
            const permissions = await Promise.allSettled([
                common.cameraPermission(),
                common.notificationPermission(),
                common.requestPermissionForForground(),
            ]);

            const cameraStatus = permissions[0].status === 'fulfilled' ? permissions[0].value : 'denied';
            const notificationStatus = permissions[1].status === 'fulfilled' ? permissions[1].value : 'denied';
            const locationStatus = permissions[2].status === 'fulfilled' ? permissions[2].value : 'denied';

            if (cameraStatus === 'granted' && notificationStatus === 'granted' && locationStatus === 'granted') {
                console.log('All permissions granted.');
            } else {
                console.log('Some permissions are not granted:', { cameraStatus, notificationStatus, locationStatus });
            }
        } catch (error) {
            console.error('Error requesting permissions:', error);
        }
    };
    const handleWebViewMessage = async (event) => {
        const message = event?.nativeEvent?.data;

        try {
            const data = JSON.parse(message);

            switch (data?.type) {
                case "track_location":
                    setWebData((pre) => ({
                        ...pre,
                        userId: data.msg.userId,
                        databaseUrl: data.msg.dbPath
                    }));
                    break;

                default:
                    break;
            }
        } catch (err) {
            switch (message) {
                case "Stop_location":
                    stopLocationTracking(locationRef, setWebData);
                    break;

                default:
                    console.warn("Unhandled WebView message:", message);
            }
        }
    };
    const handleAppStateChange = async (nextAppState) => {
        console.log("AppState changed:", nextAppState);

        if (appState.current.match(/inactive|background/) && nextAppState === "active") {
            console.log("Reloading WebView on app foreground via key change.");
            setLoading(true);
            setWebKey((prevKey) => prevKey + 1);
        }

        if (nextAppState.match(/inactive|background/)) {
            console.log("App moved to background/inactive. Stopping location tracking.", locationRef.current);
            stopLocationTracking(locationRef, setWebData);
        }

        appState.current = nextAppState;
    };
    const handleStopLoading = () => {
        setTimeout(() => setLoading(false), 1000);
    };

    return (
        <SafeAreaView style={{ flex: 1 }}>
            {loading && <LoadingScreen />}
            <WebView
                key={webKey}
                ref={webViewRef}
                source={{ uri: WEB_URL }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onLoad={requestAllPermissions}
                geolocationEnabled={true} // ✅ Enables location in WebView
                allowUniversalAccessFromFileURLs={true} // ✅ Fix for Android
                setBuiltInZoomControls={false}
                onMessage={handleWebViewMessage}
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback={true}
                onLoadEnd={handleStopLoading}
            />
        </SafeAreaView>

    );
};

export default Dashboard;
