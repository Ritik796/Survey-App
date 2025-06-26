import { View, Image, StyleSheet } from "react-native";

const Splash = () => {
    return (
        <View style={styles.container}>
            <Image source={require("../assets/images/survey_app_logo.png")} style={styles.image} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    image: {
        width: 100,
        height: 100,
        resizeMode: "contain",
    },
});

export default Splash;
