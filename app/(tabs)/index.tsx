import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const WEB_BASE = process.env.EXPO_PUBLIC_WEB_BASE_URL || 'http://localhost:5173';
const DEFAULT_URL =
  Platform.OS === 'android' ? WEB_BASE.replace('localhost', '10.0.2.2') : WEB_BASE;

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <WebView source={{ uri: DEFAULT_URL }} startInLoadingState style={styles.webview} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
