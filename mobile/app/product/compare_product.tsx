import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProductService } from '../../src/services/product';
import { useStore } from '../../src/hooks/useStore';
import { theme } from '../../src/theme/theme';

const MOCK_SUPPLIERS = [
  {
    id: '1',
    name: 'Metro Cash & Carry',
    rating: 4.9,
    distance: '2.3km away',
    price: 185.0,
    delivery: 'Today',
    bestValue: true,
  },
  {
    id: '2',
    name: 'Luzon Wholesale',
    rating: 4.5,
    distance: '5.1km away',
    price: 192.5,
    delivery: 'Tomorrow',
    bestValue: false,
  },
  {
    id: '3',
    name: 'Bayanihan Logistics',
    rating: 4.8,
    distance: '8.4km away',
    price: 195.0,
    delivery: '2 days',
    bestValue: false,
  },
];

export default function CompareProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { store } = useStore();

  const { data: products = [] } = useQuery({
    queryKey: ['products', store?.store_id],
    queryFn: () => ProductService.getByStoreId(store!.store_id),
    enabled: !!store,
  });

  const product = products.find((p) => p.product_id === id);

  if (!product) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centered}>
          <MaterialIcons name="inventory-2" size={48} color={theme.colors.outline} />
          <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant, marginTop: 16 }]}>
            Product not found.
          </Text>
        </View>
      </View>
    );
  }

  const skuShort = product.product_id.slice(-8).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 16),
            borderBottomColor: theme.colors.surfaceVariant,
            backgroundColor: `${theme.colors.surface}F0`,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>
          Compare Suppliers
        </Text>

        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.productCard,
            { backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.surfaceVariant },
          ]}
        >
          <View
            style={[
              styles.productImageBox,
              { backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.surfaceVariant },
            ]}
          >
            <MaterialIcons name="inventory-2" size={32} color={theme.colors.outline} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[theme.typography.bodyLarge, { color: theme.colors.onSurface, fontWeight: '600' }]}
              numberOfLines={2}
            >
              {product.name}
            </Text>
            <View style={styles.productMeta}>
              <View style={[styles.skuBadge, { backgroundColor: theme.colors.surfaceContainer }]}>
                <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>
                  SKU: {skuShort}
                </Text>
              </View>
              <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>
                • {product.quantity} units
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text
            style={[
              theme.typography.labelMedium,
              { color: theme.colors.onSurfaceVariant, letterSpacing: 1.2, textTransform: 'uppercase' },
            ]}
          >
            Available Suppliers
          </Text>
          <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>
            {MOCK_SUPPLIERS.length} found
          </Text>
        </View>

        {MOCK_SUPPLIERS.map((supplier) => (
          <View
            key={supplier.id}
            style={[
              styles.supplierCard,
              { backgroundColor: theme.colors.surfaceContainerLow },
              supplier.bestValue
                ? {
                    borderWidth: 2,
                    borderColor: theme.colors.primaryFixedDim,
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 16,
                    elevation: 8,
                    marginTop: 18,
                  }
                : {
                    borderWidth: 1,
                    borderColor: theme.colors.surfaceVariant,
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    elevation: 2,
                  },
            ]}
          >
            {supplier.bestValue && (
              <View
                style={[
                  styles.bestValueBadge,
                  { backgroundColor: theme.colors.tertiaryFixed, borderColor: theme.colors.tertiaryFixedDim },
                ]}
              >
                <MaterialIcons name="star" size={14} color={theme.colors.onTertiaryFixed} />
                <Text
                  style={[theme.typography.labelMedium, { color: theme.colors.onTertiaryFixed, fontWeight: '700', marginLeft: 4 }]}
                >
                  Best Value
                </Text>
              </View>
            )}

            <View style={styles.supplierNameRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    supplier.bestValue ? theme.typography.h3 : theme.typography.bodyLarge,
                    { color: supplier.bestValue ? theme.colors.primary : theme.colors.onSurface, fontWeight: supplier.bestValue ? '700' : '600' },
                  ]}
                >
                  {supplier.name}
                </Text>
                <View style={styles.supplierMeta}>
                  <View style={styles.metaItem}>
                    <MaterialIcons name="star" size={16} color="#f0bf65" />
                    <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant, marginLeft: 3 }]}>
                      {supplier.rating}
                    </Text>
                  </View>
                  <View style={styles.dot} />
                  <View style={styles.metaItem}>
                    <MaterialIcons name="location-on" size={16} color={theme.colors.onSurfaceVariant} />
                    <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant, marginLeft: 3 }]}>
                      {supplier.distance}
                    </Text>
                  </View>
                </View>
              </View>

              {!supplier.bestValue && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[theme.typography.h3, { color: theme.colors.onSurface, fontWeight: '700' }]}>
                    ₱{supplier.price.toFixed(2)}
                  </Text>
                  <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>
                    / case
                  </Text>
                </View>
              )}
            </View>

            {supplier.bestValue && (
              <View
                style={[
                  styles.priceDeliveryBox,
                  { backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.surfaceVariant },
                ]}
              >
                <View>
                  <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant, marginBottom: 2 }]}>
                    Price per Case
                  </Text>
                  <Text style={[theme.typography.h2, { color: theme.colors.primary, fontWeight: '800' }]}>
                    ₱{supplier.price.toFixed(2)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant, marginBottom: 2 }]}>
                    Est. Delivery
                  </Text>
                  <View style={styles.metaItem}>
                    <MaterialIcons name="local-shipping" size={16} color={theme.colors.onSurface} />
                    <Text style={[theme.typography.button, { color: theme.colors.onSurface, marginLeft: 4 }]}>
                      {supplier.delivery}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.ctaButton,
                supplier.bestValue
                  ? {
                      backgroundColor: theme.colors.primary,
                      shadowColor: theme.colors.primary,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 8,
                      elevation: 3,
                    }
                  : {
                      backgroundColor: 'transparent',
                      borderWidth: 2,
                      borderColor: `${theme.colors.primary}30`,
                    },
              ]}
              activeOpacity={0.8}
              onPress={() =>
                Alert.alert(
                  supplier.bestValue ? 'Order Now' : 'Select Supplier',
                  `Contacting ${supplier.name}…`,
                )
              }
            >
              {supplier.bestValue && (
                <MaterialIcons name="shopping-cart" size={20} color={theme.colors.onPrimary} />
              )}
              <Text
                style={[
                  theme.typography.button,
                  { color: supplier.bestValue ? theme.colors.onPrimary : theme.colors.primary, marginLeft: supplier.bestValue ? 8 : 0 },
                ]}
              >
                {supplier.bestValue ? 'Order Now' : 'Select Supplier'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: { backdropFilter: 'blur(12px)' },
    }),
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...theme.typography.h3,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#003a40',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  productImageBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  skuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 8,
  },
  supplierCard: {
    borderRadius: 16,
    padding: 16,
    position: 'relative',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -14,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    zIndex: 10,
  },
  supplierNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  supplierMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.outlineVariant,
    marginHorizontal: 10,
  },
  priceDeliveryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  ctaButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
