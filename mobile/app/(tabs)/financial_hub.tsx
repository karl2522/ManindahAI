import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, TextInput, ActivityIndicator, Platform,
  LayoutAnimation, UIManager, Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../src/theme/theme';
import { useStore } from '../../src/hooks/useStore';
import { SalesService, Sale } from '../../src/services/sales';
import { ExpenseService, Expense, CreateExpenseInput, UpdateExpenseInput } from '../../src/services/expense';
import { useOfflineMutation } from '../../src/hooks/useOfflineMutation';

function todayBounds() {
  const d = new Date();
  return {
    start: new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString(),
    end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString(),
  };
}

function monthBounds() {
  const d = new Date();
  return {
    start: new Date(d.getFullYear(), d.getMonth(), 1).toISOString(),
    end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
  };
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

type ReportPeriod = 'this_week' | 'last_week' | 'this_month' | 'last_month';

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function periodBounds(period: ReportPeriod): { start: string; end: string } {
  const now = new Date();
  switch (period) {
    case 'this_week': {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { start: toYMD(start), end: toYMD(now) };
    }
    case 'last_week': {
      const end = new Date(now);
      end.setDate(now.getDate() - now.getDay() - 1);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      return { start: toYMD(start), end: toYMD(end) };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: toYMD(start), end: toYMD(now) };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: toYMD(start), end: toYMD(end) };
    }
  }
}

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  this_week: 'This Week', last_week: 'Last Week',
  this_month: 'This Month', last_month: 'Last Month',
};

