import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { CustomerService, StoreSummary } from '../../src/services/customer';
import { theme } from '../../src/theme/theme';

const FAVORITES_KEY = 'customer:favorites';

export default function SavedScreen() {
  const router = useRouter();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loadingIds, setLoadingIds] = useState(true);

  const { data: stores = [], isLoading, refetch } = useQuery({
    queryKey: ['favorite-stores', favoriteIds.join(',')],
    queryFn: () => CustomerService.getStoresByIds(favoriteIds),
    enabled: favoriteIds.length > 0,
  });

  const loadFavorites = useCallback(async () => {
    setLoadingIds(true);
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    setFavoriteIds(raw ? JSON.parse(raw) : []);
    setLoadingIds(false);
  }, []);

  const removeFavorite = async (storeId: string) => {
    const next = favoriteIds.filter((id) => id !== storeId);
    setFavoriteIds(next);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    refetch();
  };

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  useEffect(() => {
    if (favoriteIds.length > 0) refetch();
  }, [favoriteIds, refetch]);

  const contentLoading = loadingIds || isLoading;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: 'Saved Stores' }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Favorite Stores</Text>
        <Text style={styles.headerSub}>Quick access to your saved sari-sari spots.</Text>
      </View>

      {contentLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primaryContainer} />
        </View>
      ) : favoriteIds.length === 0 ? (
        <View style={styles.centered}>
          <MaterialIcons name="favorite-border" size={40} color={theme.colors.outline} />
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySub}>Tap the heart on a store to save it here.</Text>
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => item.store_id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <StoreCard
              store={item}
              onPress={() => router.push(`/store/${item.store_id}`)}
              onRemove={() => removeFavorite(item.store_id)}
            />
          )}
        />
      )}
    </View>
  );
}

function StoreCard({ store, onPress, onRemove }: { store: StoreSummary; onPress: () => void; onRemove: () => void }) {
  const isOpen = store.status === 'active';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {store.image_url ? (
        <Image source={{ uri: store.image_url }} style={styles.cardImage} />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <MaterialIcons name="storefront" size={28} color={theme.colors.primaryContainer} />
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{store.store_name}</Text>
        <View style={styles.cardMetaRow}>
          <RatingStars rating={store.rating} />
          <Text style={styles.cardMetaText}>{store.rating.toFixed(1)}</Text>
          <Text style={styles.cardDot}>•</Text>
          <Text style={styles.cardMetaText}>~200m</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: isOpen ? theme.colors.tertiaryFixed : theme.colors.errorContainer }]}> 
          <Text style={[styles.statusText, { color: isOpen ? theme.colors.onTertiaryFixed : theme.colors.onErrorContainer }]}> 
            {isOpen ? 'Open Now' : 'Closed'}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={onRemove} style={styles.heartButton}>
        <MaterialIcons name="favorite" size={20} color={theme.colors.secondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function RatingStars({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <View style={styles.starsRow}>
      {Array.from({ length: fullStars }).map((_, index) => (
        <MaterialIcons key={`full-${index}`} name="star" size={14} color={theme.colors.secondary} />
      ))}
      {hasHalf && <MaterialIcons name="star-half" size={14} color={theme.colors.secondary} />}
      {Array.from({ length: emptyStars }).map((_, index) => (
        <MaterialIcons key={`empty-${index}`} name="star-outline" size={14} color={theme.colors.secondary} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.onSurface,
  },
  headerSub: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 8 },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
  },
  emptySub: {
    ...theme.typography.bodyMedium,
    color: theme.colors.outline,
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  cardImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: 6 },
  cardTitle: {
    ...theme.typography.button,
    color: theme.colors.onSurface,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardMetaText: {
    ...theme.typography.labelMedium,
    color: theme.colors.onSurfaceVariant,
  },
  cardDot: {
    ...theme.typography.labelMedium,
    color: theme.colors.outline,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    ...theme.typography.labelMedium,
    fontWeight: '600',
  },
  heartButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starsRow: { flexDirection: 'row' },
});
