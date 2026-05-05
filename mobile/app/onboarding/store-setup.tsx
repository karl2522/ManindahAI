import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, Image, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/theme/theme';
import { useStore } from '../../src/hooks/useStore';
import { StoreService } from '../../src/services/store';
import { supabase } from '../../src/lib/supabase';

type MapPoint = { latitude: number; longitude: number };

const DEFAULT_CENTER: MapPoint = { latitude: 14.5995, longitude: 120.9842 };
const GEOCODE_BASE = 'https://nominatim.openstreetmap.org';

const WebViewComponent = Platform.OS === 'web'
  ? null
  : require('react-native-webview').WebView;

export default function StoreSetupScreen() {
  const router = useRouter();
  const { userId, setStore } = useStore();
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
  };

  const handleUseCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const current = await Location.getCurrentPositionAsync({});
      const next = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      setMapCenter(next);
      setMarkerPosition(next);
      const resolved = await reverseGeocode(next);
      if (resolved) setAddress(resolved);
    } catch (e: any) {
      Alert.alert('Location Error', 'Unable to access your location right now.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleFindOnMap = async () => {
    if (!address.trim()) {
      Alert.alert('Address Required', 'Enter a store address to locate it on the map.');
      return;
    }
    setGeocoding(true);
    try {
      const result = await geocodeAddress(address.trim());
      if (!result) {
        Alert.alert('Not Found', 'We could not find that address. Try a nearby landmark.');
        return;
      }
      setMapCenter(result);
      setMarkerPosition(result);
    } catch (e: any) {
      Alert.alert('Geocoding Error', 'Unable to locate the address right now.');
    } finally {
      setGeocoding(false);
    }
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

    setSaving(true);
    try {
      const created = await StoreService.create(userId, storeName.trim());
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
          const filePath = `${created.store_id}/${Date.now()}.${fileExt}`;

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
      };
      const updated = await StoreService.update(created.store_id, updatePayload);
      setStore(updated);
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
          <Text style={styles.label}>Store Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Store address"
            value={address}
            onChangeText={setAddress}
          />
          <TouchableOpacity style={styles.secondaryButton} onPress={handleFindOnMap} disabled={geocoding}>
            <Text style={styles.secondaryButtonText}>{geocoding ? 'Finding...' : 'Find on Map'}</Text>
          </TouchableOpacity>
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
            <TextInput
              style={styles.input}
              placeholder="09:00 AM"
              value={openTime}
              onChangeText={setOpenTime}
            />
          </View>
          <View style={styles.formGroupHalf}>
            <Text style={styles.label}>Close Time</Text>
            <TextInput
              style={styles.input}
              placeholder="09:00 PM"
              value={closeTime}
              onChangeText={setCloseTime}
            />
          </View>
        </View>

        {locationError && <Text style={styles.helperText}>{locationError}</Text>}

        <View style={styles.mapSection}>
          <Text style={styles.label}>Pin your store on the map</Text>
          <View style={styles.mapCard}>
            <View style={styles.mapFrame}>
              {Platform.OS === 'web' ? (
                <LeafletWebPicker
                  center={mapCenter}
                  marker={selectedPoint}
                  onSelect={handleMapSelect}
                />
              ) : (
                <LeafletNativePicker
                  WebViewComponent={WebViewComponent}
                  center={mapCenter}
                  marker={selectedPoint}
                  onSelect={handleMapSelect}
                />
              )}
            </View>
            <View style={styles.mapActionsRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleUseCurrentLocation} disabled={locationLoading}>
                <Text style={styles.secondaryButtonText}>{locationLoading ? 'Locating...' : 'Use Current Location'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.ctaButton} onPress={handleSubmit} disabled={saving || uploadingImage}>
          <Text style={styles.ctaText}>{saving || uploadingImage ? 'Creating...' : 'Launch Store Dashboard'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  mapSection: {
    gap: 8,
  },
  mapCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    overflow: 'hidden',
  },
  mapFrame: {
    height: 220,
    width: '100%',
  },
  leafletMap: {
    width: '100%',
    height: '100%',
  },
  mapActionsRow: {
    padding: 12,
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
});
