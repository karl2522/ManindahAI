import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../src/theme/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../src/hooks/useStore';
import { BarcodeService } from '../../src/services/barcodeService';

// Type declaration for the Web BarcodeDetector API (Chrome 83+)
// This API is not available on native or older browsers.
declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string; format: string }>>;
  static getSupportedFormats(): Promise<string[]>;
}

export default function ScanScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { store } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isMirrored, setIsMirrored] = useState<boolean>(Platform.OS === 'web');
  const [flash, setFlash] = useState<boolean>(false);
  const [mode, setMode] = useState<'barcode' | 'receipt'>('barcode');
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{
    icon: string;
    iconColor: string;
    iconBg: string;
    title: string;
    message: string;
    barcode: string;
    primaryLabel: string;
    primaryAction: () => void;
  } | null>(null);
  const toastAnim = useRef(new Animated.Value(-200)).current;

  const showToast = useCallback((config: NonNullable<typeof toast>) => {
    setToast(config);
    Animated.spring(toastAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [toastAnim]);

  const hideToast = useCallback(() => {
    Animated.timing(toastAnim, {
      toValue: -200,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setToast(null);
      setScanned(false);
    });
  }, [toastAnim]);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const cameraContainerRef = useRef<View>(null);
  const webScanActiveRef = useRef(false);

  useEffect(() => {
    if (mode === 'barcode' && isFocused && !scanned && !isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      scanLineAnim.stopAnimation();
    }
  }, [mode, isFocused, scanned, isProcessing]);

  // ── Web-Only: BarcodeDetector frame polling ──────────────────────────
  // expo-camera's onBarcodeScanned does NOT work on web.
  // We use the browser's BarcodeDetector API to scan frames from the <video> element.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (mode !== 'barcode') return;
    if (scanned || isProcessing) return;
    if (!isFocused) return;

    // Check if the browser supports BarcodeDetector
    if (typeof (globalThis as any).BarcodeDetector === 'undefined') {
      console.warn('BarcodeDetector API not supported in this browser. Try Chrome 83+.');
      return;
    }

    const detector = new (globalThis as any).BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a'],
    });

    let intervalId: ReturnType<typeof setInterval>;
    let mounted = true;
    webScanActiveRef.current = true;

    // Wait a moment for the <video> element to mount, then start polling
    const startPolling = () => {
      // CameraView renders a <video> inside its DOM tree
      const video = document.querySelector('video');
      if (!video || video.readyState < 2) {
        // Video not ready yet, retry in 500ms
        setTimeout(() => { if (mounted) startPolling(); }, 500);
        return;
      }

      console.log('[Web Scanner] BarcodeDetector polling started');
      intervalId = setInterval(async () => {
        if (!mounted || !webScanActiveRef.current) return;
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0 && mounted && webScanActiveRef.current) {
            const barcode = barcodes[0];
            console.log(`[Web Scanner] Detected: ${barcode.rawValue} (${barcode.format})`);
            webScanActiveRef.current = false; // Prevent duplicate scans
            clearInterval(intervalId);
            handleBarcodeScanned(barcode.rawValue);
          }
        } catch (err) {
          // BarcodeDetector.detect() can throw on invalid frames — ignore silently
        }
      }, 300); // Poll every 300ms
    };

    startPolling();

    return () => {
      mounted = false;
      webScanActiveRef.current = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [mode, isFocused, scanned, isProcessing]);

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

  const handleBarcodeScanned = async (data: string) => {
    console.log('Barcode detected:', data);
    setIsProcessing(true);
    setScanned(true);

    try {
      let productName = '';
      let productCategory = '';
      let source = 'not_found';

      if (store) {
        const result = await BarcodeService.resolveBarcode(data, store.store_id);
        source = result.source;
        productName = result.product?.name || '';
        productCategory = result.product?.category || '';
      }

      // Show in-app toast notification based on source
      console.log(`[Scanner] Source: ${source}, Name: "${productName}", Barcode: ${data}`);

      if (source === 'local') {
        showToast({
          icon: 'inventory-2',
          iconColor: theme.colors.primary,
          iconBg: theme.colors.primaryFixed,
          title: 'Already in Inventory',
          message: `"${productName}" is already in your inventory.`,
          barcode: data,
          primaryLabel: 'View Inventory',
          primaryAction: () => { hideToast(); router.push('/(tabs)/inventory'); },
        });
      } else if (productName) {
        showToast({
          icon: 'check-circle',
          iconColor: '#16a34a',
          iconBg: '#dcfce7',
          title: 'Product Found',
          message: `"${productName}" detected. Add to inventory?`,
          barcode: data,
          primaryLabel: 'Add to Inventory',
          primaryAction: () => {
            hideToast();
            router.push({ pathname: '/(tabs)/inventory', params: { scannedBarcode: data, scannedName: productName, scannedCategory: productCategory, scannedSource: source } });
          },
        });
      } else {
        showToast({
          icon: 'qr-code',
          iconColor: theme.colors.onSurfaceVariant,
          iconBg: theme.colors.surfaceContainerHigh,
          title: 'Barcode Captured',
          message: `Barcode captured. Add product details in inventory.`,
          barcode: data,
          primaryLabel: 'Go to Inventory',
          primaryAction: () => {
            hideToast();
            router.push({ pathname: '/(tabs)/inventory', params: { scannedBarcode: data, scannedSource: 'not_found' } });
          },
        });
      }
    } catch (e) {
      console.error('Barcode resolution error:', e);
      showToast({
        icon: 'qr-code',
        iconColor: theme.colors.onSurfaceVariant,
        iconBg: theme.colors.surfaceContainerHigh,
        title: 'Barcode Captured',
        message: `Barcode captured. Add product details in inventory.`,
        barcode: data,
        primaryLabel: 'Go to Inventory',
        primaryAction: () => {
          hideToast();
          router.push({ pathname: '/(tabs)/inventory', params: { scannedBarcode: data, scannedSource: 'not_found' } });
        },
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200] 
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {isFocused ? (
        <View style={StyleSheet.absoluteFill}>
          <CameraView 
            style={[StyleSheet.absoluteFill, isMirrored && { transform: [{ scaleX: -1 }] }]} 
            enableTorch={flash}
            facing={facing}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a'],
            }}
            onBarcodeScanned={Platform.OS !== 'web' && !scanned ? ({ data, type }) => {
              if (mode === 'barcode') {
                console.log(`Barcode detected: ${data} (${type})`);
                handleBarcodeScanned(data);
              }
            } : undefined}
          />
          <View style={[styles.overlay, StyleSheet.absoluteFill]}>
            {/* Top Bar */}
            <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 20) }]}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => router.back()}
              >
                <MaterialIcons name="close" size={28} color="white" />
              </TouchableOpacity>
              
              <View style={styles.topRightControls}>
                <TouchableOpacity 
                  style={[styles.iconButton, { marginRight: 12 }]}
                  onPress={() => {
                    setIsMirrored(m => !m);
                    if (Platform.OS === 'web') {
                      Alert.alert('Mirror Tip', 'If scanning fails, try toggling mirror mode. Some webcams scan better when the text is not reversed.');
                    }
                  }}
                >
                  <MaterialIcons name={isMirrored ? "compare-arrows" : "flip"} size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.iconButton, { marginRight: 12 }]}
                  onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
                >
                  <MaterialIcons name="flip-camera-ios" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => setFlash(!flash)}
                >
                  <MaterialIcons name={flash ? "flash-on" : "flash-off"} size={24} color="white" />
                </TouchableOpacity>
              </View>
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

            {/* Active Scanning Area & Line */}
            {mode === 'barcode' && !scanned && !isProcessing && (
              <View style={styles.scanTargetContainer}>
                <View style={styles.scanTarget}>
                  <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
                </View>
                <View style={styles.scanStatusLabel}>
                  <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.scanStatusText}>Auto-Scanning Active...</Text>
                </View>
                {Platform.OS === 'web' && (
                  <View style={styles.tipContainer}>
                    <Text style={styles.tipText}>Tip: Hold product 15-20cm away. If blurry, move it further back until sharp.</Text>
                  </View>
                )}
              </View>
            )}

            {/* Processing Indicator */}
            {isProcessing && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.processingText}>Looking up product...</Text>
              </View>
            )}

            {/* Bottom Area */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
              style={[
                styles.bottomArea, 
                { paddingBottom: Math.max(insets.bottom, 20) + (mode === 'receipt' ? 40 : 20) }
              ]}
            >
              {mode === 'receipt' && (
                <>
                  <View style={styles.guidanceLabel}>
                    <Text style={styles.guidanceText}>
                      Align receipt in the center of the screen
                    </Text>
                  </View>

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
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'black' }]} />
      )}

      {/* Scan Result Toast */}
      {toast && (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }], paddingTop: insets.top + 8 }]}>
          <View style={styles.toastCard}>
            <View style={styles.toastRow}>
              <View style={[styles.toastIconBadge, { backgroundColor: toast.iconBg }]}>
                <MaterialIcons name={toast.icon as any} size={24} color={toast.iconColor} />
              </View>
              <View style={styles.toastBody}>
                <Text style={styles.toastTitle}>{toast.title}</Text>
                <Text style={styles.toastMessage} numberOfLines={2}>{toast.message}</Text>
                <View style={styles.toastBarcodeBadge}>
                  <MaterialIcons name="qr-code" size={12} color={theme.colors.outline} />
                  <Text style={styles.toastBarcodeText}>{toast.barcode}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={hideToast} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialIcons name="close" size={20} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
            <View style={styles.toastActions}>
              <TouchableOpacity style={styles.toastSecondaryBtn} onPress={hideToast}>
                <Text style={styles.toastSecondaryText}>Scan Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toastPrimaryBtn} onPress={toast.primaryAction}>
                <Text style={styles.toastPrimaryText}>{toast.primaryLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permissionButton: { marginTop: 32, paddingHorizontal: 32, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  topRightControls: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modeSwitcherContainer: { alignItems: 'center', zIndex: 10 },
  modeSwitcher: { flexDirection: 'row', borderRadius: 30, padding: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modeButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 },
  activeMode: { backgroundColor: theme.colors.tertiaryContainer },
  modeText: { ...theme.typography.labelMedium, marginLeft: 8 },
  scanTargetContainer: { position: 'absolute', top: '30%', left: 0, right: 0, alignItems: 'center' },
  scanTarget: { width: 250, height: 200, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 16, overflow: 'hidden' },
  scanLine: { width: '100%', height: 2, backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 5 },
  scanStatusLabel: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  scanStatusText: { ...theme.typography.labelSmall, color: 'white' },
  tipContainer: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginTop: 16, maxWidth: '80%' },
  tipText: { ...theme.typography.labelSmall, color: 'white', textAlign: 'center', lineHeight: 16 },
  processingContainer: { position: 'absolute', top: '45%', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 20, backgroundColor: 'rgba(0,0,0,0.6)', marginHorizontal: 40, padding: 20, borderRadius: 16 },
  processingText: { ...theme.typography.bodyLarge, color: 'white', marginTop: 12 },
  bottomArea: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingTop: 40 },
  guidanceLabel: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 20 },
  guidanceText: { ...theme.typography.bodyMedium, color: 'white', textAlign: 'center' },
  captureButtonOuter: { width: 88, height: 88, borderRadius: 44, borderWidth: 6, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  captureButtonInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  manualEntryLink: { marginTop: 10 },
  manualEntryText: { ...theme.typography.button, color: 'white', textDecorationLine: 'underline' },

  // Toast Notification
  toastContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingHorizontal: 16 },
  toastCard: { backgroundColor: 'rgba(30,30,30,0.95)', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  toastRow: { flexDirection: 'row', alignItems: 'flex-start' },
  toastIconBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  toastBody: { flex: 1, marginLeft: 12, marginRight: 8 },
  toastTitle: { ...theme.typography.titleMedium, color: 'white', fontWeight: '700' },
  toastMessage: { ...theme.typography.labelSmall, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  toastBarcodeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 6, alignSelf: 'flex-start' },
  toastBarcodeText: { ...theme.typography.labelSmall, color: 'rgba(255,255,255,0.6)', marginLeft: 4, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  toastActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  toastSecondaryBtn: { flex: 1, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  toastSecondaryText: { ...theme.typography.labelMedium, color: 'rgba(255,255,255,0.8)' },
  toastPrimaryBtn: { flex: 1.3, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  toastPrimaryText: { ...theme.typography.labelMedium, color: theme.colors.onPrimary, fontWeight: '600' },
});
