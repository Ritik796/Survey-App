import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Animated,
    Dimensions
} from "react-native";
import { Camera, useCameraDevices, useFrameProcessor } from "react-native-vision-camera";
import { useTextRecognition } from "react-native-vision-camera-ocr-plus";
import { useRunOnJS } from "react-native-worklets-core";
import { startLocationTracking, stopTracking } from "../../services/LocationService";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function CardOCRScanner({
    onClose,
    onResult,
    config,
    webViewRef,
    locationRef,
    geoConfigRef,
    cardOcrConfig,
    setActiveCamera
}) {

    /** --------------------------------------------------
     * ⭐ APPLY CONFIG WITH FALLBACK
     -----------------------------------------------------*/
    const layout = cardOcrConfig?.current?.layout || {};
    const scanConfig = cardOcrConfig?.current?.scanConfig || {};
    const messages = cardOcrConfig?.current?.messages || {};

    const POPUP_WIDTH = SCREEN_WIDTH * (layout.popupWidthRatio || 0.88);
    const FRAME_HEIGHT = layout.frameHeight || 230;

    const MAX_RETRIES = scanConfig.maxRetries ?? 10;
    const RETRY_DELAY = scanConfig.retryDelay ?? 200;
    const FRAME_FPS = scanConfig.frameProcessorFps ?? 3;
    const INIT_DELAY = scanConfig.initDelay ?? 2500;

    const msg_loadingDevice = messages.loadingDeviceMessage || "कैमरा लोड हो रहा है…";

    /** -------------------------------------------------- */

    // STOP/START LOCATION
    useEffect(() => {
        stopTracking(locationRef);
        return () => {startLocationTracking(webViewRef, locationRef, geoConfigRef); setActiveCamera(null);}
    }, []);

    const { maxRetries = MAX_RETRIES, retryDelay = RETRY_DELAY, imageUrl = null, cardNumbers = [] } = config || {};
    const [cameraReady, setCameraReady] = useState(false);
    const [detectedText, setDetectedText] = useState("");

    const progressAnim = useRef(new Animated.Value(0)).current;
    const [progress, setProgress] = useState(0);

    const devices = useCameraDevices();
    const device = Array.isArray(devices)
        ? devices.find((d) => d.position === "back")
        : devices?.back;

    const { scanText } = useTextRecognition({ language: "latin" });

    const scanningActiveRef = useRef(true);
    const retryCountRef = useRef(0);

    useEffect(() => {
        scanningActiveRef.current = true;
        retryCountRef.current = 0;
        setProgress(0);
        animateProgress(0);
    }, []);

    const animateProgress = (value) => {
        Animated.timing(progressAnim, {
            toValue: value,
            duration: 350,
            useNativeDriver: false,
        }).start();
    };

    /** ---------------- MATCH LOGIC ---------------- */
    const handleBlocksJS = useCallback(
        (blocksArray) => {
            if (!scanningActiveRef.current) return;

            let found = null;

            for (let block of blocksArray) {
                const clean = block.replace(/\s+/g, "").toUpperCase();
                if (cardNumbers.includes(clean)) {
                    found = clean;
                    break;
                }
            }

            if (found) {
                scanningActiveRef.current = false;
                setDetectedText(found);

                setProgress(100);
                animateProgress(100);

                setTimeout(() => onResult(found), 400);
                return;
            }

            retryCountRef.current += 1;

            const newProgress = Math.min(
                100,
                Math.floor((retryCountRef.current / maxRetries) * 100)
            );
            setProgress(newProgress);
            animateProgress(newProgress);

            if (retryCountRef.current >= maxRetries) {
                scanningActiveRef.current = false;
                setProgress(100);
                animateProgress(100);

                setTimeout(() => onResult(null), 500);
            }
        },
        [maxRetries, retryDelay, cardNumbers]
    );

    const sendToJS = useRunOnJS(handleBlocksJS);

    const frameProcessor = useFrameProcessor(
        (frame) => {
            "worklet";
            if (!cameraReady) return;

            try {
                const result = scanText(frame);
                if (!result?.blocks?.length) return;

                sendToJS(result.blocks.map((b) => b.blockText));
            } catch (e) {
                console.log("🔥 FrameProcessor Error:", e);
            }
        },
        [scanText, sendToJS]
    );

    return (
        <View style={styles.overlay}>
            <View style={[styles.popupBox, { width: POPUP_WIDTH }]}>
                {/* CLOSE BUTTON */}
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                    <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>

                {/* IMAGE + CAMERA ROW */}
                <View style={[styles.row, { height: FRAME_HEIGHT }]}>
                    {/* LOCAL IMAGE */}
                    <Image
                        source={
                            typeof imageUrl === "number"
                                ? imageUrl
                                : imageUrl
                                ? { uri: imageUrl }
                                : require("../../assets/images/noInternet.png")
                        }
                        style={styles.leftImage}
                        resizeMode="cover"
                        resizeMethod="resize"
                    />

                    {/* CAMERA with FALLBACK */}
                    <View style={styles.cameraBox}>
                        { device ? (
                            <Camera
                                style={{ flex: 1 }}
                                device={device}
                                isActive={true}
                                frameProcessor={frameProcessor}
                                frameProcessorFps={FRAME_FPS}
                                onInitialized={() => {
                                    setTimeout(() => {
                                        setCameraReady(true);
                                    }, INIT_DELAY);
                                }}
                            />
                        ) : (
                            <View style={styles.cameraFallback} />
                        )}
                    </View>
                </View>

                {/* TITLE */}
                <Text style={styles.scanTitle}>
                    {detectedText ? detectedText : "Scanning..."}
                </Text>

                {/* STATUS MESSAGE */}
                {( !device || !cameraReady) && (
                    <Text style={styles.permissionText}>
                        { !device
                            ? msg_loadingDevice
                            : 'Starting camera…'}
                    </Text>
                )}

                {/* PROGRESS BAR */}
                <View style={styles.progressBg}>
                    <Animated.View
                        style={[
                            styles.progressBar,
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 100],
                                    outputRange: ["0%", "100%"],
                                }),
                            },
                        ]}
                    />
                </View>

                <Text style={styles.progressText}>Scanning progress: {progress}%</Text>
            </View>
        </View>
    );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.35)",
        zIndex: 9999,
    },

    popupBox: {
        backgroundColor: "white",
        borderRadius: 18,
        paddingTop: 60,
        paddingBottom: 25,
        paddingHorizontal: 8,
        alignItems: "center",
        elevation: 10,
    },

    closeBtn: {
        position: "absolute",
        top: 10,
        alignSelf: "center",
        width: 30,
        height: 30,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: "#E53935",
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
    },

    closeText: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#E53935",
        marginTop: -2,
    },

    row: {
        flexDirection: "row",
        width: "100%",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#fff",
        marginBottom: 20,
    },

    leftImage: {
        width: "50%",
        height: "100%",
        backgroundColor: "#eee",
    },

    cameraBox: {
        width: "50%",
        height: "100%",
        backgroundColor: "black",
        overflow: "hidden",
    },

    cameraFallback: {
        width: "100%",
        height: "100%",
        backgroundColor: "black",
    },

    scanTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginTop: 5,
    },

    permissionText: {
        fontSize: 14,
        color: "green",
        marginTop: 2,
        marginBottom: 6,
        textAlign: "center",
    },

    progressBg: {
        width: "100%",
        height: 12,
        backgroundColor: "#E5E5E5",
        borderRadius: 8,
        marginTop: 8,
        overflow: "hidden",
    },

    progressBar: {
        height: "100%",
        backgroundColor: "#00C853",
    },

    progressText: {
        marginTop: 10,
        fontSize: 14,
        color: "#444",
    },
});
