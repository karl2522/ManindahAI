import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../src/theme/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCANNER_SIZE = SCREEN_WIDTH * 0.7;

export default function ScanScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<boolean>(false);
  const [mode, setMode] = useState<'barcode' | 'receipt'>('barcode');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  if (!permission) {
    // Camera permissions are still loading.
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title: 'Scanner' }} />
        <View style={styles.permissionContainer}>
          <MaterialIcons name="camera-alt" size={64} color={theme.colors.primary} />
          <Text style={[theme.typography.h2, { color: theme.colors.onBackground, marginTop: 24, textAlign: 'center' }]}>
            Camera Access Required
          </Text>
          <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }]}>
            We need your permission to use the camera for scanning items and receipts.
          </Text>
          <TouchableOpacity 
            style={[styles.permissionButton, { backgroundColor: theme.colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={[theme.typography.button, { color: theme.colors.onPrimary }]}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {isFocused ? (
        <CameraView 
          style={StyleSheet.absoluteFill} 
          enableTorch={flash}
          facing="back"
        >
          {/* Transparent Overlay */}
          <View style={styles.overlay}>
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity 
                style={[styles.iconButton, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
                onPress={() => router.back()}
              >
                <MaterialIcons name="close" size={28} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.iconButton, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
                onPress={() => setFlash(!flash)}
              >
                <MaterialIcons name={flash ? "flash-on" : "flash-off"} size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Mode Switcher */}
            <View style={styles.modeSwitcherContainer}>
              <View style={[styles.modeSwitcher, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <TouchableOpacity 
                  style={[styles.modeButton, mode === 'barcode' && { backgroundColor: theme.colors.tertiaryContainer }]}
                  onPress={() => setMode('barcode')}
                >
                  <MaterialIcons name="qr-code-scanner" size={18} color={mode === 'barcode' ? theme.colors.onTertiaryContainer : 'white'} />
                  <Text style={[theme.typography.labelMedium, { color: mode === 'barcode' ? theme.colors.onTertiaryContainer : 'white', marginLeft: 8 }]}>
                    Barcode
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modeButton, mode === 'receipt' && { backgroundColor: theme.colors.tertiaryContainer }]}
                  onPress={() => setMode('receipt')}
                >
                  <MaterialIcons name="receipt-long" size={18} color={mode === 'receipt' ? theme.colors.onTertiaryContainer : 'white'} />
                  <Text style={[theme.typography.labelMedium, { color: mode === 'receipt' ? theme.colors.onTertiaryContainer : 'white', marginLeft: 8 }]}>
                    Receipt
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Scanning Frame */}
            <View style={styles.frameContainer}>
              <Animated.View style={[styles.frame, { transform: [{ scale: pulseAnim }] }]}>
                {/* Corners */}
                <View style={[styles.corner, styles.topLeft, { borderColor: theme.colors.tertiaryFixedDim }]} />
                <View style={[styles.corner, styles.topRight, { borderColor: theme.colors.tertiaryFixedDim }]} />
                <View style={[styles.corner, styles.bottomLeft, { borderColor: theme.colors.tertiaryFixedDim }]} />
                <View style={[styles.corner, styles.bottomRight, { borderColor: theme.colors.tertiaryFixedDim }]} />
                
                {/* Scanning Line */}
                <View style={[styles.scanLine, { backgroundColor: theme.colors.tertiaryFixedDim }]} />
              </Animated.View>
            </View>

            {/* Bottom Area */}
            <View style={styles.bottomArea}>
              <View style={styles.guidanceLabel}>
                <Text style={[theme.typography.bodyMedium, { color: 'white' }]}>
                  Align {mode === 'barcode' ? 'item barcode' : 'receipt'} within the frame
                </Text>
              </View>

              <TouchableOpacity style={styles.captureButtonOuter} activeOpacity={0.8}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.manualEntryLink}
                onPress={() => Alert.alert('Manual Entry', 'Switching to manual entry mode...')}
              >
                <Text style={[theme.typography.button, { color: 'white', textDecorationLine: 'underline' }]}>
                  Can't Scan? Enter Manually
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      ) : (
        <View style={StyleSheet.absoluteFill} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionButton: {
    marginTop: 32,
    paddingHorizontal: 32,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSwitcherContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  modeSwitcher: {
    flexDirection: 'row',
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  frameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderWidth: 6,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 16,
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    width: '100%',
    height: 2,
    opacity: 0.5,
    shadowColor: '#9bf4ce',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  bottomArea: {
    alignItems: 'center',
    paddingBottom: 80,
    paddingTop: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  guidanceLabel: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 30,
  },
  captureButtonOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  manualEntryLink: {
    marginTop: 40,
  },
});
