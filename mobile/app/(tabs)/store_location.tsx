import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { theme } from '../../src/theme/theme';
import { useStore } from '../../src/hooks/useStore';
import { StoreService } from '../../src/services/store';

type MapRegion = {
  latitude: number;
  longitude: number;
};

const DEFAULT_CENTER: MapRegion = {
  latitude: 14.5995,
  longitude: 120.9842,
};

const WebViewComponent = Platform.OS === 'web'
  ? null
  : require('react-native-webview').WebView;

export default function StoreLocationScreen() {
  const router = useRouter();
  const { store } = useStore();
  const queryClient = useQueryClient();

  const initialCenter = store?.latitude && store?.longitude 
    ? { latitude: store.latitude, longitude: store.longitude } 
    : DEFAULT_CENTER;

  const [mapCenter, setMapCenter] = useState<MapRegion>(initialCenter);
  const [selectedLocation, setSelectedLocation] = useState<MapRegion>(initialCenter);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    require('leaflet/dist/leaflet.css');
  }, []);

  const updateLocationMutation = useMutation({
    mutationFn: (coords: MapRegion) => {
      if (!store?.store_id) throw new Error('No store found');
      return StoreService.update(store.store_id, {
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store'] });
      Alert.alert('Success', 'Store location updated successfully!', [
        { text: 'OK', onPress: () => router.push('/(tabs)/profile') }
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Failed to update location.');
    }
  });

  const handleSaveLocation = () => {
    if (
      selectedLocation.latitude === store?.latitude && 
      selectedLocation.longitude === store?.longitude
    ) {
      Alert.alert('Notice', 'Location has not been changed.');
      return;
    }
    updateLocationMutation.mutate(selectedLocation);
  };

  const handleMapClick = (coords: MapRegion) => {
    setSelectedLocation(coords);
  };

  const handleGetCurrentLocation = async () => {
    setIsFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied. Please enable it in your device settings.');
        setIsFetchingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setSelectedLocation(newCoords);
      setMapCenter(newCoords);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to get current location: ' + error.message);
    } finally {
      setIsFetchingLocation(false);
    }
  };

  if (!store) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primaryContainer} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerTitle: 'Store Location',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <MaterialIcons name="arrow-back" size={24} color={theme.colors.primaryContainer} />
            </TouchableOpacity>
          ),
        }} 
      />

      <View style={StyleSheet.absoluteFill}>
        {Platform.OS === 'web' ? (
          <LeafletWebMap
            center={mapCenter}
            markerPos={selectedLocation}
            onClick={handleMapClick}
          />
        ) : (
          <LeafletNativeMap
            WebViewComponent={WebViewComponent}
            center={mapCenter}
            markerPos={selectedLocation}
            onClick={handleMapClick}
          />
        )}
      </View>

      <View style={styles.infoOverlay}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Adjust Store Pin</Text>
          <Text style={styles.infoDescription}>
            Tap on the map to place the pin at your exact store location, or use the location button to relocate to your real location.
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.currentLocationButton} 
              onPress={handleGetCurrentLocation}
              disabled={isFetchingLocation || updateLocationMutation.isPending}
            >
              {isFetchingLocation ? (
                <ActivityIndicator size="small" color={theme.colors.primaryContainer} />
              ) : (
                <MaterialIcons name="gps-fixed" size={24} color={theme.colors.primaryContainer} />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.saveButton,
                updateLocationMutation.isPending && styles.saveButtonDisabled
              ]} 
              onPress={handleSaveLocation}
              disabled={updateLocationMutation.isPending || isFetchingLocation}
            >
              {updateLocationMutation.isPending ? (
                <ActivityIndicator size="small" color={theme.colors.onPrimary} />
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color={theme.colors.onPrimary} />
                  <Text style={styles.saveButtonText}>Save Location</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function LeafletWebMap({
  center,
  markerPos,
  onClick,
}: {
  center: MapRegion;
  markerPos: MapRegion;
  onClick: (coords: MapRegion) => void;
}) {
  const { MapContainer, TileLayer, Marker, useMapEvents, useMap } = require('react-leaflet');
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

  const MapRecenter = () => {
    const map = useMap();
    useEffect(() => {
      map.setView([center.latitude, center.longitude], map.getZoom());
    }, [center, map]);
    return null;
  };

  const MapEvents = () => {
    useMapEvents({
      click(e: any) {
        onClick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
      },
    });
    return null;
  };

  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={15}
      style={styles.leafletMap}
      zoomControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapRecenter />
      <MapEvents />
      <Marker position={[markerPos.latitude, markerPos.longitude]} />
    </MapContainer>
  );
}

function LeafletNativeMap({
  WebViewComponent,
  center,
  markerPos,
  onClick,
}: {
  WebViewComponent: any;
  center: MapRegion;
  markerPos: MapRegion;
  onClick: (coords: MapRegion) => void;
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
        const map = L.map('map').setView([${center.latitude}, ${center.longitude}], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        
        let currentMarker = L.marker([${markerPos.latitude}, ${markerPos.longitude}]).addTo(map);

        // Allow RN to update center without refreshing webview
        document.addEventListener('message', function(event) {
          try {
            const data = JSON.parse(event.data);
            if (data.action === 'recenter') {
              map.setView([data.lat, data.lng]);
              if (currentMarker) currentMarker.setLatLng([data.lat, data.lng]);
            }
          } catch(e) {}
        });

        map.on('click', (e) => {
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;
          
          if (currentMarker) {
            currentMarker.setLatLng([lat, lng]);
          } else {
            currentMarker = L.marker([lat, lng]).addTo(map);
          }

          window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'click', latitude: lat, longitude: lng }));
        });
      </script>
    </body>
  </html>`;

  // We use a ref to the webview to post messages for recentering
  let webviewRef: any = null;

  useEffect(() => {
    if (webviewRef && center) {
      webviewRef.injectJavaScript(`
        if (typeof map !== 'undefined' && currentMarker) {
          map.setView([${center.latitude}, ${center.longitude}]);
          currentMarker.setLatLng([${markerPos.latitude}, ${markerPos.longitude}]);
        }
      `);
    }
  }, [center, markerPos]);

  return (
    <WebViewComponent
      ref={(r: any) => (webviewRef = r)}
      originWhitelist={['*']}
      source={{ html }}
      style={{ flex: 1 }}
      onMessage={(event: any) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.action === 'click' && data.latitude && data.longitude) {
            onClick(data);
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leafletMap: {
    width: '100%',
    height: '100%',
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.containerPadding,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    gap: 12,
  },
  infoTitle: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
  },
  infoDescription: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  currentLocationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    height: 48,
    borderRadius: theme.borderRadius.lg,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    ...theme.typography.button,
    color: theme.colors.onPrimary,
  },
});
