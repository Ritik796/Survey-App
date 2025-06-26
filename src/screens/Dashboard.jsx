import React, { useEffect } from 'react'
import WebView from 'react-native-webview';
import * as common from '../services/PermissionServices';
import { SafeAreaView } from 'react-native';

const Dashboard = () => {
    const WEB_URL = "https://wevois-qa-bgservices.web.app";
    // const WEB_URL = "http://192.168.31.135:3000";

    useEffect(() => {
        requestAllPermissions();
    }, []);

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
    }

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <WebView
                source={{ uri: WEB_URL }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onLoad={requestAllPermissions}
                geolocationEnabled={true} // ✅ Enables location in WebView
                allowUniversalAccessFromFileURLs={true} // ✅ Fix for Android
                setBuiltInZoomControls={false}
                onMessage={(event) => console.log("WebView message:", event.nativeEvent.data)} 
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback={true}
            />
        </SafeAreaView>

    )
}

export default Dashboard
