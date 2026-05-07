import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, ScrollView, Platform,
  Animated, Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '../../src/theme/theme';
import { useStore } from '../../src/hooks/useStore';
import { ProductService, Product } from '../../src/services/product';
import { SalesService, SaleItemInput, CreateSaleInput } from '../../src/services/sales';
import { useOfflineMutation } from '../../src/hooks/useOfflineMutation';

export default function RecordSalesScreen() {
  const { store } = useStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [reviewVisible, setReviewVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(120)).current;

  // Fetch Products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', store?.store_id],
    queryFn: () => ProductService.getByStoreId(store!.store_id),
    enabled: !!store,
  });

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = products.map(p => p.category).filter(Boolean) as string[];
    return ['All', ...new Set(cats)].sort();
  }, [products]);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const saleMutation = useOfflineMutation<any, Error, CreateSaleInput, unknown>({
    mutationFn: (input: CreateSaleInput) => SalesService.create(input),
    getOutboxInput: (input: CreateSaleInput) => ({ op: 'sale_create', store_id: input.store_id, payload: input }),
    onSuccess: () => {
      const finalTotal = totalAmount;
      queryClient.invalidateQueries({ queryKey: ['sales', store?.store_id] });
      queryClient.invalidateQueries({ queryKey: ['products', store?.store_id] });
      setReviewVisible(false);
      
      // Navigate to financial hub first so the record page is gone
      router.replace('/(tabs)/financial_hub');
      
      // Show success alert on top of the financial hub
      Alert.alert(
        'Success',
        `Sale recorded successfully!\nTotal: ₱${finalTotal.toLocaleString()}`
      );
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const submitting = saleMutation.isPending;

  const setQty = (id: string, val: string, max: number) => {
    let num = parseInt(val, 10) || 0;
    if (num > max) num = max;
    if (num < 0) num = 0;
    setQtys((prev: Record<string, string>) => ({ ...prev, [id]: String(num === 0 && val === '' ? '' : num) }));
  };

  const soldItems = products
    .map((p: Product) => ({ product: p, qty: parseInt(qtys[p.product_id] ?? '0', 10) || 0 }))
    .filter((i: { product: Product; qty: number }) => i.qty > 0);

  const totalAmount = soldItems.reduce((sum: number, i: { product: Product; qty: number }) => sum + i.product.selling_price * i.qty, 0);
  const totalProfit = soldItems.reduce((sum: number, i: { product: Product; qty: number }) => sum + (i.product.selling_price - i.product.original_price) * i.qty, 0);

  // Floating Bar Animation
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: soldItems.length > 0 ? 0 : 120,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
    }).start();
  }, [soldItems.length]);

  const handleConfirm = async () => {
    if (!store) return;
    const items: SaleItemInput[] = soldItems.map(i => ({
      product_id: i.product.product_id,
      quantity: i.qty,
      price_at_sale: i.product.selling_price,
    }));

    const originalPrices: Record<string, number> = {};
    soldItems.forEach(i => { originalPrices[i.product.product_id] = i.product.original_price; });

    saleMutation.mutate({ store_id: store.store_id, items, originalPrices });
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ 
        title: 'End-of-Day Sales',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.colors.background },
        headerTitleStyle: { ...theme.typography.h3, color: theme.colors.primaryContainer, fontWeight: '800' },
      }} />

      {/* Top Search & Filter Bar */}
      <View style={styles.topSection}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={theme.colors.outline} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.outline}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="cancel" size={18} color={theme.colors.outline} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive
              ]}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === cat && styles.categoryTextActive
              ]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(p) => p.product_id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="inventory-2" size={40} color={theme.colors.outlineVariant} />
            </View>
            <Text style={styles.emptyText}>No products found matching filters.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const qty = qtys[item.product_id] ?? '';
          const hasQty = parseInt(qty, 10) > 0;
          const isOutOfStock = item.quantity <= 0;
          const isLowStock = item.quantity > 0 && item.quantity < 5;

          return (
            <View style={[
              styles.productCard,
              hasQty && styles.productCardActive,
              isOutOfStock && styles.productCardDisabled
            ]}>
              <View style={styles.cardMain}>
                {/* Product Image Thumbnail */}
                <View style={styles.imageBox}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.thumbnail} />
                  ) : (
                    <View style={styles.thumbnailPlaceholder}>
                      <MaterialIcons name="shopping-bag" size={20} color={theme.colors.outlineVariant} />
                    </View>
                  )}
                  {isOutOfStock && <View style={styles.imageOverlay} />}
                </View>

                <View style={styles.infoBox}>
                  <View style={styles.nameRow}>
                    <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                    {isOutOfStock && <View style={styles.statusBadgeErr}><Text style={styles.statusText}>SOLD OUT</Text></View>}
                    {isLowStock && !isOutOfStock && <View style={styles.statusBadgeWarn}><Text style={styles.statusText}>LOW</Text></View>}
                  </View>
                  
                  <View style={styles.priceRow}>
                    <Text style={styles.priceText}>₱{item.selling_price.toLocaleString()}</Text>
                    <View style={styles.stockDot} />
                    <Text style={[styles.stockText, isLowStock && { color: theme.colors.error }]}>{item.quantity} left</Text>
                  </View>
                </View>

                <View style={[styles.controlBox, isOutOfStock && { opacity: 0.2 }]}>
                  <TouchableOpacity
                    style={styles.controlBtn}
                    onPress={() => {
                      if (isOutOfStock) return;
                      const cur = parseInt(qty, 10) || 0;
                      if (cur > 0) setQty(item.product_id, String(cur - 1), item.quantity);
                    }}
                    disabled={isOutOfStock}
                  >
                    <MaterialIcons name="remove" size={16} color={theme.colors.onSurface} />
                  </TouchableOpacity>
                  
                  <TextInput
                    style={styles.controlInput}
                    value={qty}
                    onChangeText={(v) => {
                      if (isOutOfStock) return;
                      setQty(item.product_id, v.replace(/[^0-9]/g, ''), item.quantity);
                    }}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={theme.colors.outlineVariant}
                    editable={!isOutOfStock}
                  />

                  <TouchableOpacity
                    style={[styles.controlBtn, !isOutOfStock && { backgroundColor: theme.colors.primaryContainer }]}
                    onPress={() => {
                      if (isOutOfStock) return;
                      setQty(item.product_id, String((parseInt(qty, 10) || 0) + 1), item.quantity);
                    }}
                    disabled={isOutOfStock}
                  >
                    <MaterialIcons name="add" size={16} color={isOutOfStock ? theme.colors.onSurface : theme.colors.onPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Modern Floating Bar */}
      <Animated.View style={[
        styles.floatingBar,
        { transform: [{ translateY: slideAnim }] }
      ]}>
        <View style={styles.barBlur}>
          <View style={styles.barMain}>
            <View style={styles.barLabels}>
              <Text style={styles.barCount}>{soldItems.length} Products</Text>
              <Text style={styles.barTotal}>₱{totalAmount.toLocaleString()}</Text>
            </View>
            <TouchableOpacity 
              style={styles.reviewAction} 
              onPress={() => setReviewVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.reviewActionText}>Review Sale</Text>
              <View style={styles.reviewActionIcon}>
                <MaterialIcons name="chevron-right" size={20} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Review Modal - "High Fidelity Receipt" */}
      <Modal visible={reviewVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.receiptSheet}>
            <View style={styles.sheetTop}>
              <View style={styles.receiptIconBox}>
                <MaterialIcons name="point-of-sale" size={28} color={theme.colors.primary} />
              </View>
              <View style={styles.sheetHeaderInfo}>
                <Text style={styles.sheetTitle}>Review Recording</Text>
                <Text style={styles.sheetSubtitle}>Summary of products sold today</Text>
              </View>
              <TouchableOpacity onPress={() => setReviewVisible(false)} style={styles.sheetClose}>
                <MaterialIcons name="close" size={22} color={theme.colors.outline} />
              </TouchableOpacity>
            </View>

            <View style={styles.receiptBody}>
              <ScrollView style={styles.receiptList} showsVerticalScrollIndicator={false}>
                {soldItems.map(({ product, qty }) => (
                  <View key={product.product_id} style={styles.receiptItem}>
                    <View style={styles.receiptItemInfo}>
                      <Text style={styles.receiptItemName}>{product.name}</Text>
                      <Text style={styles.receiptItemSub}>₱{product.selling_price.toLocaleString()} × {qty}</Text>
                    </View>
                    <Text style={styles.receiptItemPrice}>₱{(product.selling_price * qty).toLocaleString()}</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.receiptFooter}>
                <View style={styles.receiptDash} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Revenue</Text>
                  <Text style={styles.summaryValue}>₱{totalAmount.toLocaleString()}</Text>
                </View>
                <View style={[styles.summaryRow, { marginTop: 4 }]}>
                  <Text style={styles.summaryLabel}>Estimated Profit</Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.tertiaryContainer, fontSize: 16 }]}>
                    + ₱{totalProfit.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.finalConfirmBtn}
              onPress={handleConfirm}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color={theme.colors.onPrimary} />
                : <><Text style={styles.finalConfirmText}>Confirm Sale Recording</Text><MaterialIcons name="check-circle" size={20} color={theme.colors.onPrimary} /></>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  topSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: theme.colors.background,
    gap: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  categoryScroll: {
    gap: 10,
    paddingRight: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
  },
  categoryTextActive: {
    color: theme.colors.onPrimary,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 160,
  },
  productCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    shadowColor: theme.colors.primaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  productCardActive: {
    borderColor: theme.colors.primaryContainer,
    borderWidth: 2,
    elevation: 4,
    shadowOpacity: 0.1,
  },
  productCardDisabled: {
    opacity: 0.7,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageBox: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceContainerLow,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  infoBox: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
    flexShrink: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  stockDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.outlineVariant,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.outline,
  },
  statusBadgeErr: { backgroundColor: theme.colors.errorContainer, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusBadgeWarn: { backgroundColor: theme.colors.secondaryFixed, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 8, fontWeight: '900', color: theme.colors.onSurface },

  controlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 14,
    padding: 2,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  controlInput: {
    width: 36,
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.onSurface,
    textAlign: 'center',
  },

  floatingBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  barBlur: {
    backgroundColor: theme.colors.primary,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  barMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 12,
  },
  barLabels: {
    flex: 1,
    paddingLeft: 12,
  },
  barCount: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.onPrimary,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  barTotal: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.onPrimary,
  },
  reviewAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.primaryContainer,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  reviewActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.onPrimary,
  },
  reviewActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 16,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.outline,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  receiptSheet: {
    backgroundColor: theme.colors.surface,
    borderRadius: 36,
    padding: 24,
    gap: 20,
  },
  sheetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  receiptIconBox: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHeaderInfo: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.onSurface,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: theme.colors.outline,
    fontWeight: '500',
  },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptBody: {
    gap: 16,
  },
  receiptList: {
    maxHeight: 300,
  },
  receiptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceContainerLow,
  },
  receiptItemInfo: {
    flex: 1,
    gap: 2,
  },
  receiptItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  receiptItemSub: {
    fontSize: 12,
    color: theme.colors.outline,
    fontWeight: '500',
  },
  receiptItemPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  receiptFooter: {
    gap: 12,
  },
  receiptDash: {
    height: 1,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderStyle: 'dashed',
    borderRadius: 1,
    marginVertical: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.onSurface,
  },
  finalConfirmBtn: {
    height: 64,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  finalConfirmText: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.onPrimary,
  },
});
