import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useRef } from 'react';
import { CustomerService, StoreSummary } from '../../src/services/customer';
import { ProductService } from '../../src/services/product';
import { theme } from '../../src/theme/theme';

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

export default function ExploreScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<StoreSummary | null>(null);
  const [mapCenter, setMapCenter] = useState<MapRegion>(DEFAULT_CENTER);
  const [autoFollow, setAutoFollow] = useState(true);
  const params = useLocalSearchParams<{ storeId?: string }>();
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const webViewRef = useRef<any>(null);

  const {
    data: stores = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['customer-stores', searchQuery],
    queryFn: () => CustomerService.searchStores(searchQuery),
  });

  const selectedStoreItemsQuery = useQuery({
    queryKey: ['store-items', selectedStore?.store_id],
    queryFn: () => ProductService.getByStoreId(selectedStore!.store_id),
    enabled: !!selectedStore,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    require('leaflet/dist/leaflet.css');
  }, []);
  useEffect(() => {
    const trimmed = searchQuery.trim();
    const withCoords = stores.find((store) => store.latitude && store.longitude);
    if (!withCoords) return;

    if (trimmed.length > 0) {
      const next = {
        latitude: withCoords.latitude || DEFAULT_CENTER.latitude,
        longitude: withCoords.longitude || DEFAULT_CENTER.longitude,
      };
      setMapCenter(next);
      setSelectedStore((current) => current?.store_id === withCoords.store_id ? current : withCoords);
      return;
    }

    if (!selectedStore) {
      setMapCenter({
        latitude: withCoords.latitude || DEFAULT_CENTER.latitude,
        longitude: withCoords.longitude || DEFAULT_CENTER.longitude,
      });
    }
  }, [searchQuery, stores, selectedStore]);

  useEffect(() => {
    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const initial = await Location.getCurrentPositionAsync({});
      setUserLocation(initial);

      locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
        (loc) => {
          setUserLocation(loc);
          if (autoFollow) {
            setMapCenter({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude
            });
          }
          if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify({
              type: 'locationUpdate',
              lat: loc.coords.latitude,
              lng: loc.coords.longitude
            }));
          }
        }
      );
    };

    startTracking();
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const itemChips = useMemo(() => {
    if (!selectedStoreItemsQuery.data) return [];
    return selectedStoreItemsQuery.data.map((item) => 
      `${item.name} · ₱${item.selling_price.toFixed(2)}`
    ).slice(0, 8);
  }, [selectedStoreItemsQuery.data]);

  const handleMapSelect = (storeId: string) => {
    const match = stores.find((store) => store.store_id === storeId);
    if (match) setSelectedStore(match);
  };

  const handleRecenter = () => {
    if (userLocation) {
      setAutoFollow(true);
      setMapCenter({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude
      });
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={StyleSheet.absoluteFill}>
        {Platform.OS === 'web' ? (
          <LeafletWebMap
            stores={stores}
            center={mapCenter}
            onSelect={handleMapSelect}
            userLat={userLocation?.coords.latitude}
            userLng={userLocation?.coords.longitude}
          />
        ) : (
          <LeafletNativeMap
            webViewRef={webViewRef}
            WebViewComponent={WebViewComponent}
            stores={stores}
            center={mapCenter}
            onSelect={handleMapSelect}
            userLat={userLocation?.coords.latitude}
            userLng={userLocation?.coords.longitude}
            onManualPan={() => setAutoFollow(false)}
          />
        )}
      </View>

      <TouchableOpacity 
        style={[styles.recenterButton, { bottom: selectedStore ? 240 : 100 }]} 
        onPress={handleRecenter}
        accessibilityRole="button"
        accessibilityLabel="Recenter map"
        importantForAccessibility="yes"
      >
        <MaterialIcons 
          name={autoFollow ? "my-location" : "location-searching"} 
          size={24} 
          color={autoFollow ? "#FFB300" : theme.colors.onSurfaceVariant} 
        />
      </TouchableOpacity>

      <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={theme.colors.outline} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for stores or items..."
            placeholderTextColor={theme.colors.outline}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.filterButton}>
            <MaterialIcons name="tune" size={20} color={theme.colors.primaryContainer} />
          </TouchableOpacity>
        </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primaryContainer} />
        </View>
      )}

      {selectedStore && (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHeaderRow}>
            <View style={styles.sheetTitleBlock}>
              <TouchableOpacity onPress={() => router.push(`/store/${selectedStore.store_id}`)}>
                <Text style={styles.sheetTitle}>{selectedStore.store_name}</Text>
              </TouchableOpacity>
              <Text style={styles.sheetSub}>Owner: {selectedStore.owner_name ?? 'Community Member'}</Text>
            </View>
            <View style={styles.sheetRight}>
              <StatusChip status={selectedStore.status} />
              <View style={styles.ratingRow}>
                <RatingStars rating={selectedStore.rating} />
                <Text style={styles.ratingText}>{(selectedStore.rating || 0).toFixed(1)}</Text>
              </View>
            </View>
          </View>

          {selectedStoreItemsQuery.isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primaryContainer} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {itemChips.map((chip) => (
                <View key={chip} style={styles.chip}>
                  <Text style={styles.chipText}>{chip}</Text>
                </View>
              ))}
              {itemChips.length === 0 && (
                <Text style={styles.emptyChipText}>No items listed yet</Text>
              )}
            </ScrollView>
          )}

          <View style={styles.sheetActions}>
            <TouchableOpacity 
              style={[styles.primaryButton, { flex: 1 }]} 
              onPress={() => router.push(`/store/${selectedStore.store_id}`)}
            >
              <Text style={styles.primaryButtonText}>View Store</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function LeafletWebMap({
  stores,
  center,
  onSelect,
  userLat,
  userLng,
}: {
  stores: StoreSummary[];
  center: MapRegion;
  onSelect: (storeId: string) => void;
  userLat?: number;
  userLng?: number;
}) {
  const { MapContainer, TileLayer, Marker, useMap } = require('react-leaflet');
  const L = require('leaflet');

  useEffect(() => {
    const icon = new L.Icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
    L.Marker.prototype.options.icon = icon;

    // Inject User Location Styles for Web
    if (typeof document !== 'undefined') {
      const styleId = 'user-location-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          .user-location-marker {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000 !important;
          }
          .dot-core {
            width: 14px;
            height: 14px;
            background: #4285F4;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 6px rgba(0,0,0,0.3);
            z-index: 2;
          }
          .pulse-aura {
            position: absolute;
            width: 40px;
            height: 40px;
            background: rgba(66, 133, 244, 0.2);
            border-radius: 50%;
            animation: mapPulse 2s ease-out infinite;
            z-index: 1;
          }
          @keyframes mapPulse {
            0% { transform: scale(0.5); opacity: 0.8; }
            100% { transform: scale(2); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, [L]);

  const MapRecenter = () => {
    const map = useMap();
    useEffect(() => {
      map.setView([center.latitude, center.longitude], map.getZoom(), { animate: true });
    }, [map, center.latitude, center.longitude]);
    return null;
  };

  const UserMarker = () => {
    if (!userLat || !userLng) return null;
    const userIcon = L.divIcon({
      className: 'user-location-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      html: '<div class="pulse-aura"></div><div class="dot-core"></div>'
    });
    return <Marker position={[userLat, userLng]} icon={userIcon} zIndexOffset={1000} />;
  };

  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={15}
      style={styles.leafletMap}
      zoomControl={false}
    >
      <MapRecenter />
      <UserMarker />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {stores
        .filter((store) => store.latitude && store.longitude)
        .map((store) => (
          <Marker
            key={store.store_id}
            position={[store.latitude as number, store.longitude as number]}
            eventHandlers={{
              click: () => onSelect(store.store_id),
            }}
          />
        ))}
    </MapContainer>
  );
}

function LeafletNativeMap({
  webViewRef,
  WebViewComponent,
  stores,
  center,
  onSelect,
  userLat,
  userLng,
  onManualPan,
}: {
  webViewRef: any;
  WebViewComponent: any;
  stores: StoreSummary[];
  center: MapRegion;
  onSelect: (storeId: string) => void;
  userLat?: number;
  userLng?: number;
  onManualPan: () => void;
}) {
  if (!WebViewComponent) return null;

  const markers = stores
    .filter((store) => store.latitude && store.longitude)
    .map((store) => ({
      store_id: store.store_id,
      latitude: store.latitude,
      longitude: store.longitude,
    }));

  const html = `<!doctype html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        html, body, #map { height: 100%; margin: 0; background: #f8f9fa; }
        .user-location-marker {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000 !important;
        }
        .dot-core {
          width: 14px;
          height: 14px;
          background: #4285F4;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(0,0,0,0.3);
          z-index: 2;
        }
        .pulse-aura {
          position: absolute;
          width: 40px;
          height: 40px;
          background: rgba(66, 133, 244, 0.2);
          border-radius: 50%;
          animation: mapPulse 2s ease-out infinite;
          z-index: 1;
        }
        @keyframes mapPulse {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        .start-marker {
          width: 14px;
          height: 14px;
          background: #757575;
          border: 2px solid white;
          border-radius: 50%;
          z-index: 999 !important;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        // Senior Dev Fix: Passive listeners for better scroll performance
        (function() {
          const originalAddEventListener = EventTarget.prototype.addEventListener;
          EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (['touchstart', 'touchmove', 'wheel', 'mousewheel'].includes(type)) {
              if (typeof options === 'boolean') {
                options = { capture: options, passive: true };
              } else if (typeof options === 'object') {
                options.passive = options.passive !== undefined ? options.passive : true;
              } else {
                options = { passive: true };
              }
            }
            return originalAddEventListener.call(this, type, listener, options);
          };
        })();

        function calculateDistance(lat1, lon1, lat2, lon2) {
          const R = 6371; // km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        }

        function calculateBearing(lat1, lon1, lat2, lon2) {
          const φ1 = lat1 * Math.PI / 180;
          const φ2 = lat2 * Math.PI / 180;
          const Δλ = (lon2 - lon1) * Math.PI / 180;
          const y = Math.sin(Δλ) * Math.cos(φ2);
          const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
          const θ = Math.atan2(y, x);
          return (θ * 180 / Math.PI + 360) % 360;
        }

        const map = L.map('map', { 
          zoomControl: false,
          attributionControl: false,
          tap: false
        }).setView([${center.latitude}, ${center.longitude}], 15);

        // Fix Tracking Prevention by overriding default icon logic
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        map.on('movestart', (e) => {
          if (e.originalEvent) {
             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'manualPan' }));
          }
        });
        
        const redPinIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [30, 48],
          iconAnchor: [15, 48],
          popupAnchor: [1, -34],
          shadowSize: [48, 48]
        });

        const userIcon = L.divIcon({ 
          className: 'user-location-marker', 
          iconSize: [24, 24], 
          iconAnchor: [12, 12],
          html: '<div class="pulse-aura"></div><div class="dot-core"></div>'
        });
        let userMarker = null;
        if (${userLat} && ${userLng}) {
          console.log('Initial user location:', ${userLat}, ${userLng});
          userMarker = L.marker([${userLat}, ${userLng}], { icon: userIcon }).addTo(map);
        }

        const markers = ${JSON.stringify(markers)};
        markers.forEach((m) => {
          const marker = L.marker([m.latitude, m.longitude], { icon: redPinIcon }).addTo(map);
          marker.on('click', () => {
            window.ReactNativeWebView.postMessage(JSON.stringify({ storeId: m.store_id }));
          });
        });

        window.addEventListener('message', (e) => {
          const data = JSON.parse(e.data);
          
          if (data.type === 'locationUpdate') {
            console.log('Location update received:', data.lat, data.lng);
            const userLatLng = L.latLng(data.lat, data.lng);
            if (!userMarker) {
              userMarker = L.marker(userLatLng, { icon: userIcon }).addTo(map);
            } else {
              userMarker.setLatLng(userLatLng);
            }
          }
        });
      </script>
    </body>
  </html>`;

  return (
    <WebViewComponent
      ref={webViewRef}
      key="main-map"
      originWhitelist={['*']}
      source={{ html }}
      style={{ flex: 1 }}
      onMessage={(event: any) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'manualPan') onManualPan();
          if (data.storeId) onSelect(data.storeId);
        } catch {
          // Ignore
        }
      }}
    />
  );
}

