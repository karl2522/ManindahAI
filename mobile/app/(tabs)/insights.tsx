import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, LayoutAnimation, UIManager, Platform, Modal } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../../src/hooks/useStore';
import { SalesService } from '../../src/services/sales';
import { ProductService } from '../../src/services/product';
import { InventoryService } from '../../src/services/inventory';
import { AIInsightService, AIInsight } from '../../src/services/aiInsightService';
import { theme } from '../../src/theme/theme';

function getDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export default function InsightsScreen() {
  const router = useRouter();
  const { store, profile } = useStore();
  const storeId = store?.store_id;

  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [chartExpanded, setChartExpanded] = useState(true);
  const [language, setLanguage] = useState<'english' | 'tagalog'>('english');
  const [langModalVisible, setLangModalVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const toggleChart = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setChartExpanded((prev) => !prev);
  };

  const today = getDateStr(0);
  const sixDaysAgo = getDateStr(6);
  const sevenDaysAgo = getDateStr(7);
  const thirteenDaysAgo = getDateStr(13);

  const { data: thisWeekSales = [], isLoading: loadingThisWeek } = useQuery({
    queryKey: ['sales-range', storeId, sixDaysAgo, today],
    queryFn: () => SalesService.getByDateRange(storeId!, sixDaysAgo, today),
    enabled: !!storeId,
  });

  const { data: lastWeekSales = [] } = useQuery({
    queryKey: ['sales-range', storeId, thirteenDaysAgo, sevenDaysAgo],
    queryFn: () => SalesService.getByDateRange(storeId!, thirteenDaysAgo, sevenDaysAgo),
    enabled: !!storeId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', storeId],
    queryFn: () => ProductService.getByStoreId(storeId!),
    enabled: !!storeId,
  });

  const { data: lowStockProducts = [] } = useQuery({
    queryKey: ['low-stock', storeId],
    queryFn: () => InventoryService.getLowStockProducts(storeId!),
    enabled: !!storeId,
  });

  const chartData = useMemo(() => {
    const salesByDay: Record<string, number> = {};
    for (const sale of thisWeekSales) {
      const dayKey = (sale.date || '').substring(0, 10);
      salesByDay[dayKey] = (salesByDay[dayKey] || 0) + Number(sale.total_amount);
    }
    const maxAmount = Math.max(...Object.values(salesByDay), 1);
    return Array.from({ length: 7 }, (_, i) => {
      const dateStr = getDateStr(6 - i);
      const amount = salesByDay[dateStr] || 0;
      const d = new Date(dateStr + 'T12:00:00');
      return {
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        height: amount > 0 ? Math.max(Math.round((amount / maxAmount) * 88) + 5, 10) : 3,
        active: dateStr === today,
      };
    });
  }, [thisWeekSales, today]);

  const thisWeekTotal = useMemo(
    () => thisWeekSales.reduce((s, sale) => s + Number(sale.total_amount), 0),
    [thisWeekSales]
  );
  const lastWeekTotal = useMemo(
    () => lastWeekSales.reduce((s, sale) => s + Number(sale.total_amount), 0),
    [lastWeekSales]
  );
  const weeklyTrend =
    lastWeekTotal > 0
      ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
      : null;
  const isTrendUp = weeklyTrend !== null && weeklyTrend >= 0;

  const ownerName =
    profile?.name?.split(' ')[0] ||
    profile?.email?.split('@')[0] ||
    'Ka-negosyo';

  const runGenerateInsights = async (selectedLang: 'english' | 'tagalog' | 'cebuano') => {
    setLangModalVisible(false);
    if (!store || isGenerating) return;
    setIsGenerating(true);
    try {
      const generated = await AIInsightService.generate({
        storeName: store.store_name,
        products,
        lowStockProducts,
        thisWeekSales,
        lastWeekSales,
        language: selectedLang,
      });
      setInsights(generated);
      setLastGenerated(new Date());
    } catch (e: any) {
      Alert.alert('AI Error', e.message || 'Failed to generate insights. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateInsights = () => {
    if (!storeId) return;
    setLangModalVisible(true);
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: 'AI Insights' }} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={[theme.typography.h2, { color: theme.colors.primary }]}>
            Kumusta, {ownerName}
          </Text>
          <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant, marginTop: 4 }]}>
            Here's your store's performance this week.
          </Text>
        </View>

        {/* Weekly Sales Bento Card */}
        <View style={[styles.bentoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceContainerLow }]}>
          <TouchableOpacity style={styles.cardHeader} onPress={toggleChart} activeOpacity={0.7}>
            <View>
              <Text style={[theme.typography.button, { color: theme.colors.onSurface }]}>Weekly Sales</Text>
              <Text style={[theme.typography.h1, { color: theme.colors.primary, marginTop: 4 }]}>
                {loadingThisWeek ? '--' : `₱${thisWeekTotal.toLocaleString('en-PH')}`}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {weeklyTrend !== null ? (
                <View style={[styles.trendBadge, { backgroundColor: isTrendUp ? '#e6f4ea' : '#fce8e6' }]}>
                  <MaterialIcons
                    name={isTrendUp ? 'trending-up' : 'trending-down'}
                    size={16}
                    color={isTrendUp ? '#137333' : '#c5221f'}
                  />
                  <Text style={[theme.typography.labelMedium, { color: isTrendUp ? '#137333' : '#c5221f', marginLeft: 4 }]}>
                    {isTrendUp ? '+' : ''}{weeklyTrend}%
                  </Text>
                </View>
              ) : !loadingThisWeek && (
                <View style={[styles.trendBadge, { backgroundColor: theme.colors.surfaceContainerLow }]}>
                  <Text style={[theme.typography.labelMedium, { color: theme.colors.outline }]}>New</Text>
                </View>
              )}
              <MaterialIcons
                name={chartExpanded ? 'expand-less' : 'expand-more'}
                size={22}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          </TouchableOpacity>

          {/* Bar Chart — real 7-day data, collapsible */}
          {chartExpanded && (
            <View style={[styles.chartContainer, { borderTopColor: theme.colors.surfaceVariant }]}>
              {chartData.map((bar, i) => (
                <ChartBar key={i} day={bar.day} height={bar.height} active={bar.active} />
              ))}
            </View>
          )}
        </View>

        {/* AI Smart Suggestions Header */}
        <View style={styles.suggestionsHeader}>
          <MaterialIcons name="auto-awesome" size={20} color={theme.colors.secondary} />
          <Text style={[theme.typography.button, { color: theme.colors.onSurface, marginLeft: 8 }]}>
            AI Smart Suggestions
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <MaterialIcons name="info-outline" size={15} color={theme.colors.onSurfaceVariant} style={{ marginTop: 1, flexShrink: 0 }} />
          <Text style={[theme.typography.labelSmall, { color: theme.colors.onSurfaceVariant, flex: 1, lineHeight: 18 }]}>
            AI suggestions are based on your recorded data and may not always be accurate.
            Human factors — local events, seasonal demand, personal customer relationships —
            are unpredictable. Use these as a starting point, not a final decision.
          </Text>
        </View>

        {/* States: Generating / Empty / Insight Cards */}
        {isGenerating && insights.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[theme.typography.bodyLarge, { color: theme.colors.onSurfaceVariant, marginTop: 16 }]}>
              Analyzing your store data...
            </Text>
            <Text style={[theme.typography.labelMedium, { color: theme.colors.outline, marginTop: 4 }]}>
              This may take a few seconds.
            </Text>
          </View>
        ) : insights.length === 0 ? (
          <View style={[styles.generateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceVariant }]}>
            <MaterialIcons name="auto-awesome" size={48} color={theme.colors.primaryContainer} />
            <Text style={[theme.typography.h3, { color: theme.colors.onSurface, marginTop: 16, textAlign: 'center' }]}>
              Get AI-Powered Insights
            </Text>
            <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8, lineHeight: 22 }]}>
              Let AI analyze your sales, inventory, and stock data to generate personalized suggestions for your store.
            </Text>
            <TouchableOpacity
              style={[styles.generateButton, { backgroundColor: theme.colors.primary, opacity: !storeId ? 0.5 : 1 }]}
              onPress={handleGenerateInsights}
              disabled={!storeId}
            >
              <MaterialIcons name="auto-awesome" size={20} color={theme.colors.onPrimary} />
              <Text style={[theme.typography.button, { color: theme.colors.onPrimary, marginLeft: 8 }]}>
                Generate Insights
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.insightsHeader}>
              {lastGenerated && (
                <Text style={[theme.typography.labelSmall, { color: theme.colors.outline }]}>
                  Generated at{' '}
                  {lastGenerated.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
              <TouchableOpacity 
                onPress={handleGenerateInsights} 
                style={[styles.refreshButton, isGenerating && { opacity: 0.7 }]}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <MaterialIcons name="refresh" size={16} color={theme.colors.primary} />
                )}
                <Text style={[theme.typography.labelMedium, { color: theme.colors.primary, marginLeft: 4 }]}>
                  {isGenerating ? 'Analyzing...' : 'Refresh'}
                </Text>
              </TouchableOpacity>
            </View>
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} router={router} />
            ))}
          </>
        )}
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal visible={langModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Generate Insights</Text>
            <Text style={styles.modalSubtitle}>Which language would you prefer for your AI insights?</Text>
            
            <View style={styles.langOptionsContainer}>
              <TouchableOpacity style={styles.langOptionBtn} onPress={() => runGenerateInsights('english')}>
                <Text style={styles.langOptionText}>English</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.langOptionBtn} onPress={() => runGenerateInsights('tagalog')}>
                <Text style={styles.langOptionText}>Tagalog</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.langOptionBtn} onPress={() => runGenerateInsights('cebuano')}>
                <Text style={styles.langOptionText}>Cebuano</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setLangModalVisible(false)}>
              <Text style={styles.cancelModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InsightCard({ insight, router }: { insight: AIInsight; router: any }) {
  const isUrgent = insight.priority === 'urgent';
  const isOpportunity = insight.priority === 'opportunity';

  const iconMap: Record<string, string> = {
    low_stock: 'warning',
    trending_up: 'trending-up',
    trending_down: 'trending-down',
    stock_opportunity: 'storefront',
    general_tip: 'lightbulb',
  };
  const iconName = iconMap[insight.type] ?? 'info';

  const colors = isUrgent
    ? {
        border: theme.colors.error,
        iconBg: theme.colors.errorContainer,
        iconColor: theme.colors.onErrorContainer,
        badgeBg: theme.colors.errorContainer,
        badgeText: theme.colors.onErrorContainer,
        badgeLabel: 'Urgent',
      }
    : isOpportunity
    ? {
        border: theme.colors.tertiary,
        iconBg: theme.colors.tertiaryFixed,
        iconColor: theme.colors.onTertiaryFixed,
        badgeBg: theme.colors.tertiaryFixed,
        badgeText: theme.colors.onTertiaryFixed,
        badgeLabel: 'Opportunity',
      }
    : {
        border: theme.colors.primary,
        iconBg: theme.colors.primaryContainer,
        iconColor: theme.colors.onPrimaryContainer,
        badgeBg: null,
        badgeText: null,
        badgeLabel: null,
      };

  return (
    <View style={[styles.suggestionCard, { borderLeftColor: colors.border }]}>
      <View style={styles.suggestionContent}>
        <View style={[styles.suggestionIcon, { backgroundColor: colors.iconBg }]}>
          <MaterialIcons name={iconName as any} size={24} color={colors.iconColor} />
        </View>
        <View style={styles.suggestionText}>
          <View style={styles.suggestionTitleRow}>
            <Text style={[theme.typography.button, { color: theme.colors.onSurface, flex: 1, marginRight: 8 }]}>
              {insight.title}
            </Text>
            {colors.badgeLabel && (
              <View style={[styles.urgentBadge, { backgroundColor: colors.badgeBg! }]}>
                <Text style={[theme.typography.labelMedium, { color: colors.badgeText! }]}>
                  {colors.badgeLabel}
                </Text>
              </View>
            )}
          </View>
          <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant, marginTop: 4 }]}>
            {insight.body}
          </Text>
          {insight.action === 'restock' && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: isUrgent ? theme.colors.error : theme.colors.primary }]}
              onPress={() => router.push('/(tabs)/inventory')}
            >
              <MaterialIcons name="inventory-2" size={18} color={theme.colors.onPrimary} />
              <Text style={[theme.typography.button, { color: theme.colors.onPrimary, marginLeft: 8 }]}>
                View Inventory
              </Text>
            </TouchableOpacity>
          )}

        </View>
      </View>
    </View>
  );
}

