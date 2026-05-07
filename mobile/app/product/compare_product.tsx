import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InventoryService } from '../../src/services/inventory';
import { ProductService } from '../../src/services/product';
import { useStore } from '../../src/hooks/useStore';
import { theme } from '../../src/theme/theme';

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

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['inventory_logs', id],
    queryFn: () => InventoryService.getLogs(id),
    enabled: !!id,
  });

  const product = products.find((p) => p.product_id === id);

  const priceHistory = useMemo(() => {
    if (!product) return [];

    // 1. Filter logs that have price change data
    // We check for both old_price and new_price to ensure it's a price-related log
    const priceLogs = [...logs]
      .filter(log => (log.old_price !== undefined && log.old_price !== null) || (log.new_price !== undefined && log.new_price !== null))
      .sort((a, b) => {
        const dateA = new Date(a.date || (a as any).created_at || 0).getTime();
        const dateB = new Date(b.date || (b as any).created_at || 0).getTime();
        return dateB - dateA;
      });
    
    const history = [];

    // 2. Current Price (Top of list)
    history.push({
      date: 'Today',
      price: product.selling_price,
      status: 'Current',
      label: 'Latest Price'
    });

    // 3. Map all past prices from the logs
    // Each log's 'old_price' is the price it was BEFORE that specific change
    priceLogs.forEach((log, index) => {
      if (log.old_price !== undefined && log.old_price !== null) {
        const logDate = log.date || (log as any).created_at;
        history.push({
          date: logDate ? new Date(logDate).toLocaleDateString('en-PH', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : 'Unknown Date',
          price: log.old_price,
          status: index === 0 ? 'Previous' : 'Old',
          label: index === 0 ? 'Last Price' : 'Past Price'
        });
      }
    });

    return history;
  }, [logs, product]);

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
          Compare Prices
        </Text>

        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Brief */}
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
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <MaterialIcons name="inventory-2" size={32} color={theme.colors.outline} />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[theme.typography.h3, { color: theme.colors.onSurface, fontWeight: '700' }]}
              numberOfLines={1}
            >
              {product.name}
            </Text>
            <View style={styles.productMeta}>
              <View style={[styles.skuBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text 
                  style={[theme.typography.labelMedium, { color: theme.colors.onPrimaryContainer, fontWeight: '700' }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Sell: ₱{product.selling_price.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.skuBadge, { backgroundColor: theme.colors.secondaryContainer }]}>
                <Text 
                  style={[theme.typography.labelMedium, { color: theme.colors.onSecondaryContainer, fontWeight: '700' }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Cost: ₱{product.original_price.toFixed(2)}
                </Text>
              </View>
              <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>
                Qty: {product.quantity}
              </Text>
            </View>
          </View>
        </View>

        {/* Price History Section */}
        <View style={styles.sectionHeader}>
          <Text
            style={[
              theme.typography.labelMedium,
              { color: theme.colors.onSurfaceVariant, letterSpacing: 1.2, textTransform: 'uppercase' },
            ]}
          >
            Internal Price History
          </Text>
        </View>

        <View style={[styles.historyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceVariant }]}>
          {loadingLogs ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : priceHistory.length <= 1 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant }]}>No previous price changes recorded.</Text>
            </View>
          ) : (
            priceHistory.map((item, idx) => (
              <View key={idx} style={[styles.historyRow, idx !== priceHistory.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceVariant }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text 
                      style={[theme.typography.h3, { color: theme.colors.onSurface, fontWeight: '700' }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      ₱{item.price.toFixed(2)}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'Current' ? theme.colors.primaryContainer : theme.colors.surfaceContainerHigh }]}>
                      <Text style={[theme.typography.labelSmall, { color: item.status === 'Current' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant, fontWeight: '700' }]}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant, marginTop: 2 }]}>
                    {item.label} • {item.date}
                  </Text>
                </View>
                <MaterialIcons 
                  name={idx === 0 ? "check-circle" : "history"} 
                  size={20} 
                  color={idx === 0 ? theme.colors.primary : theme.colors.outline} 
                />
              </View>
            ))
          )}
        </View>

        {/* Insights Summary */}
        <View style={[styles.infoBox, { backgroundColor: theme.colors.secondaryContainer }]}>
          <MaterialIcons name="info" size={20} color={theme.colors.onSecondaryContainer} />
          <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSecondaryContainer, flex: 1, marginLeft: 12 }]}>
            This history reflects all price edits made in the inventory. Use this to track your profit margins and adjustment trends.
          </Text>
        </View>
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
    gap: 16,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#003a40',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  productImageBox: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  skuBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 12,
  },
  historyCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    alignItems: 'center',
  },
});
