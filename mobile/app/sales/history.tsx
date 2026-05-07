import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal,
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

function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function SalesHistoryScreen() {
  const { store } = useStore();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemsMap, setItemsMap] = useState<Record<string, SaleItemWithName[]>>({});
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: sales = [], isLoading, refetch } = useQuery({
    queryKey: ['sales', store?.store_id],
    queryFn: () => SalesService.getByStoreId(store!.store_id),
    enabled: !!store,
  });

  useFocusEffect(useCallback(() => {
    if (store) refetch();
  }, [store]));

  const salesByDate = useMemo(() => {
    const map: Record<string, Sale[]> = {};
    for (const sale of sales) {
      const key = toLocalDateKey(new Date(sale.date));
      if (!map[key]) map[key] = [];
      map[key].push(sale);
    }
    return map;
  }, [sales]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks: (number | null)[][] = [];
    let day = 1;
    for (let w = 0; w < 6; w++) {
      const week: (number | null)[] = [];
      for (let d = 0; d < 7; d++) {
        if (w === 0 && d < firstDay) week.push(null);
        else if (day > daysInMonth) week.push(null);
        else week.push(day++);
      }
      weeks.push(week);
      if (day > daysInMonth) break;
    }
    return weeks;
  }, [calendarMonth]);

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

  const todayKey = toLocalDateKey(new Date());
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: 'Sales History' }} />

      {/* View Toggle */}
      <View style={styles.toggleRow}>
        <View style={[styles.toggleContainer, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setViewMode('list')}
          >
            <MaterialIcons name="list" size={18} color={viewMode === 'list' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant} />
            <Text style={[styles.toggleBtnText, { color: viewMode === 'list' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'calendar' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setViewMode('calendar')}
          >
            <MaterialIcons name="calendar-month" size={18} color={viewMode === 'calendar' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant} />
            <Text style={[styles.toggleBtnText, { color: viewMode === 'calendar' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }]}>Calendar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'list' ? (
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
                  <MaterialIcons name={isExpanded ? 'expand-less' : 'expand-more'} size={24} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={[styles.itemsContainer, { borderTopColor: theme.colors.surfaceContainerLow }]}>
                    {isLoadingThis ? (
                      <ActivityIndicator color={theme.colors.primary} style={{ paddingVertical: 16 }} />
                    ) : (items ?? []).map(item => (
                      <View key={item.sale_item_id} style={[styles.itemRow, { borderBottomColor: theme.colors.surfaceContainerLow }]}>
                        <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurface, flex: 1 }]} numberOfLines={1}>{item.product_name}</Text>
                        <Text style={[theme.typography.labelMedium, { color: theme.colors.outline, marginHorizontal: 8 }]}>x{item.quantity}</Text>
                        <Text style={[theme.typography.button, { color: theme.colors.primaryContainer }]}>₱{(item.price_at_sale * item.quantity).toFixed(2)}</Text>
                      </View>
                    ))}
                    <TouchableOpacity style={styles.deleteRow} onPress={() => deleteSale(sale)}>
                      <MaterialIcons name="delete-outline" size={16} color={theme.colors.error} />
                      <Text style={[theme.typography.labelMedium, { color: theme.colors.error, marginLeft: 4 }]}>Delete record</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.calendarContent} showsVerticalScrollIndicator={false}>
          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={() => { setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)); setSelectedDate(null); }}
            >
              <MaterialIcons name="chevron-left" size={28} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={[theme.typography.h3, { color: theme.colors.onSurface, fontWeight: '700' }]}>
              {MONTH_LABELS[month]} {year}
            </Text>
            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={() => { setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)); setSelectedDate(null); }}
            >
              <MaterialIcons name="chevron-right" size={28} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Calendar Grid */}
          <View style={[styles.calendarGrid, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceVariant }]}>
            <View style={styles.calendarWeek}>
              {DAY_LABELS.map((d, i) => (
                <Text key={i} style={[styles.dayLabel, { color: theme.colors.outline }]}>{d}</Text>
              ))}
            </View>
            {calendarDays.map((week, wi) => (
              <View key={wi} style={styles.calendarWeek}>
                {week.map((day, di) => {
                  if (!day) return <View key={`e-${wi}-${di}`} style={styles.dayCell} />;
                  const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const daySales = salesByDate[dateKey] ?? [];
                  const hasSales = daySales.length > 0;
                  const isToday = dateKey === todayKey;
                  const isSelected = dateKey === selectedDate;
                  const dayRevenue = daySales.reduce((s, sale) => s + sale.total_amount, 0);
                  return (
                    <TouchableOpacity
                      key={dateKey}
                      style={[
                        styles.dayCell,
                        isToday && styles.dayCellToday,
                        isSelected && { backgroundColor: theme.colors.primary, borderColor: 'transparent' },
                      ]}
                      onPress={() => hasSales && setSelectedDate(dateKey)}
                      activeOpacity={hasSales ? 0.7 : 1}
                    >
                      <Text style={[
                        styles.dayText,
                        { color: theme.colors.onSurface },
                        isToday && { color: theme.colors.primary, fontWeight: '800' },
                        isSelected && { color: theme.colors.onPrimary, fontWeight: '800' },
                      ]}>{day}</Text>
                      {hasSales && (
                        <View style={[styles.saleDot, { backgroundColor: isSelected ? theme.colors.onPrimary : theme.colors.primary }]} />
                      )}
                      {hasSales && !isSelected && (
                        <Text style={[styles.dayAmountText, { color: theme.colors.primary }]}>
                          ₱{dayRevenue >= 1000 ? `${(dayRevenue / 1000).toFixed(1)}k` : dayRevenue.toFixed(0)}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

        </ScrollView>
      )}

      {/* Day Detail Modal */}
      <Modal
        visible={!!selectedDate}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDate(null)}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelectedDate(null)} />
        <View style={[styles.modalSheet, { backgroundColor: theme.colors.background }]}>
          {/* Handle */}
          <View style={[styles.modalHandle, { backgroundColor: theme.colors.surfaceVariant }]} />

          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.surfaceVariant }]}>
            <View style={{ flex: 1 }}>
              <Text style={[theme.typography.h3, { color: theme.colors.onSurface, fontWeight: '700' }]}>
                {selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
              </Text>
              {selectedDate && (
                <Text style={[theme.typography.labelMedium, { color: theme.colors.outline }]}>
                  Total: ₱{(salesByDate[selectedDate] ?? []).reduce((s, sale) => s + sale.total_amount, 0).toFixed(2)}
                  {'  '}Profit: ₱{(salesByDate[selectedDate] ?? []).reduce((s, sale) => s + sale.total_profit, 0).toFixed(2)}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.modalCloseBtn}>
              <MaterialIcons name="close" size={22} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Sales List */}
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedDate && (salesByDate[selectedDate] ?? []).map(sale => {
              const isExpanded = expanded === sale.sale_id;
              const items = itemsMap[sale.sale_id];
              const isLoadingThis = loadingItemId === sale.sale_id;
              return (
                <View key={sale.sale_id} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceContainerLow, marginBottom: 8 }]}>
                  <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(sale)} activeOpacity={0.7}>
                    <View style={[styles.icon, { backgroundColor: `${theme.colors.primaryFixed}44` }]}>
                      <MaterialIcons name="receipt" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[theme.typography.button, { color: theme.colors.onSurface }]}>End-of-Day Sale</Text>
                      <Text style={[theme.typography.labelMedium, { color: theme.colors.outline }]}>
                        {new Date(sale.date).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                      <Text style={[theme.typography.button, { color: theme.colors.tertiaryContainer }]}>+₱{sale.total_amount.toFixed(2)}</Text>
                      <Text style={[theme.typography.labelMedium, { color: theme.colors.outline }]}>₱{sale.total_profit.toFixed(2)} profit</Text>
                    </View>
                    <MaterialIcons name={isExpanded ? 'expand-less' : 'expand-more'} size={24} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={[styles.itemsContainer, { borderTopColor: theme.colors.surfaceContainerLow }]}>
                      {isLoadingThis ? (
                        <ActivityIndicator color={theme.colors.primary} style={{ paddingVertical: 16 }} />
                      ) : (items ?? []).map(item => (
                        <View key={item.sale_item_id} style={[styles.itemRow, { borderBottomColor: theme.colors.surfaceContainerLow }]}>
                          <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurface, flex: 1 }]} numberOfLines={1}>{item.product_name}</Text>
                          <Text style={[theme.typography.labelMedium, { color: theme.colors.outline, marginHorizontal: 8 }]}>x{item.quantity}</Text>
                          <Text style={[theme.typography.button, { color: theme.colors.primaryContainer }]}>₱{(item.price_at_sale * item.quantity).toFixed(2)}</Text>
                        </View>
                      ))}
                      <TouchableOpacity style={styles.deleteRow} onPress={() => deleteSale(sale)}>
                        <MaterialIcons name="delete-outline" size={16} color={theme.colors.error} />
                        <Text style={[theme.typography.labelMedium, { color: theme.colors.error, marginLeft: 4 }]}>Delete record</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
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
  toggleRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceContainerLow,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    alignSelf: 'center',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  calendarContent: {
    padding: 16,
    paddingBottom: 40,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  monthNavBtn: { padding: 4 },
  calendarGrid: {
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  calendarWeek: {
    flexDirection: 'row',
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    paddingBottom: 8,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dayCellToday: {
    borderColor: theme.colors.primary,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  saleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  dayAmountText: {
    fontSize: 7,
    fontWeight: '700',
    lineHeight: 10,
    marginTop: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
    paddingBottom: 32,
  },
});