function ChartBar({ day, height, active = false }: { day: string; height: number; active?: boolean }) {
  return (
    <View style={styles.barGroup}>
      <View
        style={[
          styles.barBase,
          {
            height: `${height}%`,
            backgroundColor: active ? theme.colors.primaryContainer : theme.colors.surfaceContainer,
          },
        ]}
      >
        {!active && <View style={styles.barOverlay} />}
      </View>
      <Text
        style={[
          theme.typography.labelMedium,
          {
            color: active ? theme.colors.primary : theme.colors.onSurfaceVariant,
            fontWeight: active ? '600' : '400',
            marginTop: 8,
          },
        ]}
      >
        {day}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.containerPadding,
    paddingBottom: 40,
  },
  greetingSection: {
    marginBottom: 24,
  },
  bentoCard: {
    padding: theme.spacing.containerPadding,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chartContainer: {
    height: 180,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    marginHorizontal: 4,
  },
  barBase: {
    width: '100%',
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  barOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 83, 91, 0.05)',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  suggestionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.containerPadding,
    borderLeftWidth: 4,
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  opportunityCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.containerPadding,
    borderWidth: 1,
    borderColor: theme.colors.surfaceContainerLow,
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
  },
  opportunityAccent: {
    position: 'absolute',
    top: -32,
    right: -32,
    width: 96,
    height: 96,
    borderRadius: 48,
    opacity: 0.2,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  suggestionIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urgentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  primaryButton: {
    height: 56,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  generateCard: {
    padding: 32,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  generateButton: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 20,
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 24,
    textAlign: 'center',
  },
  langOptionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  langOptionBtn: {
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  langOptionText: {
    ...theme.typography.button,
    color: theme.colors.onSurface,
  },
  cancelModalBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelModalText: {
    ...theme.typography.button,
    color: theme.colors.error,
  },
});
