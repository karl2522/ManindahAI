import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, Image, ScrollView, Modal, ActivityIndicator, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { theme } from '../../src/theme/theme';
import { useStore } from '../../src/hooks/useStore';
import { StoreService } from '../../src/services/store';
import { UserService } from '../../src/services/user';
import { supabase } from '../../src/lib/supabase';

type MapPoint = { latitude: number; longitude: number };

const DEFAULT_CENTER: MapPoint = { latitude: 14.5995, longitude: 120.9842 };
const GEOCODE_BASE = 'https://nominatim.openstreetmap.org';

const WebViewComponent = Platform.OS === 'web'
  ? null
  : require('react-native-webview').WebView;

export default function StoreSetupScreen() {
  const router = useRouter();
  const { userId, loading: storeLoading, error: storeError } = useStore();
  const queryClient = useQueryClient();
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [mapCenter, setMapCenter] = useState<MapPoint>(DEFAULT_CENTER);
  const [markerPosition, setMarkerPosition] = useState<MapPoint | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [imageAsset, setImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [tempMarkerPosition, setTempMarkerPosition] = useState<MapPoint | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<'open' | 'close' | null>(null);
  const [autoClose, setAutoClose] = useState(false);
  const isValidPhilippineNumber = (value: string) => {
    const normalized = value.replace(/[\s-]/g, '');
    return /^(\+63|0)9\d{9}$/.test(normalized);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Allow photo library access to upload a store image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageAsset(result.assets[0] ?? null);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      require('leaflet/dist/leaflet.css');
    }
  }, []);

  useEffect(() => {
    const resolveLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission denied. Showing Manila by default.');
          setLocationLoading(false);
          return;
        }

        const current = await Location.getCurrentPositionAsync({});
        const next = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        };
        setMapCenter(next);
        setMarkerPosition(next);
        setLocationLoading(false);
        if (!address.trim()) {
          const resolved = await reverseGeocode(next);
          if (resolved) setAddress(resolved);
        }
      } catch (e: any) {
        setLocationError('Unable to access current location. Showing Manila by default.');
        setLocationLoading(false);
      }
    };

    resolveLocation();
  }, []);

  const selectedPoint = markerPosition ?? mapCenter;
  const selectedCoordinates = useMemo(() => selectedPoint, [selectedPoint]);

  const handleMapSelect = async (point: MapPoint) => {
    setMarkerPosition(point);
    setMapCenter(point);
    const resolved = await reverseGeocode(point);
    if (resolved) setAddress(resolved);
    setShowMapModal(false);
  };

  const handleTimeSelect = (hour: number, ampm: string) => {
    const timeStr = `${hour}:00 ${ampm}`;
    if (showTimePicker === 'open') setOpenTime(timeStr);
    else if (showTimePicker === 'close') setCloseTime(timeStr);
    setShowTimePicker(null);
  };

  const handleUseCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to use this feature.');
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const next = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      setMapCenter(next);
      setTempMarkerPosition(next);
      if (!showMapModal) {
        setMarkerPosition(next);
        const resolved = await reverseGeocode(next);
        if (resolved) setAddress(resolved);
      }
    } catch (e: any) {
      Alert.alert('Location Error', 'Unable to access your location right now. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleOpenPinLocation = () => {
    setTempMarkerPosition(markerPosition || mapCenter);
    setShowMapModal(true);
  };

  const handleSubmit = async () => {
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to create a store.');
      return;
    }
    if (!storeName.trim()) {
      Alert.alert('Validation', 'Sari-Sari Store Name is required.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Validation', 'Store address is required.');
      return;
    }
    if (!contactNumber.trim()) {
      Alert.alert('Validation', 'Contact number is required.');
      return;
    }
    if (!isValidPhilippineNumber(contactNumber.trim())) {
      Alert.alert('Validation', 'Enter a valid PH mobile number (e.g. 09XXXXXXXXX or +639XXXXXXXXX).');
      return;
    }
    if (!openTime.trim() || !closeTime.trim()) {
      Alert.alert('Validation', 'Open and close time are required.');
      return;
    }
    if (!markerPosition) {
      Alert.alert('Validation', 'Please pin your store location on the map before proceeding.');
      return;
    }

    const payload = {
      store_name: storeName.trim(),
      address: address.trim(),
      contact_number: contactNumber.trim(),
      open_time: openTime.trim(),
      close_time: closeTime.trim(),
      auto_close: autoClose,
      latitude: selectedCoordinates?.latitude || null,
      longitude: selectedCoordinates?.longitude || null,
    };

    setSaving(true);
    try {
      const newStore = await StoreService.create(userId, storeName.trim());
      await queryClient.invalidateQueries({ queryKey: ['store'] });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      let uploadedImageUrl: string | null = null;
      if (imageAsset?.uri) {
        setUploadingImage(true);
        try {
          const response = await fetch(imageAsset.uri);
          const arrayBuffer = await response.arrayBuffer();
          const fileBody = new Uint8Array(arrayBuffer);
          const fileExt = imageAsset.fileName?.split('.').pop()
            || imageAsset.mimeType?.split('/')[1]
            || 'jpg';
          const filePath = `${newStore.store_id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase
            .storage
            .from('store-images')
            .upload(filePath, fileBody, {
              contentType: imageAsset.mimeType || 'image/jpeg',
              upsert: true,
            });

          if (uploadError) throw new Error(uploadError.message);

          const { data: publicData } = supabase
            .storage
            .from('store-images')
            .getPublicUrl(filePath);
          uploadedImageUrl = publicData?.publicUrl ?? null;
        } catch (uploadError: any) {
          Alert.alert('Image Upload Failed', 'Store created without a photo. You can add it later.');
        } finally {
          setUploadingImage(false);
        }
      }

      const updatePayload = {
        address: address.trim() || null,
        contact_number: contactNumber.trim() || null,
        latitude: selectedCoordinates ? selectedCoordinates.latitude : null,
        longitude: selectedCoordinates ? selectedCoordinates.longitude : null,
        image_url: uploadedImageUrl,
        open_time: openTime.trim() || null,
        close_time: closeTime.trim() || null,
        auto_close: autoClose,
      };
      const updated = await StoreService.update(newStore.store_id, updatePayload);
      
      // Update user role to 'owner'
      await UserService.addRole(userId, 'owner');
      
      // Invalidate queries to refresh the store globally
      await queryClient.invalidateQueries({ queryKey: ['store'] });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <Stack.Screen options={{ title: 'Store Setup' }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Almost there!</Text>
        <Text style={styles.subtitle}>Set up your store details to launch your dashboard.</Text>

        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>
        <Text style={styles.progressText}>50% complete</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Sari-Sari Store Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Store name"
            value={storeName}
            onChangeText={setStoreName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Store Address & Location</Text>
          <TextInput
            style={[styles.input, { height: 60, textAlignVertical: 'top', paddingTop: 12 }]}
            placeholder="Store physical address"
            value={address}
            onChangeText={setAddress}
            multiline
          />
          <TouchableOpacity style={styles.pinButton} onPress={handleOpenPinLocation}>
            <MaterialIcons name="location-on" size={20} color={theme.colors.onSecondaryContainer} />
            <Text style={styles.pinButtonText}>Pin Store Location</Text>
          </TouchableOpacity>
          {markerPosition && (
            <Text style={styles.locationSuccessText}>
              <MaterialIcons name="check-circle" size={14} color={theme.colors.secondary} /> Location Pinned
            </Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Contact Number</Text>
          <TextInput
            style={styles.input}
            placeholder="09XXXXXXXXX"
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Store Photo</Text>
          {imageAsset?.uri ? (
            <Image source={{ uri: imageAsset.uri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>No image selected</Text>
            </View>
          )}
          <TouchableOpacity style={styles.secondaryButton} onPress={handlePickImage}>
            <Text style={styles.secondaryButtonText}>Select Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formGroupHalf}>
            <Text style={styles.label}>Open Time</Text>
            <TouchableOpacity 
              style={styles.timePickerInput} 
              onPress={() => setShowTimePicker('open')}
            >
              <Text style={styles.timePickerText}>{openTime || "08:00 AM"}</Text>
              <MaterialIcons name="expand-more" size={20} color={theme.colors.outline} />
            </TouchableOpacity>
          </View>
          <View style={styles.formGroupHalf}>
            <Text style={styles.label}>Close Time</Text>
            <TouchableOpacity 
              style={styles.timePickerInput} 
              onPress={() => setShowTimePicker('close')}
            >
              <Text style={styles.timePickerText}>{closeTime || "10:00 PM"}</Text>
              <MaterialIcons name="expand-more" size={20} color={theme.colors.outline} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.label}>Automatic Close</Text>
            <Text style={styles.toggleSubtitle}>Auto-set store to offline after hours</Text>
          </View>
          <Switch
            value={autoClose}
            onValueChange={setAutoClose}
            trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primary }}
            thumbColor={Platform.OS === 'ios' ? '#fff' : (autoClose ? theme.colors.surface : theme.colors.outline)}
          />
        </View>

        {locationError && <Text style={styles.helperText}>{locationError}</Text>}

        {markerPosition && (
          <View style={styles.mapPreviewSection}>
            <Text style={styles.label}>Location Preview</Text>
            <View style={styles.mapPreviewContainer}>
              <MapPreview latitude={markerPosition.latitude} longitude={markerPosition.longitude} />
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.ctaButton} onPress={handleSubmit} disabled={saving || uploadingImage}>
          <Text style={styles.ctaText}>{saving || uploadingImage ? 'Creating...' : 'Launch Store Dashboard'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Map Pinning Modal */}
      <Modal visible={showMapModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pin Store Location</Text>
              <TouchableOpacity onPress={() => setShowMapModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.outline} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalMapFrame}>
              {Platform.OS === 'web' ? (
                <LeafletWebPicker
                  center={mapCenter}
                  marker={tempMarkerPosition || mapCenter}
                  onSelect={setTempMarkerPosition}
                />
              ) : (
                <LeafletNativePicker
                  WebViewComponent={WebViewComponent}
                  center={mapCenter}
                  marker={tempMarkerPosition || mapCenter}
                  onSelect={setTempMarkerPosition}
                />
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.currentLocationButton} 
                onPress={handleUseCurrentLocation}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.primaryContainer} />
                ) : (
                  <MaterialIcons name="my-location" size={24} color={theme.colors.primaryContainer} />
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.confirmButton} 
                onPress={() => tempMarkerPosition && handleMapSelect(tempMarkerPosition)}
              >
                <Text style={styles.confirmButtonText}>Confirm Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Time Selection Modal */}
      <Modal
        visible={!!showTimePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimePicker(null)}
      >
        <TouchableOpacity 
          style={styles.timeModalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowTimePicker(null)}
        >
          <View style={styles.timeModalContent}>
            <Text style={styles.timeModalTitle}>Select {showTimePicker === 'open' ? 'Opening' : 'Closing'} Hour</Text>
            <ScrollView style={styles.timeList} showsVerticalScrollIndicator={false}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                <View key={h} style={styles.timeRow}>
                  <TouchableOpacity style={styles.timeOption} onPress={() => handleTimeSelect(h, 'AM')}>
                    <Text style={styles.timeOptionText}>{h}:00 AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.timeOption} onPress={() => handleTimeSelect(h, 'PM')}>
                    <Text style={styles.timeOptionText}>{h}:00 PM</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function MapPreview({ latitude, longitude }: { latitude: number, longitude: number }) {
  const html = `<!doctype html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        html, body, #map { height: 100%; margin: 0; background: #f8f9fa; }
        .leaflet-control-attribution { display: none !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const map = L.map('map', {
          zoomControl: false,
          dragging: false,
          touchZoom: false,
          doubleClickZoom: false,
          scrollWheelZoom: false,
          boxZoom: false,
          keyboard: false
        }).setView([${latitude}, ${longitude}], 16);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        L.marker([${latitude}, ${longitude}]).addTo(map);
      </script>
    </body>
  </html>`;

  if (Platform.OS === 'web') {
    return (
      <iframe
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none', borderRadius: 16 }}
        title="Store Map"
      />
    );
  }

  if (!WebViewComponent) return null;

  return (
    <WebViewComponent
      originWhitelist={['*']}
      source={{ html }}
      style={{ flex: 1 }}
      scrollEnabled={false}
    />
  );
}

async function geocodeAddress(query: string): Promise<MapPoint | null> {
  const url = `${GEOCODE_BASE}/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'ManindahAI/1.0',
    },
  });
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return {
    latitude: parseFloat(data[0].lat),
    longitude: parseFloat(data[0].lon),
  };
}

async function reverseGeocode(point: MapPoint): Promise<string | null> {
  const url = `${GEOCODE_BASE}/reverse?format=json&lat=${point.latitude}&lon=${point.longitude}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'ManindahAI/1.0',
    },
  });
  const data = await response.json();
  return data?.display_name ?? null;
}

function LeafletWebPicker({
  center,
  marker,
  onSelect,
}: {
  center: MapPoint;
  marker: MapPoint;
  onSelect: (point: MapPoint) => void;
}) {
  const { MapContainer, TileLayer, Marker, useMapEvents } = require('react-leaflet');
  const L = require('leaflet');

  useEffect(() => {
    const icon = new L.Icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
    L.Marker.prototype.options.icon = icon;
  }, [L]);

  const ClickHandler = () => {
    useMapEvents({
      click: (event: any) => onSelect({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
    });
    return null;
  };

  const Recenter = ({ center }: { center: MapPoint }) => {
    const map = require('react-leaflet').useMap();
    useEffect(() => {
      map.setView([center.latitude, center.longitude]);
    }, [center]);
    return null;
  };

  return (
    <MapContainer center={[center.latitude, center.longitude]} zoom={16} style={styles.leafletMap}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker
        position={[marker.latitude, marker.longitude]}
        draggable
        eventHandlers={{
          dragend: (event: any) => {
            const pos = event.target.getLatLng();
            onSelect({ latitude: pos.lat, longitude: pos.lng });
          },
        }}
      />
      <ClickHandler />
      <Recenter center={center} />
    </MapContainer>
  );
}

function LeafletNativePicker({
  WebViewComponent,
  center,
  marker,
  onSelect,
}: {
  WebViewComponent: any;
  center: MapPoint;
  marker: MapPoint;
  onSelect: (point: MapPoint) => void;
}) {
  if (!WebViewComponent) return null;

  const html = `<!doctype html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        html, body, #map { height: 100%; margin: 0; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const map = L.map('map').setView([${center.latitude}, ${center.longitude}], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        const marker = L.marker([${marker.latitude}, ${marker.longitude}], { draggable: true }).addTo(map);

        const send = (latlng) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: latlng.lat, longitude: latlng.lng }));
        };

        marker.on('dragend', () => send(marker.getLatLng()));
        map.on('click', (event) => {
          marker.setLatLng(event.latlng);
          send(event.latlng);
        });
      </script>
    </body>
  </html>`;

  return (
    <WebViewComponent
      key={`${marker.latitude}_${marker.longitude}`}
      originWhitelist={['*']}
      source={{ html }}
      style={{ flex: 1 }}
      onMessage={(event: any) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            onSelect({ latitude: data.latitude, longitude: data.longitude });
          }
        } catch {
          // Ignore malformed messages
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  title: {
    ...theme.typography.h2,
    color: theme.colors.onSurface,
  },
  subtitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
  },
  progressBar: {
    height: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceVariant,
    overflow: 'hidden',
  },
  progressFill: {
    width: '50%',
    height: '100%',
    backgroundColor: theme.colors.primaryContainer,
  },
  progressText: {
    ...theme.typography.labelMedium,
    color: theme.colors.outline,
  },
  formGroup: { gap: 8 },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formGroupHalf: {
    flex: 1,
    gap: 8,
  },
  label: {
    ...theme.typography.button,
    color: theme.colors.onSurface,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
  },
  secondaryButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  secondaryButtonText: {
    ...theme.typography.button,
    color: theme.colors.primaryContainer,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  photoPlaceholderText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.outline,
  },
  helperText: {
    ...theme.typography.labelMedium,
    color: theme.colors.outline,
  },
  ctaButton: {
    marginTop: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    ...theme.typography.button,
    color: theme.colors.onPrimary,
  },
  leafletMap: {
    width: '100%',
    height: '100%',
  },
  pinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.secondaryContainer,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  pinButtonText: {
    ...theme.typography.button,
    color: theme.colors.onSecondaryContainer,
  },
  locationSuccessText: {
    ...theme.typography.labelMedium,
    color: theme.colors.secondary,
    textAlign: 'center',
  },
  mapPreviewSection: {
    gap: 8,
    marginTop: 8,
  },
  mapPreviewContainer: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '90%',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
  },
  modalMapFrame: {
    flex: 1,
  },
  modalFooter: {
    padding: 20,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceVariant,
  },
  currentLocationButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  confirmButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    ...theme.typography.button,
    color: theme.colors.onPrimary,
  },
  timePickerInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timePickerText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  toggleSubtitle: {
    ...theme.typography.labelSmall,
    color: theme.colors.outline,
  },
  timeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timeModalContent: {
    width: '100%',
    maxWidth: 340,
    maxHeight: 400,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  timeModalTitle: {
    ...theme.typography.h3,
    color: theme.colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  timeList: {
    width: '100%',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  timeOption: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  timeOptionText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
});
