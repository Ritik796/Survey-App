import React, { useEffect, useRef, useState, useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions
} from "react-native";
import { Camera, useCameraDevices, useCodeScanner } from "react-native-vision-camera";
import { startLocationTracking, stopTracking } from "../../services/LocationService";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function QRScanner({
    onClose,
    onResult,
    webViewRef,
    locationRef,
    geoConfigRef,
    qrConfigRef,
    setActiveCamera
}) {

    /* CONFIG (same as OCR style) */
    const cfg = useMemo(() => qrConfigRef?.current || {}, []);
    const messages = cfg.messages || {};
    const scanCfg = cfg.scanConfig || {};

    const frameSizeRatio = scanCfg.frameSizeRatio || 0.7;
    const scanLineSpeed = scanCfg.scanLineSpeed || 1500;
    const supportedCodes = scanCfg.supportedCodes || ["qr"];

    const FRAME_SIZE = SCREEN_WIDTH * frameSizeRatio;

    const [cameraActive, setCameraActive] = useState(true);
    const scanAnim = useRef(new Animated.Value(0)).current;
    const animateLoopRef = useRef(null);
useEffect(() => {
    return () => {
        console.log("🔄 Component Unmounted, releasing camera");
        setActiveCamera(null);
    };
}, []);
    /* DEVICE SELECTION — same style as OCR */
    const devices = useCameraDevices();

    const device = useMemo(() => {
        if (!devices) return null;
        if (Array.isArray(devices)) {
            return devices.find((d) => d.position === "back") || null;
        }
        return devices?.back || null;
    }, [devices]);

    const cameraRef = useRef(null);

    /* Location Stop / Start */
    useEffect(() => {
        stopTracking(locationRef);
        return () => startLocationTracking(webViewRef, locationRef, geoConfigRef);
    }, []);


    /* Scan line animation */
    useEffect(() => {
        animateLoopRef.current = Animated.loop(
            Animated.sequence([
                Animated.timing(scanAnim, { toValue: 1, duration: scanLineSpeed, useNativeDriver: true }),
                Animated.timing(scanAnim, { toValue: 0, duration: scanLineSpeed, useNativeDriver: true })
            ])
        );
        animateLoopRef.current.start();

        return () => animateLoopRef.current?.stop?.();
    }, []);

    /* Code Scanner — Memoized (same style as OCR) */
    const codeScanner = useCodeScanner(
        useMemo(
            () => ({
                codeTypes: supportedCodes,
                onCodeScanned: (codes) => {
                    if (!codes?.length) return;

                    animateLoopRef.current?.stop?.();
                    setCameraActive(false);

                    setTimeout(() => onResult(codes[0].value), 80);
                }
            }),
            []
        )
    );

    return (
        <View style={styles.overlay}>
            <View style={styles.popupContainer}>
                <View style={styles.popupBox}>

                    {/* CAMERA FRAME */}
                    <View style={[styles.frameContainer, { width: FRAME_SIZE, height: FRAME_SIZE }]}>

                        {/* DEVICE AVAILABLE → SHOW CAMERA */}
                        {device ? (
                            <Camera
                                ref={cameraRef}
                                style={styles.cameraView}
                                device={device}
                                isActive={cameraActive}
                                codeScanner={codeScanner}
                            />
                        ) : (
                            /* SAME as OCR fallback */
                            <View style={styles.cameraFallback}>
                                <Text style={{ color: "#fff" }}>
                                    {messages.cameraLoading || "Camera loading…"}
                                </Text>
                            </View>
                        )}

                        {/* CORNERS / SCAN LINE */}
                        <View style={styles.cornerLayer}>
                            <View style={[styles.corner, styles.topLeft]} />
                            <View style={[styles.corner, styles.topRight]} />
                            <View style={[styles.corner, styles.bottomLeft]} />
                            <View style={[styles.corner, styles.bottomRight]} />

                            {device && (
                                <Animated.View
                                    style={[
                                        styles.scanLine,
                                        {
                                            transform: [{
                                                translateY: scanAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0, FRAME_SIZE - 3]
                                                })
                                            }]
                                        }
                                    ]}
                                />
                            )}
                        </View>
                    </View>

                    {/* MESSAGE */}
                    <Text style={styles.hintText}>
                        {messages.alignQR || "Align QR inside frame"}
                    </Text>

                    {/* CLOSE BTN */}
                    <TouchableOpacity style={styles.closeBtnBox} onPress={onClose}>
                        <Text style={styles.closeBtnText}>✕ Close</Text>
                    </TouchableOpacity>

                </View>
            </View>
        </View>
    );
}

/* STYLES */
const styles = StyleSheet.create({
    overlay: {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.55)",
        zIndex: 9999
    },
    popupContainer: { justifyContent: "center", alignItems: "center", width: "90%" },
    popupBox: {
        width: "85%",
        backgroundColor: "white",
        borderRadius: 12,
        alignItems: "center",
        paddingVertical: 25,
        elevation: 10
    },
    frameContainer: {
        marginBottom: 20,
        position: "relative",
        borderRadius: 15,
        overflow: "hidden"
    },
    cameraView: { width: "100%", height: "100%" },
    cameraFallback: {
        width: "100%",
        height: "100%",
        backgroundColor: "black",
        justifyContent: "center",
        alignItems: "center"
    },
    cornerLayer: { ...StyleSheet.absoluteFillObject },
    corner: {
        width: 35,
        height: 35,
        borderColor: "#00b049",
        borderWidth: 4,
        position: "absolute"
    },
    topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },

    scanLine: {
        position: "absolute",
        width: "80%",
        height: 3,
        backgroundColor: "#00C853",
        left: "10%"
    },

    hintText: {
        marginTop: 8,
        fontSize: 14,
        color: "#333"
    },

    closeBtnBox: {
        marginTop: 18,
        backgroundColor: "#00C853",
        paddingVertical: 10,
        paddingHorizontal: 40,
        borderRadius: 10
    },

    closeBtnText: {
        color: "white",
        fontSize: 17,
        fontWeight: "600"
    }
});