function RatingStars({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <View style={styles.starsRow}>
      {Array.from({ length: fullStars }).map((_, index) => (
        <MaterialIcons key={`full-${index}`} name="star" size={16} color={theme.colors.secondary} />
      ))}
      {hasHalf && <MaterialIcons name="star-half" size={16} color={theme.colors.secondary} />}
      {Array.from({ length: emptyStars }).map((_, index) => (
        <MaterialIcons key={`empty-${index}`} name="star-outline" size={16} color={theme.colors.secondary} />
      ))}
    </View>
  );
}

function StatusChip({ status }: { status: StoreSummary['status'] }) {
  const isOpen = status === 'active';
  return (
    <View style={[styles.statusChip, { backgroundColor: isOpen ? theme.colors.tertiaryFixed : theme.colors.errorContainer }]}> 
      <Text style={[styles.statusText, { color: isOpen ? theme.colors.onTertiaryFixed : theme.colors.onErrorContainer }]}> 
        {isOpen ? 'Open Now' : 'Closed'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  leafletMap: {
    width: '100%',
    height: '100%',
  },
  searchContainer: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 2,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.onSurface,
    ...theme.typography.bodyMedium,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 4,
  },
  storeList: {
    marginTop: 120,
    paddingHorizontal: 16,
    paddingBottom: 220,
    gap: 12,
  },
  storeRow: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  storeInfo: { flex: 1, gap: 6 },
  storeName: {
    ...theme.typography.button,
    color: theme.colors.onSurface,
  },
  storeAddress: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
  },
  storeMeta: { alignItems: 'flex-end', gap: 4 },
  bottomSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 3,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetTitleBlock: { flex: 1 },
  sheetTitle: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
  },
  sheetSub: {
    ...theme.typography.labelMedium,
    color: theme.colors.outline,
    marginTop: 2,
  },
  sheetRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { ...theme.typography.labelMedium, color: theme.colors.onSurfaceVariant },
  chipRow: { gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chipText: { 
    ...theme.typography.labelMedium, 
    color: theme.colors.onSurface,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  emptyChipText: { ...theme.typography.labelMedium, color: theme.colors.outline, paddingVertical: 4 },
  primaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...theme.typography.button,
    color: theme.colors.onPrimary,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondarySheetButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondarySheetButtonText: {
    ...theme.typography.button,
    color: theme.colors.primaryContainer,
  },
  starsRow: { flexDirection: 'row' },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    ...theme.typography.labelMedium,
    fontWeight: '600',
  },
  recenterButton: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 3,
  },
  navHeader: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  navInfo: {
    flex: 1,
  },
  navTitle: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
    fontSize: 16,
  },
  navSub: {
    ...theme.typography.bodySmall,
    color: theme.colors.primaryContainer,
    fontWeight: '600',
    marginTop: 2,
  },
  exitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
