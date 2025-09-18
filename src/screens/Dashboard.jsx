import React, { useEffect, useRef, useState } from 'react';
import WebView from 'react-native-webview';
import { AppState, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import LoadingScreen from './LoadingScreen';
import * as action from '../Action/Dashboard/DashboardAction';

const Dashboard = () => {
    // const WEB_URL = "https://wevois-qa-bgservices.web.app";
    // const WEB_URL = "http://192.168.31.190:3000";
    const WEB_URL = "https://surveyapp-29597.web.app";
    const appState = useRef(AppState.currentState);
    let locationRef = useRef(null);
    const webViewRef = useRef(null);
    const [webKey, setWebKey] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        requestAllPermissions();
        const subscription = AppState.addEventListener("change", handleAppStateChange);
        return () => subscription.remove();
        // eslint-disable-next-line
    }, []);

    const requestAllPermissions = async () => {
        action.requestAllPermission();
    };

    const handleWebViewMessage = (event) => {
        action.readWebViewMessage(event, locationRef, webViewRef);
    };
    const handleAppStateChange = async (nextAppState) => {
        action.appStateChange(nextAppState, appState, setLoading, setWebKey,locationRef);
    };

    const handleStopLoading = () => {
        setTimeout(() => setLoading(false), 1000);
    };

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.safeContainer}>
                {loading && <LoadingScreen />}
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={{ flex: 1 }}
                    enabled
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
                >
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
                        style={{ flex: 1 }}
                    />
                </KeyboardAvoidingView>
            </SafeAreaView>
        </SafeAreaProvider>

    );
};
const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: "black",
    },
});
export default Dashboard;
