import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../src/theme/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function ScanScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<boolean>(false);
  const [mode, setMode] = useState<'barcode' | 'receipt'>('barcode');
  const [scanned, setScanned] = useState(false);
  


  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
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
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'],
          }}
          onBarcodeScanned={scanned ? undefined : ({ data }) => {
            if (mode === 'barcode') {
              setScanned(true);
              Alert.alert('Scanned', `Barcode data: ${data}`, [
                { text: 'OK', onPress: () => setScanned(false) }
              ]);
            }
          }}
        >
          <View style={styles.overlay}>
            {/* Top Bar */}
            <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 20) }]}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => router.back()}
              >
                <MaterialIcons name="close" size={28} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => setFlash(!flash)}
              >
                <MaterialIcons name={flash ? "flash-on" : "flash-off"} size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Mode Switcher */}
            <View style={[styles.modeSwitcherContainer, { marginTop: Math.max(insets.top, 20) + 60 }]}>
              <View style={styles.modeSwitcher}>
                <TouchableOpacity 
                  style={[styles.modeButton, mode === 'barcode' ? styles.activeMode : {}]}
                  onPress={() => setMode('barcode')}
                >
                  <MaterialIcons name="qr-code-scanner" size={18} color={mode === 'barcode' ? theme.colors.onTertiaryContainer : 'white'} />
                  <Text style={[styles.modeText, { color: mode === 'barcode' ? theme.colors.onTertiaryContainer : 'white' }]}>
                    Barcode
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modeButton, mode === 'receipt' ? styles.activeMode : {}]}
                  onPress={() => setMode('receipt')}
                >
                  <MaterialIcons name="receipt-long" size={18} color={mode === 'receipt' ? theme.colors.onTertiaryContainer : 'white'} />
                  <Text style={[styles.modeText, { color: mode === 'receipt' ? theme.colors.onTertiaryContainer : 'white'}]}>
                    Handwritten Receipt
                  </Text>
                </TouchableOpacity>
              </View>
            </View>


            {/* Bottom Area */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
              style={[
                styles.bottomArea, 
                { paddingBottom: Math.max(insets.bottom, 20) + (mode === 'receipt' ? 40 : 20) }
              ]}
            >
              <View style={styles.guidanceLabel}>
                <Text style={styles.guidanceText}>
                  Align {mode === 'barcode' ? 'item barcode' : 'receipt'} in the center of the screen
                </Text>
              </View>

              {mode === 'receipt' && (
                <>
                  <TouchableOpacity 
                    style={styles.captureButtonOuter} 
                    activeOpacity={0.8}
                    onPress={() => {
                      Alert.alert('Capturing', 'Processing handwritten receipt with OCR...');
                    }}
                  >
                    <View style={styles.captureButtonInner} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.manualEntryLink}
                    onPress={() => Alert.alert('Manual Entry', 'Switching to manual entry mode...')}
                  >
                    <Text style={styles.manualEntryText}>
                      Can't Scan? Enter Manually
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </LinearGradient>
          </View>
        </CameraView>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'black' }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
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
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modeSwitcherContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  modeSwitcher: {
    flexDirection: 'row',
    borderRadius: 30,
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  activeMode: {
    backgroundColor: theme.colors.tertiaryContainer,
  },
  modeText: {
    ...theme.typography.labelMedium,
    marginLeft: 8,
  },
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 40,
  },
  guidanceLabel: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  guidanceText: {
    ...theme.typography.bodyMedium,
    color: 'white',
    textAlign: 'center',
  },
  captureButtonOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
    marginTop: 10,
  },
  manualEntryText: {
    ...theme.typography.button,
    color: 'white',
    textDecorationLine: 'underline',
  },
});