function periodDateLabel(p: ReportPeriod): string {
  const { start, end } = periodBounds(p);
  const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function FinancialHubScreen() {
  const [activeTab, setActiveTab] = useState<'sales' | 'expenses'>('sales');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('this_week');
  const { store } = useStore();
  const router = useRouter();
   const queryClient = useQueryClient();

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const { data: sales = [], isLoading: salesLoading, refetch: refetchSales } = useQuery({
    queryKey: ['sales', store?.store_id],
    queryFn: () => SalesService.getByStoreId(store!.store_id),
    enabled: !!store,
  });

  const { data: expenses = [], isLoading: expensesLoading, refetch: refetchExpenses } = useQuery({
    queryKey: ['expenses', store?.store_id],
    queryFn: () => ExpenseService.getByStoreId(store!.store_id),
    enabled: !!store,
  });

  useFocusEffect(useCallback(() => {
    if (store) { refetchSales(); refetchExpenses(); }
  }, [store]));

  const { start: ts, end: te } = todayBounds();
  const { start: ms, end: me } = monthBounds();

  const todaySales = sales.filter((s: Sale) => s.date >= ts && s.date <= te);
  const todayRevenue = todaySales.reduce((sum: number, s: Sale) => sum + s.total_amount, 0);
  const todayProfit = todaySales.reduce((sum: number, s: Sale) => sum + s.total_profit, 0);

  const monthExpenses = expenses.filter((e: Expense) => e.date >= ms && e.date <= me);
  const monthlyTotal = monthExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);

  const { start: ps, end: pe } = periodBounds(reportPeriod);
  const periodSales = sales.filter((s: Sale) => s.date.substring(0, 10) >= ps && s.date.substring(0, 10) <= pe);
  const periodRevenue = (periodSales.reduce((sum: number, s: Sale) => sum + s.total_amount, 0)) || 0;
  const periodProfit = (periodSales.reduce((sum: number, s: Sale) => sum + s.total_profit, 0)) || 0;
  const periodSalesCount = periodSales.length || 0;
  const periodExpenses = expenses.filter((e: Expense) => e.date.substring(0, 10) >= ps && e.date.substring(0, 10) <= pe);
  const periodExpTotal = (periodExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0)) || 0;
  const periodNet = periodProfit - periodExpTotal;

  // Analysis Insights
  const biggestSale = periodSales.length > 0 ? periodSales.reduce((max, s) => s.total_profit > max.total_profit ? s : max, periodSales[0]) : null;
  const biggestExp = periodExpenses.length > 0 ? periodExpenses.reduce((max, e) => e.amount > max.amount ? e : max, periodExpenses[0]) : null;
  
  const dailyProfitMap: Record<string, number> = {};
  periodSales.forEach(s => {
    const day = s.date.substring(0, 10);
    dailyProfitMap[day] = (dailyProfitMap[day] || 0) + s.total_profit;
  });
  let bestDay = { date: '', profit: -Infinity };
  Object.entries(dailyProfitMap).forEach(([date, profit]) => {
    if (profit > bestDay.profit) bestDay = { date, profit };
  });
  
  const profitMargin = periodRevenue > 0 ? (periodProfit / periodRevenue) * 100 : 0;

  const [expModal, setExpModal] = useState(false);
  const [editExp, setEditExp] = useState<Expense | null>(null);
  const [expName, setExpName] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [showCalculation, setShowCalculation] = useState(false);

  const [showAnalysisPrompt, setShowAnalysisPrompt] = useState(false);

  const handleProfitClick = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAnalysisPrompt(true);
    setShowCalculation(false); // Reset calculation if prompt is shown
  };

  const handleAnalysisResponse = (response: 'yes' | 'no') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (response === 'yes') {
      setShowAnalysisPrompt(false);
      setShowCalculation(true);
    } else {
      setShowAnalysisPrompt(false);
      Alert.alert('ManindahAI', 'You can click me anytime if you need help.');
    }
  };
  
  const createExpenseMutation = useOfflineMutation<Expense, Error, CreateExpenseInput>({
    mutationFn: (data: CreateExpenseInput) => ExpenseService.create(data),
    getOutboxInput: (data: CreateExpenseInput) => ({
      op: 'expense_create',
      store_id: data.store_id,
      payload: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      setExpModal(false);
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const updateExpenseMutation = useOfflineMutation<Expense, Error, { id: string; data: UpdateExpenseInput }>({
    mutationFn: ({ id, data }: { id: string; data: UpdateExpenseInput }) =>
      ExpenseService.update(id, data),
    getOutboxInput: ({ id, data }: { id: string; data: UpdateExpenseInput }) => ({
      op: 'expense_update',
      store_id: store!.store_id,
      expense_id: id,
      payload: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      setExpModal(false);
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const deleteExpenseMutation = useOfflineMutation<void, Error, string>({
    mutationFn: (id: string) => ExpenseService.delete(id),
    getOutboxInput: (id: string) => ({
      op: 'expense_delete',
      store_id: store!.store_id,
      expense_id: id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const openAdd = () => { setEditExp(null); setExpName(''); setExpAmount(''); setExpModal(true); };
  const openEdit = (e: Expense) => { setEditExp(e); setExpName(e.name); setExpAmount(String(e.amount)); setExpModal(true); };

  const saveExpense = async () => {
    if (!store) return;
    const amount = parseFloat(expAmount);
    if (!expName.trim()) return Alert.alert('Error', 'Name is required');
    if (!amount || amount <= 0) return Alert.alert('Error', 'Enter a valid amount');
    
    if (editExp) {
      updateExpenseMutation.mutate({ 
        id: editExp.expense_id, 
        data: { name: expName.trim(), amount } 
      });
    } else {
      createExpenseMutation.mutate({ 
        store_id: store.store_id, 
        name: expName.trim(), 
        amount 
      });
    }
  };

  const saving = createExpenseMutation.isPending || updateExpenseMutation.isPending;

  const deleteExpense = (exp: Expense) => {
    Alert.alert('Delete Expense', `Delete "${exp.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteExpenseMutation.mutate(exp.expense_id) }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: 'Financial Hub' }} />

      <View style={styles.headerPad}>
        <View style={[styles.toggle, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          {(['sales', 'expenses'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.toggleBtn, activeTab === tab && { backgroundColor: theme.colors.surface }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[theme.typography.button, { color: activeTab === tab ? theme.colors.primaryContainer : theme.colors.onSurfaceVariant }]}>
                {tab === 'sales' ? 'Sales' : 'Expenses'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {activeTab === 'sales' ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceContainerLow }]}>
            <Text style={[theme.typography.h3, { color: theme.colors.onSurface }]}>Today's Summary</Text>
            <Text style={[theme.typography.labelMedium, { color: theme.colors.outline, marginBottom: 16 }]}>
              {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCol}>
                <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>Revenue</Text>
                <Text style={[theme.typography.h2, { color: theme.colors.primaryContainer }]}>₱{todayRevenue.toFixed(2)}</Text>
              </View>
              <View style={[styles.vDivider, { backgroundColor: theme.colors.outlineVariant }]} />
              <View style={styles.summaryCol}>
                <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>Profit</Text>
                <Text style={[theme.typography.h2, { color: theme.colors.tertiaryContainer }]}>₱{todayProfit.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* Period Report */}
          <View style={styles.periodSelector}>
            {(['this_week', 'last_week', 'this_month', 'last_month'] as const).map((p: ReportPeriod) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodPill, reportPeriod === p && { backgroundColor: theme.colors.primaryContainer }]}
                onPress={() => setReportPeriod(p)}
              >
                <Text style={[theme.typography.labelMedium, { color: reportPeriod === p ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }]}>
                  {PERIOD_LABELS[p]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceContainerLow }]}>
            <View style={styles.reportCardHeader}>
              <View>
                <Text style={[theme.typography.h3, { color: theme.colors.onSurface }]}>{PERIOD_LABELS[reportPeriod]}</Text>
                <Text style={[theme.typography.labelMedium, { color: theme.colors.outline }]}>{periodDateLabel(reportPeriod)}</Text>
              </View>
              <View style={[styles.countBadge, { backgroundColor: theme.colors.surfaceContainerLow }]}>
                <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>
                  {periodSalesCount} sale{periodSalesCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <View style={styles.reportGrid}>
              <View style={[styles.reportItem, { backgroundColor: `${theme.colors.primaryFixed}4D` }]}>
                <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>Revenue</Text>
                <Text style={[theme.typography.h3, { color: theme.colors.primaryContainer }]}>₱{periodRevenue.toFixed(2)}</Text>
              </View>
              <View style={[styles.reportItem, { backgroundColor: `${theme.colors.tertiaryFixed}4D` }]}>
                <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>Gross Profit</Text>
                <Text style={[theme.typography.h3, { color: theme.colors.tertiaryContainer }]}>₱{periodProfit.toFixed(2)}</Text>
              </View>
              <View style={[styles.reportItem, { backgroundColor: `${theme.colors.errorContainer}80` }]}>
                <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>Expenses</Text>
                <Text style={[theme.typography.h3, { color: theme.colors.error }]}>₱{periodExpTotal.toFixed(2)}</Text>
              </View>
              <View style={[styles.reportItem, { backgroundColor: theme.colors.surfaceContainerLow }]}>
                <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>Net Profit</Text>
                <Text style={[theme.typography.h3, { color: periodNet >= 0 ? theme.colors.tertiaryContainer : theme.colors.error }]}>
                  ₱{periodNet.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Analysis Section */}
            {!showAnalysisPrompt && !showCalculation && (
              <TouchableOpacity 
                style={styles.premiumTrigger}
                onPress={handleProfitClick}
                activeOpacity={0.7}
              >
                <View style={styles.triggerContent}>
                  <View style={[styles.iconCircle, { backgroundColor: `${theme.colors.primary}15` }]}>
                    <MaterialIcons name="auto-graph" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[theme.typography.labelMedium, { color: theme.colors.primary, fontWeight: '700' }]}>INSIGHTS AVAILABLE</Text>
                    <Text style={[theme.typography.bodySmall, { color: theme.colors.onSurfaceVariant }]}>See how your net profit was calculated</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={theme.colors.outlineVariant} />
                </View>
              </TouchableOpacity>
            )}

            {showAnalysisPrompt && (
              <View style={styles.premiumPrompt}>
                <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurface, textAlign: 'center', marginBottom: 16, fontWeight: '500' }]}>
                  Would you like to see a breakdown of your net profit?
                </Text>
                <View style={styles.promptActions}>
                  <TouchableOpacity 
                    style={[styles.promptPill, { backgroundColor: theme.colors.surfaceContainerHighest }]}
                    onPress={() => handleAnalysisResponse('no')}
                  >
                    <Text style={[theme.typography.labelLarge, { color: theme.colors.onSurfaceVariant }]}>Maybe later</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.promptPill, { backgroundColor: theme.colors.primary }]}
                    onPress={() => handleAnalysisResponse('yes')}
                  >
                    <Text style={[theme.typography.labelLarge, { color: theme.colors.onPrimary }]}>Yes, show me</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {showCalculation && (
              <View style={styles.premiumCalculation}>
                <View style={styles.calcHeader}>
                  <View style={styles.calcHeaderTitle}>
                    <MaterialIcons name="analytics" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                    <Text style={[theme.typography.button, { color: theme.colors.onSurface }]}>Profit Analysis</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowCalculation(false)} style={styles.calcCloseBtn}>
                    <MaterialIcons name="close" size={18} color={theme.colors.outline} />
                  </TouchableOpacity>
                </View>

                <View style={styles.calcList}>
                  <View style={styles.calcRow}>
                    <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant }]}>Gross Profit from Sales</Text>
                    <Text style={[theme.typography.bodyMedium, { color: theme.colors.tertiaryContainer, fontWeight: '700' }]}>+₱{periodProfit.toFixed(2)}</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant }]}>Total Expenses</Text>
                    <Text style={[theme.typography.bodyMedium, { color: theme.colors.error, fontWeight: '700' }]}>-₱{periodExpTotal.toFixed(2)}</Text>
                  </View>
                  
                  <View style={[styles.hDivider, { backgroundColor: theme.colors.outlineVariant, opacity: 0.3 }]} />
                  
                  <View style={styles.calcRow}>
                    <Text style={[theme.typography.titleMedium, { color: theme.colors.onSurface, fontWeight: '700' }]}>Net Profit</Text>
                    <Text style={[theme.typography.titleMedium, { color: periodNet >= 0 ? theme.colors.tertiaryContainer : theme.colors.error, fontWeight: '800' }]}>
                      ₱{periodNet.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Granular Insights */}
                <View style={[styles.insightsGrid, { borderColor: theme.colors.outlineVariant }]}>
                  <View style={styles.insightItem}>
                    <MaterialIcons name="trending-up" size={16} color={theme.colors.tertiaryContainer} />
                    <Text style={[theme.typography.labelSmall, { color: theme.colors.onSurfaceVariant, marginTop: 4 }]}>BEST PERFORMING DAY</Text>
                    <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurface, fontWeight: '700' }]}>
                      {bestDay.date ? fmtDate(bestDay.date).split(',')[0] : 'N/A'}
                    </Text>
                    <Text style={[theme.typography.labelSmall, { color: theme.colors.tertiaryContainer }]}>+₱{bestDay.profit > 0 ? bestDay.profit.toFixed(2) : '0.00'}</Text>
                  </View>
                  
                  <View style={[styles.vDivider, { backgroundColor: theme.colors.outlineVariant }]} />
                  
                  <View style={styles.insightItem}>
                    <MaterialIcons name="payments" size={16} color={theme.colors.error} />
                    <Text style={[theme.typography.labelSmall, { color: theme.colors.onSurfaceVariant, marginTop: 4 }]}>BIGGEST EXPENSE</Text>
                    <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurface, fontWeight: '700' }]} numberOfLines={1}>
                      {biggestExp ? biggestExp.name : 'N/A'}
                    </Text>
                    <Text style={[theme.typography.labelSmall, { color: theme.colors.error }]}>-₱{biggestExp ? biggestExp.amount.toFixed(2) : '0.00'}</Text>
                  </View>
                </View>

                <View style={styles.marginSection}>
                  <View style={styles.row}>
                    <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurfaceVariant }]}>Gross Profit Margin</Text>
                    <Text style={[theme.typography.labelMedium, { color: theme.colors.onSurface, fontWeight: '700' }]}>{profitMargin.toFixed(1)}%</Text>
                  </View>
                  <View style={[styles.progressBarBase, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(profitMargin, 100)}%`, backgroundColor: theme.colors.primary }]} />
                  </View>
                </View>

                <View style={[styles.explanationCard, { backgroundColor: periodNet >= 0 ? `${theme.colors.tertiaryFixed}30` : `${theme.colors.errorContainer}40` }]}>
                  <View style={[styles.statusIndicator, { backgroundColor: periodNet >= 0 ? theme.colors.tertiaryContainer : theme.colors.error }]} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[theme.typography.bodySmall, { color: theme.colors.onSurface, fontWeight: '700', letterSpacing: 0.5 }]}>
                      {periodNet >= 0 ? 'POSITIVE TREND' : 'ATTENTION NEEDED'}
                    </Text>
                    <Text style={[theme.typography.bodySmall, { color: theme.colors.onSurfaceVariant, marginTop: 2, lineHeight: 18 }]}>
                      {periodNet >= 0 
                        ? `Net profit of ₱${periodNet.toFixed(2)} after all expenses. Keep it up!`
                        : `Net loss of ₱${Math.abs(periodNet).toFixed(2)}. Review your expenses.`}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          <View style={styles.sectionRow}>
            <Text style={[theme.typography.h3, { color: theme.colors.onSurface }]}>Recent Sales</Text>
            <TouchableOpacity onPress={() => router.push('/sales/history' as any)}>
              <Text style={[theme.typography.button, { color: theme.colors.primaryContainer }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {salesLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
          ) : sales.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceContainerLow }]}>
              <MaterialIcons name="receipt-long" size={40} color={theme.colors.outline} />
              <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }]}>
                No sales recorded yet.{'\n'}Tap the button below to record today's sales.
              </Text>
            </View>
          ) : (
            sales.slice(0, 5).map((sale: Sale) => (
              <TouchableOpacity
                key={sale.sale_id}
                style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceContainerLow }]}
                onPress={() => router.push('/sales/history' as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.rowIcon, { backgroundColor: `${theme.colors.tertiaryFixed}66` }]}>
                  <MaterialIcons name="storefront" size={22} color={theme.colors.tertiaryContainer} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[theme.typography.button, { color: theme.colors.onSurface }]}>
                    End-of-Day Sale {sale.sale_id.startsWith('temp_') && (
                      <MaterialIcons name="cloud-upload" size={14} color={theme.colors.outline} />
                    )}
                  </Text>
                  <Text style={[theme.typography.labelMedium, { color: theme.colors.outline }]}>{fmtDate(sale.date)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[theme.typography.button, { color: theme.colors.tertiaryContainer }]}>+₱{sale.total_amount.toFixed(2)}</Text>
                  <Text style={[theme.typography.labelMedium, { color: theme.colors.outline }]}>₱{sale.total_profit.toFixed(2)} profit</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceContainerLow }]}>
            <Text style={[theme.typography.h3, { color: theme.colors.onSurface }]}>This Month's Expenses</Text>
            <Text style={[theme.typography.labelMedium, { color: theme.colors.outline, marginBottom: 12 }]}>
              {new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
            </Text>
            <Text style={[theme.typography.h1, { color: theme.colors.error }]}>₱{monthlyTotal.toFixed(2)}</Text>
          </View>

          <Text style={[theme.typography.h3, { color: theme.colors.onSurface, marginBottom: 12 }]}>All Expenses</Text>

          {expensesLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
          ) : expenses.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceContainerLow }]}>
              <MaterialIcons name="receipt" size={40} color={theme.colors.outline} />
              <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }]}>
                No expenses yet. Tap + to add one.
              </Text>
            </View>
          ) : (
            expenses.map((exp: Expense) => (
              <View key={exp.expense_id} style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceContainerLow }]}>
                <View style={[styles.rowIcon, { backgroundColor: `${theme.colors.errorContainer}99` }]}>
                  <MaterialIcons name="receipt" size={22} color={theme.colors.onErrorContainer} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[theme.typography.button, { color: theme.colors.onSurface }]}>
                    {exp.name} {exp.expense_id.startsWith('temp_') && (
                      <MaterialIcons name="cloud-upload" size={14} color={theme.colors.outline} />
                    )}
                  </Text>
                  <Text style={[theme.typography.labelMedium, { color: theme.colors.outline }]}>{fmtDate(exp.date)}</Text>
                </View>
                <Text style={[theme.typography.button, { color: theme.colors.error, marginRight: 12 }]}>-₱{exp.amount.toFixed(2)}</Text>
                <TouchableOpacity onPress={() => openEdit(exp)} style={{ marginRight: 8 }}>
                  <MaterialIcons name="edit" size={20} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteExpense(exp)}>
                  <MaterialIcons name="delete-outline" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.secondaryContainer }]}
        activeOpacity={0.8}
        onPress={() => activeTab === 'sales' ? router.push('/sales/record' as any) : openAdd()}
      >
        <MaterialIcons name={activeTab === 'sales' ? 'add-shopping-cart' : 'add'} size={28} color={theme.colors.onSecondaryContainer} />
      </TouchableOpacity>

      <Modal visible={expModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.sheetHeader}>
              <Text style={[theme.typography.h3, { color: theme.colors.onSurface }]}>{editExp ? 'Edit Expense' : 'Add Expense'}</Text>
              <TouchableOpacity onPress={() => setExpModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <Text style={[theme.typography.button, { color: theme.colors.onSurface, marginBottom: 8 }]}>Name</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.colors.outlineVariant }]}
              value={expName}
              onChangeText={setExpName}
              placeholder="e.g. Electricity, Rent"
              placeholderTextColor={theme.colors.outline}
            />
            <Text style={[theme.typography.button, { color: theme.colors.onSurface, marginTop: 16, marginBottom: 8 }]}>Amount (₱)</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.colors.outlineVariant }]}
              value={expAmount}
              onChangeText={setExpAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.colors.outline}
            />
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: theme.colors.primary, marginTop: 24 }]}
              onPress={saveExpense}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color={theme.colors.onPrimary} /> :
                <Text style={[theme.typography.button, { color: theme.colors.onPrimary }]}>
                  {editExp ? 'Save Changes' : 'Add Expense'}
                </Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerPad: { padding: theme.spacing.containerPadding, paddingBottom: 8 },
  toggle: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: theme.borderRadius.full,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.full,
  },
  scroll: { padding: theme.spacing.containerPadding, paddingBottom: 100 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryCol: { flex: 1, alignItems: 'center' },
  vDivider: { width: 1, height: 48, marginHorizontal: 16 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyBox: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
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
    marginBottom: 24,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  confirmBtn: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  periodPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: theme.borderRadius.lg,
  },
  premiumTrigger: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 20,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumPrompt: {
    backgroundColor: theme.colors.surfaceContainerHighest,
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.colors.primaryContainer,
  },
  promptActions: {
    flexDirection: 'row',
    gap: 12,
  },
  promptPill: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumCalculation: {
    marginTop: 20,
    padding: 20,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  calcHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calcCloseBtn: {
    padding: 4,
  },
  calcList: {
    marginVertical: 16,
    gap: 12,
  },
  statusIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
  },
  insightsGrid: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginVertical: 12,
  },
  insightItem: {
    flex: 1,
    alignItems: 'center',
  },
  vDivider: {
    width: 1,
    height: '100%',
    opacity: 0.3,
  },
  marginSection: {
    marginBottom: 20,
  },
  progressBarBase: {
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  calculationBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  calcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hDivider: {
    height: 1,
    width: '100%',
    marginVertical: 4,
  },
  explanationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
});
