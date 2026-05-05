import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Linking, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
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

  const itemChips = useMemo(() => {
    if (!selectedStoreItemsQuery.data) return [];
    return selectedStoreItemsQuery.data.map((item) => item.name).slice(0, 8);
  }, [selectedStoreItemsQuery.data]);

  const handleMapSelect = (storeId: string) => {
    const match = stores.find((store) => store.store_id === storeId);
    if (match) setSelectedStore(match);
  };

  const handleGetDirections = async () => {
    if (!selectedStore?.latitude || !selectedStore?.longitude) {
      Alert.alert('Directions', 'Store location is not available yet.');
      return;
    }

    const lat = selectedStore.latitude;
    const lng = selectedStore.longitude;
    const label = encodeURIComponent(selectedStore.store_name || 'Store');

    const url = Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Directions', 'Unable to open maps on this device.');
      return;
    }

    await Linking.openURL(url);
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
          />
        ) : (
          <LeafletNativeMap
            WebViewComponent={WebViewComponent}
            stores={stores}
            center={mapCenter}
            onSelect={handleMapSelect}
          />
        )}
      </View>

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
              <Text style={styles.sheetSub}>~200m away</Text>
            </View>
            <View style={styles.sheetRight}>
              <StatusChip status={selectedStore.status} />
              <View style={styles.ratingRow}>
                <RatingStars rating={selectedStore.rating} />
                <Text style={styles.ratingText}>{selectedStore.rating.toFixed(1)}</Text>
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
            <TouchableOpacity style={styles.secondarySheetButton} onPress={() => router.push(`/store/${selectedStore.store_id}`)}>
              <Text style={styles.secondarySheetButtonText}>View Store</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleGetDirections}>
              <Text style={styles.primaryButtonText}>Get Directions</Text>
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
}: {
  stores: StoreSummary[];
  center: MapRegion;
  onSelect: (storeId: string) => void;
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
  }, [L]);

  const MapRecenter = () => {
    const map = useMap();
    useEffect(() => {
      map.setView([center.latitude, center.longitude], map.getZoom(), { animate: true });
    }, [map, center.latitude, center.longitude]);
    return null;
  };

  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={15}
      style={styles.leafletMap}
      zoomControl={false}
    >
      <MapRecenter />
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
  WebViewComponent,
  stores,
  center,
  onSelect,
}: {
  WebViewComponent: any;
  stores: StoreSummary[];
  center: MapRegion;
  onSelect: (storeId: string) => void;
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
        const markers = ${JSON.stringify(markers)};
        markers.forEach((m) => {
          const marker = L.marker([m.latitude, m.longitude]).addTo(map);
          marker.on('click', () => {
            window.ReactNativeWebView.postMessage(JSON.stringify({ storeId: m.store_id }));
          });
        });
      </script>
    </body>
  </html>`;

  return (
    <WebViewComponent
      key={`${center.latitude}_${center.longitude}_${markers.length}`}
      originWhitelist={['*']}
      source={{ html }}
      style={{ flex: 1 }}
      onMessage={(event: any) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.storeId) onSelect(data.storeId);
        } catch {
          // Ignore malformed messages
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  chipText: { ...theme.typography.labelMedium, color: theme.colors.onSurface },
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
});
