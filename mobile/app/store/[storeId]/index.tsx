import { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { CustomerService } from '../../../src/services/customer';
import { ProductService } from '../../../src/services/product';
import { theme } from '../../../src/theme/theme';

export default function StoreProfileScreen() {
  const router = useRouter();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const [isFavorite, setIsFavorite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadFavorite = async () => {
      if (!storeId) return;
      const raw = await AsyncStorage.getItem('customer:favorites');
      const ids = raw ? JSON.parse(raw) : [];
      setIsFavorite(ids.includes(storeId));
    };
    loadFavorite();
  }, [storeId]);

  const { data: store, isLoading: loadingStore, refetch: refetchStore } = useQuery({
    queryKey: ['store', storeId],
    queryFn: () => CustomerService.getStoreById(storeId ?? ''),
    enabled: !!storeId,
  });

  useFocusEffect(
    useCallback(() => {
      if (storeId) refetchStore();
    }, [storeId, refetchStore])
  );

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['store-products', storeId],
    queryFn: () => ProductService.getByStoreId(storeId ?? ''),
    enabled: !!storeId,
  });

  const categories = useMemo(() => {
    const bucket = new Map<string, string[]>();
    const query = searchQuery.trim().toLowerCase();

    products.forEach((product) => {
      if (query && !product.name.toLowerCase().includes(query)) return;
      const key = product.category?.trim() || 'Essentials';
      if (!bucket.has(key)) bucket.set(key, []);
      bucket.get(key)!.push(product.name);
    });

    return Array.from(bucket.entries()).map(([category, items]) => ({ category, items }));
  }, [products, searchQuery]);

  if (loadingStore || loadingProducts) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primaryContainer} />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}> 
        <Text style={styles.emptyText}>Store not found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={theme.colors.primaryContainer} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Store Details</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

      {store.image_url ? (
        <Image source={{ uri: store.image_url }} style={styles.headerImage} />
      ) : (
        <View style={styles.headerPlaceholder}>
          <MaterialIcons name="storefront" size={48} color={theme.colors.primaryContainer} />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.storeName}>{store.store_name}</Text>
            <View style={styles.addressRow}>
              <MaterialIcons name="place" size={16} color={theme.colors.outline} />
              <Text style={styles.addressText}>{store.address ?? 'Address not set'}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.ratingBadge} onPress={() => router.push(`/store/${store.store_id}/reviews`)}>
              <MaterialIcons name="star" size={16} color={theme.colors.secondary} />
              <Text style={styles.ratingText}>{store.rating.toFixed(1)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={async () => {
                const raw = await AsyncStorage.getItem('customer:favorites');
                const ids = raw ? JSON.parse(raw) : [];
                const next = ids.includes(store.store_id)
                  ? ids.filter((id: string) => id !== store.store_id)
                  : [...ids, store.store_id];
                await AsyncStorage.setItem('customer:favorites', JSON.stringify(next));
                setIsFavorite(next.includes(store.store_id));
              }}
            >
              <MaterialIcons
                name={isFavorite ? 'favorite' : 'favorite-border'}
                size={20}
                color={isFavorite ? theme.colors.secondary : theme.colors.outline}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Call Store', 'Calling store...')}>
            <MaterialIcons name="call" size={20} color={theme.colors.primaryContainer} />
            <Text style={styles.actionText}>Call Store</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Message Store', 'Messaging store...')}>
            <MaterialIcons name="chat" size={20} color={theme.colors.primaryContainer} />
            <Text style={styles.actionText}>Message Store</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Product Availability</Text>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={18} color={theme.colors.outline} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products"
              placeholderTextColor={theme.colors.outline}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {categories.length === 0 ? (
          <Text style={styles.emptyText}>No matching products found.</Text>
        ) : (
          categories.map((category) => (
            <View key={category.category} style={styles.categoryBlock}>
              <Text style={styles.categoryTitle}>{category.category}</Text>
              <View style={styles.chipWrap}>
                {category.items.map((item) => (
                  <View key={item} style={styles.chip}>
                    <Text style={styles.chipText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(customer)')}>
          <MaterialIcons name="map" size={22} color={theme.colors.primaryContainer} />
          <Text style={styles.navLabelActive}>Explore</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(customer)/saved')}>
          <MaterialIcons name="favorite-border" size={22} color={theme.colors.outline} />
          <Text style={styles.navLabel}>Saved</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(customer)/profile')}>
          <MaterialIcons name="person-outline" size={22} color={theme.colors.outline} />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  topBarTitle: {
    ...theme.typography.button,
    color: theme.colors.primaryContainer,
  },
  topBarSpacer: {
    width: 40,
    height: 40,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurfaceVariant,
  },
  headerImage: {
    width: '100%',
    height: 220,
  },
  headerPlaceholder: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  titleBlock: { flex: 1, gap: 6 },
  storeName: {
    ...theme.typography.h2,
    color: theme.colors.onSurface,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  ratingText: {
    ...theme.typography.button,
    color: theme.colors.onSurface,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    height: 48,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: {
    ...theme.typography.button,
    color: theme.colors.primaryContainer,
  },
  sectionHeader: {
    marginTop: 8,
    gap: 12,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: theme.colors.surface,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
  },
  categoryBlock: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  categoryTitle: {
    ...theme.typography.button,
    color: theme.colors.onSurface,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  chipText: {
    ...theme.typography.labelMedium,
    color: theme.colors.onSurface,
  },
  bottomNav: {
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceVariant,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: theme.colors.outline,
  },
  navLabelActive: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primaryContainer,
  },
});
