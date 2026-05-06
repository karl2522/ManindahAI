import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../src/theme/theme';
import { useStore } from '../../src/hooks/useStore';
import { SalesService, Sale, SaleItem } from '../../src/services/sales';

type SaleItemWithName = SaleItem & { product_name: string };

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function SalesHistoryScreen() {
  const { store } = useStore();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemsMap, setItemsMap] = useState<Record<string, SaleItemWithName[]>>({});
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  const { data: sales = [], isLoading, refetch } = useQuery({
    queryKey: ['sales', store?.store_id],
    queryFn: () => SalesService.getByStoreId(store!.store_id),
    enabled: !!store,
  });

  useFocusEffect(useCallback(() => {
    if (store) refetch();
  }, [store]));

  const toggleExpand = async (sale: Sale) => {
    if (expanded === sale.sale_id) {
      setExpanded(null);
      return;
    }
    setExpanded(sale.sale_id);
    if (itemsMap[sale.sale_id]) return;
    setLoadingItemId(sale.sale_id);
    try {
      const items = await SalesService.getSaleItems(sale.sale_id);
      setItemsMap(prev => ({ ...prev, [sale.sale_id]: items }));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoadingItemId(null);
    }
  };

  const deleteSale = (sale: Sale) => {
    Alert.alert(
      'Delete Sale',
      'Delete this sale record? Stock will NOT be restored.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await SalesService.delete(sale.sale_id);
            queryClient.invalidateQueries({ queryKey: ['sales', store!.store_id] });
          } catch (e: any) { Alert.alert('Error', e.message); }
        }},
      ]
    );
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
      <Stack.Screen options={{ title: 'Sales History' }} />

      <FlatList
        data={sales}
        keyExtractor={s => s.sale_id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[theme.typography.h1, { color: theme.colors.onSurface }]}>Sales History</Text>
            <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant }]}>
              {sales.length} sale{sales.length !== 1 ? 's' : ''} recorded
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <MaterialIcons name="receipt-long" size={48} color={theme.colors.outline} />
            <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }]}>
              No sales recorded yet.
            </Text>
          </View>
        }
        renderItem={({ item: sale }) => {
          const isExpanded = expanded === sale.sale_id;
          const items = itemsMap[sale.sale_id];
          const isLoadingThis = loadingItemId === sale.sale_id;

          return (
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceContainerLow }]}>
              <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(sale)} activeOpacity={0.7}>
                <View style={[styles.icon, { backgroundColor: `${theme.colors.tertiaryFixed}66` }]}>
                  <MaterialIcons name="storefront" size={22} color={theme.colors.tertiaryContainer} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[theme.typography.button, { color: theme.colors.onSurface }]}>End-of-Day Sale</Text>
                  <Text style={[theme.typography.labelMedium, { color: theme.colors.outline }]}>{fmtDate(sale.date)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                  <Text style={[theme.typography.button, { color: theme.colors.tertiaryContainer }]}>+₱{sale.total_amount.toFixed(2)}</Text>
                  <Text style={[theme.typography.labelMedium, { color: theme.colors.outline }]}>₱{sale.total_profit.toFixed(2)} profit</Text>
                </View>
                <MaterialIcons
                  name={isExpanded ? 'expand-less' : 'expand-more'}
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={[styles.itemsContainer, { borderTopColor: theme.colors.surfaceContainerLow }]}>
                  {isLoadingThis ? (
                    <ActivityIndicator color={theme.colors.primary} style={{ paddingVertical: 16 }} />
                  ) : (items ?? []).map(item => (
                    <View key={item.sale_item_id} style={[styles.itemRow, { borderBottomColor: theme.colors.surfaceContainerLow }]}>
                      <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurface, flex: 1 }]} numberOfLines={1}>
                        {item.product_name}
                      </Text>
                      <Text style={[theme.typography.labelMedium, { color: theme.colors.outline, marginHorizontal: 8 }]}>
                        x{item.quantity}
                      </Text>
                      <Text style={[theme.typography.button, { color: theme.colors.primaryContainer }]}>
                        ₱{(item.price_at_sale * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.deleteRow} onPress={() => deleteSale(sale)}>
                    <MaterialIcons name="delete-outline" size={16} color={theme.colors.error} />
                    <Text style={[theme.typography.labelMedium, { color: theme.colors.error, marginLeft: 4 }]}>
                      Delete record
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { marginBottom: 16 },
  listContent: { padding: theme.spacing.containerPadding, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemsContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    justifyContent: 'flex-end',
  },
});
