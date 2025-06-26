import React, { useEffect, useState } from 'react';
import Splash from './Splash';
import Dashboard from './Dashboard';
import { View } from 'react-native';

const RouterScreen = () => {
    const [showScreen, setShowScreen] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            setShowScreen(false)
        }, 3000);
    }, []);

    return (
        <View style={{ flex: 1 }}>
            {showScreen ? <Splash /> : <Dashboard />}
        </View>
    )
}

export default RouterScreen
