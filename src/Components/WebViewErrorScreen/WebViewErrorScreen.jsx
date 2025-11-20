import { Image, StyleSheet, Text, TouchableOpacity, View, ImageBackground } from 'react-native';
import React from 'react';

export default function WebViewErrorScreen({ handleRetry }) {
    return (
        <View style={styles.container}>
            <View style={styles.div}>
                <View style={styles.netWorkContainer}>
                    <Image
                        source={require('../../assets/images/noInternet.png')}
                        style={styles.image}
                    />
                    <Text style={styles.textHead}>Network Error</Text>

                    <View style={styles.text}>
                        <Text style={styles.infoText}>
                            Something went wrong, please check your
                        </Text>
                        <Text style={styles.infoText}>
                            internet connection and try again.
                        </Text>
                    </View>
                </View>

                {/* ✅ Gradient Retry Button without library */}
                <TouchableOpacity style={styles.buttonWrapper} onPress={handleRetry} activeOpacity={0.8}>
                    <ImageBackground
                        source={require('../../assets/images/greenGradient.png')} // small gradient image
                        style={styles.button}
                        imageStyle={styles.gradientImage}>
                        <Text style={styles.buttonText}>Retry</Text>
                    </ImageBackground>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 10,
        backgroundColor: '#fff',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    div: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    netWorkContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 60,
    },
    image: {
        width: 250,
        height: 250,
        resizeMode: 'contain',
        borderRadius: 50,
    },
    textHead: {
        color: 'black',
        fontSize: 22,
        textAlign: 'center',
        paddingHorizontal: 20,
        fontWeight: '600',
    },
    infoText: {
        fontSize: 15,
        color: 'black',
    },
    text: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonWrapper: {
        position: 'absolute',
        bottom: 20,
        width: '90%',
        borderRadius: 10,
        overflow: 'hidden',
    },
    button: {
        paddingVertical: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradientImage: {
        borderRadius: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 17,
        fontWeight: '600',
    },
});
