import React, { useRef, useState, useEffect, useCallback } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
} from "react-native";

import { Camera, useCameraDevice } from "react-native-vision-camera";
import RNFS from "react-native-fs";
import ImageResizer from "react-native-image-resizer";
import { startLocationTracking, stopTracking } from "../../services/LocationService";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const POPUP_HEIGHT = SCREEN_HEIGHT * 0.72;

export default function ImageCapture({
    isVisible,
    onClose,
    webViewRef,
    setActiveCamera,
    imageCaptureConfig,
    cameraImageTypeRef,
    locationRef,
    geoConfigRef
}) {
    /* ---------------------------------------------------------------------- */
    /* CONFIG VALUES (READ FROM imageCaptureConfig) */
    const compression = imageCaptureConfig?.current?.compression || {};
    const layout = imageCaptureConfig?.current?.layout || {};

    const MAX_SIZE_KB = compression.maxFileSizeKB ?? 50;
    const INITIAL_QUALITY = compression.initialQuality ?? 85;
    const MIN_QUALITY = compression.minQuality ?? 30;
    const STEP_QUALITY = compression.qualityStep ?? 10;

    const INITIAL_W = compression.initialWidth ?? 800;
    const INITIAL_H = compression.initialHeight ?? 800;

    const POPUP_HEIGHT = SCREEN_HEIGHT * (layout.popupHeightRatio ?? 0.72);
    const cameraRef = useRef(null);
    const device = useCameraDevice("back");

    const [loading, setLoading] = useState(false);
    const [showCamera, setShowCamera] = useState(true);
    const [showPreview, setShowPreview] = useState(false);
    const [isLayoutReady, setIsLayoutReady] = useState(false);

    const [previewImg, setPreviewImg] = useState(null);
    const [savedPaths, setSavedPaths] = useState({ photoUri: "", resizedUri: "" });

    /* -------------------------------- LOCATION CONTROL -------------------------------- */
    useEffect(() => {
        if (isVisible) {
            setActiveCamera("card");
            setShowCamera(true);
            setShowPreview(false);
        }
    }, [isVisible]);
    useEffect(() => {
        stopTracking(locationRef);
        return () => { startLocationTracking(webViewRef, locationRef, geoConfigRef); setActiveCamera(null); };
    }, []);

    /* -------------------------------- CAPTURE IMAGE -------------------------------- */
    const captureImage = useCallback(async () => {
        if (!cameraRef.current) return;

        setLoading(true);

        try {
            const photo = await cameraRef.current.takePhoto({
                qualityPrioritization: "speed",
                quality: 0.8,
            });

            // Compress under 50 KB
            // Compress using imageCaptureConfig values



            const finalPath = await compress(photo.path);
            const base64 = await RNFS.readFile(finalPath, "base64");

            const base64Image = "data:image/jpeg;base64," + base64;

            setSavedPaths({
                photoUri: photo.path,
                resizedUri: finalPath,
            });

            setPreviewImg(base64Image);

            // First hide camera completely
            setShowCamera(false);

            // Then show preview after small delay

            setShowPreview(true);
            // }, 100);

        } catch (err) {
            console.log("Capture Error:", err);
        }

        setLoading(false);
    }, []);

    const compress = async (path) => {
        let quality = INITIAL_QUALITY;
        let resized = null;
        let stats = null;

        console.log("🔰 Compression Started");
        console.log("➡️ Initial Quality:", quality);
        console.log("➡️ Max File Size (KB):", MAX_SIZE_KB);
        console.log("➡️ Min Quality:", MIN_QUALITY);
        console.log("➡️ Step Quality:", STEP_QUALITY);
        console.log("➡️ Resize Dimensions:", INITIAL_W, "x", INITIAL_H);

        let attempt = 1;

        do {
            console.log(`\n📸 Attempt ${attempt}`);
            console.log("→ Trying Quality:", quality);

            resized = await ImageResizer.createResizedImage(
                path,
                INITIAL_W,
                INITIAL_H,
                "JPEG",
                quality,
                0
            );

            stats = await RNFS.stat(resized.uri);

            console.log("→ File Size:", stats.size / 1024, "KB");

            quality -= STEP_QUALITY;
            attempt++;

            if (quality < MIN_QUALITY) {
                console.log("⚠️ Reached Minimum Quality:", MIN_QUALITY);
                break;
            }

        } while (stats.size > MAX_SIZE_KB * 1024);

        console.log("\n✅ FINAL RESULT:");
        console.log("📌 Final File Path:", resized.uri);
        console.log("📌 Final File Size (KB):", stats.size / 1024);
        console.log("📌 Final Quality:", quality + STEP_QUALITY);

        return resized.uri;
    };

    /* -------------------------------- CONFIRM SEND RESULT -------------------------------- */
    const confirmPhoto = async () => {
        setLoading(true);

        try {
            webViewRef.current?.postMessage(
                JSON.stringify({
                    type: "captureImage",
                    imageType: cameraImageTypeRef.current,
                    base64: previewImg,
                    success: true,
                })
            );

            // cleanup
            if (savedPaths.photoUri) await RNFS.unlink(savedPaths.photoUri);
            if (savedPaths.resizedUri) await RNFS.unlink(savedPaths.resizedUri);

        } catch { }

        setLoading(false);
        closePopup();
    };

    /* -------------------------------- CLOSE POPUP -------------------------------- */
    const closePopup = () => {
        // 🔥 Send CANCEL message to WebView
        if (webViewRef.current) {
            webViewRef.current.postMessage(
                JSON.stringify({
                    type: "captureImage",
                    imageType: cameraImageTypeRef.current,
                    base64: null,
                    success: false,
                    cancelled: true
                })
            );
        }

        // 🔥 Reset preview + camera flags
        setShowPreview(false);
        setShowCamera(false);

        // 🔥 Delay cleanup and close modal
        setTimeout(() => {
            setPreviewImg(null);
            onClose();
        }, 250);
    };


    /* -------------------------------- UI -------------------------------- */
    return (
        <Modal visible={isVisible} transparent animationType="fade">
            <View style={styles.overlay}>

                {/* Camera Container - Separate */}
                {showCamera && (
                    <View style={styles.popupBox}>
                        {loading && (
                            <View style={styles.loaderOverlay}>
                                <ActivityIndicator size="large" color="#00b049" />
                            </View>
                        )}

                        <View style={styles.header}>
                            <Text style={styles.headerText}>Capture Image</Text>
                        </View>

                        <View style={styles.cameraArea} onLayout={() => setIsLayoutReady(true)}>
                            {isLayoutReady && device && (
                                <Camera
                                    ref={cameraRef}
                                    device={device}
                                    style={styles.camera}
                                    isActive={showCamera}
                                    photo={true}
                                />
                            )}
                        </View>

                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={closePopup}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.captureBtn} onPress={captureImage}>
                                <Text style={styles.btnText}>Capture</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Preview Container - Completely Separate */}
                {showPreview && (
                    <View style={styles.popupBox}>
                        {loading && (
                            <View style={styles.loaderOverlay}>
                                <ActivityIndicator size="large" color="#00b049" />
                            </View>
                        )}

                        <View style={styles.header}>
                            <Text style={styles.headerText}>Preview Image</Text>
                        </View>

                        <View style={styles.cameraArea}>
                            {previewImg && (
                                <Image source={{ uri: previewImg }} style={styles.previewImage} />
                            )}
                        </View>

                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={closePopup}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.captureBtn} onPress={confirmPhoto}>
                                <Text style={styles.btnText}>Proceed</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

            </View>
        </Modal>
    );
}

/* -------------------------------- STYLES -------------------------------- */
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.65)",
        justifyContent: "center",
        alignItems: "center",
    },
    popupBox: {
        width: "90%",
        height: POPUP_HEIGHT,
        backgroundColor: "#fff",
        borderRadius: 18,
        overflow: "hidden",
        padding: 10
    },
    header: {
        height: 55,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f2f2f2",
        borderRadius: 5
    },
    headerText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#222",
    },
    cameraArea: {
        flex: 1,
        backgroundColor: "#000",
        overflow: "hidden",
    },
    camera: {
        width: "100%",
        height: "100%",
    },
    previewImage: {
        flex: 1,
        width: "100%",
        resizeMode: "cover",
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 14,
        backgroundColor: "#f2f2f2",
        borderRadius: 5
    },
    cancelBtn: {
        width: "46%",
        backgroundColor: "#888888b3",
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
    },
    captureBtn: {
        width: "46%",
        backgroundColor: "#00b049",
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
    },
    btnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    loaderOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#0007",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 99,
    },
});