import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, ScrollView, Platform,
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

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', store?.store_id],
    queryFn: () => ProductService.getByStoreId(store!.store_id),
    enabled: !!store,
  });

  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [reviewVisible, setReviewVisible] = useState(false);

  const saleMutation = useOfflineMutation<any, Error, CreateSaleInput, unknown>({
    mutationFn: (input: CreateSaleInput) => SalesService.create(input),
    getOutboxInput: (input: CreateSaleInput) => ({ op: 'sale_create', store_id: input.store_id, payload: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', store?.store_id] });
      queryClient.invalidateQueries({ queryKey: ['products', store?.store_id] });
      setReviewVisible(false);
      Alert.alert(
        'Sale Recorded!',
        `Revenue: ₱${totalAmount.toFixed(2)}\nProfit: ₱${totalProfit.toFixed(2)}`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const submitting = saleMutation.isPending;

  const setQty = (id: string, val: string) => setQtys((prev: Record<string, string>) => ({ ...prev, [id]: val }));

  const soldItems = products
    .map((p: Product) => ({ product: p, qty: parseInt(qtys[p.product_id] ?? '0', 10) || 0 }))
    .filter((i: { product: Product; qty: number }) => i.qty > 0);

  const totalAmount = soldItems.reduce((sum: number, i: { product: Product; qty: number }) => sum + i.product.selling_price * i.qty, 0);
  const totalProfit = soldItems.reduce((sum: number, i: { product: Product; qty: number }) => sum + (i.product.selling_price - i.product.original_price) * i.qty, 0);

  const handleConfirm = async () => {
    if (!store) return;
    
    const items: SaleItemInput[] = soldItems.map((i: { product: Product; qty: number }) => ({
      product_id: i.product.product_id,
      quantity: i.qty,
      price_at_sale: i.product.selling_price,
    }));

    const originalPrices: Record<string, number> = {};
    soldItems.forEach((i: { product: Product; qty: number }) => {
      originalPrices[i.product.product_id] = i.product.original_price;
    });

    saleMutation.mutate({ 
      store_id: store.store_id, 
      items,
      originalPrices 
    });
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
      <Stack.Screen options={{ title: 'Record Sales' }} />

      <View style={styles.headerPad}>
        <Text style={[theme.typography.h1, { color: theme.colors.onSurface }]}>End of Day</Text>
        <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant }]}>
          Enter quantities sold for each product.
        </Text>
      </View>

      <FlatList
        data={products}
        keyExtractor={(p: Product) => p.product_id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant }]}>
              No products found.
            </Text>
          </View>
        }
        renderItem={({ item }: { item: Product }) => {
          const qty = qtys[item.product_id] ?? '';
          const hasQty = parseInt(qty, 10) > 0;
          return (
            <View style={[
              styles.productRow,
              { backgroundColor: theme.colors.surface, borderColor: hasQty ? theme.colors.primaryContainer : theme.colors.surfaceContainerLow },
              hasQty && styles.highlightedRow,
            ]}>
              <View style={{ flex: 1 }}>
                <Text style={[theme.typography.button, { color: theme.colors.onSurface }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[theme.typography.labelMedium, { color: theme.colors.outline }]}>
                  ₱{item.selling_price.toFixed(2)} · Stock: {item.quantity}
                </Text>
              </View>
              <View style={styles.qtyContainer}>
                <TouchableOpacity
                  style={[styles.qtyBtn, { backgroundColor: theme.colors.surfaceContainerLow }]}
                  onPress={() => {
                    const cur = parseInt(qty, 10) || 0;
                    if (cur > 0) setQty(item.product_id, String(cur - 1));
                  }}
                >
                  <MaterialIcons name="remove" size={18} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.qtyInput, { borderColor: theme.colors.outlineVariant }]}
                  value={qty}
                  onChangeText={(v: string) => setQty(item.product_id, v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={theme.colors.outline}
                  textAlign="center"
                />
                <TouchableOpacity
                  style={[styles.qtyBtn, { backgroundColor: theme.colors.primaryContainer }]}
                  onPress={() => setQty(item.product_id, String((parseInt(qty, 10) || 0) + 1))}
                >
                  <MaterialIcons name="add" size={18} color={theme.colors.onPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Bottom Review Bar */}
      <View style={[styles.reviewBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.surfaceVariant }]}>
        <View>
          <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>
            {soldItems.length} item{soldItems.length !== 1 ? 's' : ''} sold
          </Text>
          <Text style={[theme.typography.button, { color: theme.colors.primaryContainer }]}>
            ₱{totalAmount.toFixed(2)} revenue
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.reviewBtn,
            { backgroundColor: soldItems.length === 0 ? theme.colors.surfaceContainerLow : theme.colors.primary },
          ]}
          onPress={() => {
            if (soldItems.length === 0) return Alert.alert('No items', 'Enter at least one sold quantity.');
            setReviewVisible(true);
          }}
        >
          <Text style={[theme.typography.button, { color: soldItems.length === 0 ? theme.colors.outline : theme.colors.onPrimary }]}>
            Review
          </Text>
          <MaterialIcons name="chevron-right" size={20} color={soldItems.length === 0 ? theme.colors.outline : theme.colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* Review Modal */}
      <Modal visible={reviewVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.sheetHeader}>
              <Text style={[theme.typography.h3, { color: theme.colors.onSurface }]}>Review Sale</Text>
              <TouchableOpacity onPress={() => setReviewVisible(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {soldItems.map(({ product, qty }: { product: Product; qty: number }) => (
                <View key={product.product_id} style={[styles.reviewItem, { borderBottomColor: theme.colors.surfaceContainerLow }]}>
                  <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurface, flex: 1 }]} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={[theme.typography.labelMedium, { color: theme.colors.outline, marginHorizontal: 8 }]}>
                    x{qty}
                  </Text>
                  <Text style={[theme.typography.button, { color: theme.colors.primaryContainer }]}>
                    ₱{(product.selling_price * qty).toFixed(2)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={[styles.totalsContainer, { borderTopColor: theme.colors.outlineVariant }]}>
              <View style={styles.totalRow}>
                <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant }]}>Total Revenue</Text>
                <Text style={[theme.typography.button, { color: theme.colors.primaryContainer }]}>₱{totalAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant }]}>Estimated Profit</Text>
                <Text style={[theme.typography.button, { color: theme.colors.tertiaryContainer }]}>₱{totalProfit.toFixed(2)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }]}
              onPress={handleConfirm}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color={theme.colors.onPrimary} />
                : <Text style={[theme.typography.button, { color: theme.colors.onPrimary }]}>Confirm Sale</Text>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  headerPad: { padding: theme.spacing.containerPadding, paddingBottom: 8 },
  listContent: { paddingHorizontal: theme.spacing.containerPadding, paddingBottom: 120 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  highlightedRow: { borderWidth: 2 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    width: 48,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  reviewBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 12,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  totalsContainer: { borderTopWidth: 1, paddingTop: 16, marginTop: 8, marginBottom: 8 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  confirmBtn: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
});
