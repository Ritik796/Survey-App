// Dashboard.jsx
import React, { useEffect, useRef, useState } from 'react';
import WebView from 'react-native-webview';
import {
    AppState,
    BackHandler,
    DeviceEventEmitter,
    KeyboardAvoidingView,
    NativeModules,
    Platform,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

import LoadingScreen from './LoadingScreen';
import * as action from '../Action/Dashboard/DashboardAction';

import { startLocationTracking, stopTracking } from '../services/LocationService';
import QRScanner from '../Components/QRScanner/QRScanner';
import CardOCRScanner from '../Components/CardOCRScanner/CardOCRScanner';
import ImageCapture from '../Components/ImageCapture/ImageCapture';

import { requestPermissions } from '../services/PermissionServices';
import WebViewErrorScreen from '../Components/WebViewErrorScreen/WebViewErrorScreen';

const Dashboard = () => {
    // const WEB_URL = "http://192.168.29.181:3000";
    const WEB_URL = "https://surveyapp-29597.web.app";   
    // const WEB_URL = "http://192.168.31.137:3000";

    const appState = useRef(AppState.currentState);
    const webViewRef = useRef(null);

    const locationRef = useRef(null);
    const geoConfigRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [webKey, setWebKey] = useState(0);
    const [activeCamera, setActiveCamera] = useState(null);
    // values → "qr" | "card" | "image" | null

    const { ConnectivityModule } = NativeModules;

    const [showQRScanner, setShowQRScanner] = useState(false);
    const [showCardScanner, setShowCardScanner] = useState(false);
    const [showImageCapture, setShowImageCapture] = useState(false);
    const [netWorkError, setNetWorkError] = useState(false);

    const scannerResolveRef = useRef(null);
    const qrConfigRef = useRef(null);
    const cardOcrConfig = useRef(null);
    const imageCaptureConfig = useRef(null);

    const cameraImageTypeRef = useRef(null);

    const [cardScannerConfig, setCardScannerConfig] = useState(null);
    const appLoadingRef = useRef(true);
    const isTrackingRef = useRef(false);

    /* ------------------ INITIAL SETUP ------------------ */
    useEffect(() => {

        requestPermissions().then((granted) => {
            setLoading(!granted);
        });

        ConnectivityModule.startMonitoring();
        const subscription = AppState.addEventListener("change", handleAppStateChange);

        return () => subscription.remove();
    }, []);
    // ✅ Hardware back button
    useEffect(() => {
        const backAction = () => {
            webViewRef.current?.postMessage(JSON.stringify({ type: "EXIT_REQUEST" }));
            return true;
        };
        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, []);

    /* ---------- Connectivity + GPS ---------- */
    useEffect(() => {
        const mobileStatus = DeviceEventEmitter.addListener("onConnectivityStatus", mobile => {
            webViewRef.current?.postMessage(JSON.stringify({
                type: "onConnectivityStatus",
                status: mobile.isMobileDataOn
            }));
        });

        const locationStatus = DeviceEventEmitter.addListener("onLocationStatus", loc => {
            webViewRef.current?.postMessage(JSON.stringify({
                type: "onLocationStatus",
                status: loc.isLocationOn
            }));

            if (loc.isLocationOn) {
                if (!isTrackingRef.current && geoConfigRef.current) {
                    isTrackingRef.current = true;
                    startLocationTracking(webViewRef, locationRef, geoConfigRef);
                }
            } else {
                if (isTrackingRef.current) {
                    isTrackingRef.current = false;
                    stopTracking(locationRef);
                }
            }
        });

        return () => {
            mobileStatus.remove();
            locationStatus.remove();
        };
    }, []);

    const handleRetry = () => {
        setLoading(true);
        setWebKey(prevKey => prevKey + 1);
        setNetWorkError(false);
    };
    /* ------------------ MESSAGE HANDLER ------------------ */
    const handleWebViewMessage = async (event) => {
        const raw = event?.nativeEvent?.data;
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch { }

        const type = parsed?.type;

        // 🟩 Requests that want camera
        const wantsCamera =
            type === "qrScanRequest" ||
            type === "cardScanRequest" ||
            type === "captureImage";

        // 🛑 If already one camera is active → BLOCK
        if (activeCamera && wantsCamera) {
            console.log("⛔ Camera already in use:", activeCamera);
            return;
        }

        // Run handler
        const handled = await action.readWebViewMessage(
            event,
            locationRef,
            webViewRef,
            appLoadingRef,
            geoConfigRef,
            setShowQRScanner,
            setShowCardScanner,
            scannerResolveRef,
            setCardScannerConfig,
            setShowImageCapture,
            cameraImageTypeRef,
            qrConfigRef,
            imageCaptureConfig,
            cardOcrConfig,
            console
        );

        // If this opened camera → set activeCamera
        if (handled && wantsCamera) {
            if (type === "qrScanRequest") safeSetActiveCamera("qr");
            if (type === "cardScanRequest") safeSetActiveCamera("card");
            if (type === "captureImage") safeSetActiveCamera("image");
        }
    };

    const safeSetActiveCamera = (value) => {
        if (value === "qr" || value === "card" || value === "image" || value === null) {
            setActiveCamera(value);
        } else {
            setActiveCamera(null);
        }
    };


    const handleAppStateChange = (next) => {
        action.appStateChange(
            next, appState, setLoading, setWebKey,
            locationRef, ConnectivityModule, appLoadingRef
        );
    };

    const handleStopLoading = () => { setTimeout(() => setLoading(false), 700); };

    /* ------------------ UI ------------------ */
    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.safeContainer}>

                {loading && <LoadingScreen />}
                {netWorkError && <WebViewErrorScreen handleRetry={handleRetry} />}
                {/* QR SCANNER */}
                {showQRScanner && (
                    <QRScanner
                        webViewRef={webViewRef}
                        setActiveCamera={safeSetActiveCamera}
                        qrConfigRef={qrConfigRef}
                        locationRef={locationRef}
                        geoConfigRef={geoConfigRef}
                        onClose={() => {
                            setShowQRScanner(false);
                            scannerResolveRef.current?.({ success: false, data: null });
                            safeSetActiveCamera(null);
                        }}
                        onResult={(code) => {
                            setShowQRScanner(false);
                            scannerResolveRef.current?.({ success: true, data: { code } });
                            safeSetActiveCamera(null);
                        }}
                    />
                )}

                {/* CARD OCR SCANNER */}
                {showCardScanner && cardScannerConfig && (
                    <CardOCRScanner
                        webViewRef={webViewRef}
                        locationRef={locationRef}
                        setActiveCamera={safeSetActiveCamera}
                        geoConfigRef={geoConfigRef}
                        config={cardScannerConfig}
                        cardOcrConfig={cardOcrConfig}
                        onClose={() => {
                            setShowCardScanner(false);
                            scannerResolveRef.current?.({ success: false, data: null });
                            safeSetActiveCamera(null);
                        }}
                        onResult={(value) => {
                            setShowCardScanner(false);
                            scannerResolveRef.current?.({ success: true, data: { extractedCode: value } });
                            safeSetActiveCamera(null);
                        }}
                    />
                )}

                {/* IMAGE CAPTURE */}
                {showImageCapture && (<ImageCapture
                    isVisible={showImageCapture}
                    webViewRef={webViewRef}
                    setActiveCamera={safeSetActiveCamera}
                    imageCaptureConfig={imageCaptureConfig}
                    cameraImageTypeRef={cameraImageTypeRef}
                    locationRef={locationRef}
                    geoConfigRef={geoConfigRef}
                    onClose={() => {
                        setShowImageCapture(false);
                        safeSetActiveCamera(null);
                    }}

                />)}

                {/* WEBVIEW */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={{ flex: 1 }}
                >
                    <View style={{ flex: 1 }}>
                        <WebView
                            key={webKey}
                            ref={webViewRef}
                            source={{ uri: WEB_URL }}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            geolocationEnabled={true}
                            allowUniversalAccessFromFileURLs={true}
                            allowsInlineMediaPlayback={true}
                            mediaPlaybackRequiresUserAction={false}
                            setBuiltInZoomControls={false}
                            setDisplayZoomControls={false}
                            renderToHardwareTextureAndroid={false}
                            onMessage={handleWebViewMessage}
                            onLoadEnd={handleStopLoading}
                            onError={() => setNetWorkError(true)}
                            style={{ flex: 1 }}
                        />
                    </View>
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
