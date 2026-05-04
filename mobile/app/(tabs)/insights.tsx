import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../src/theme/theme';

export default function InsightsScreen() {
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
          <Text style={[theme.typography.h2, { color: theme.colors.primary }]}>Kumusta, Maria</Text>
          <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant, marginTop: 4 }]}>
            Here's your store's performance this week.
          </Text>
        </View>

        {/* Weekly Sales Bento Card */}
        <View style={[styles.bentoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceContainerLow }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[theme.typography.button, { color: theme.colors.onSurface }]}>Weekly Sales</Text>
              <Text style={[theme.typography.h1, { color: theme.colors.primary, marginTop: 4 }]}>₱12,450</Text>
            </View>
            <View style={[styles.trendBadge, { backgroundColor: '#e6f4ea' }]}>
              <MaterialIcons name="trending-up" size={16} color="#137333" />
              <Text style={[theme.typography.labelMedium, { color: '#137333', marginLeft: 4 }]}>+8%</Text>
            </View>
          </View>

          {/* Bar Chart */}
          <View style={[styles.chartContainer, { borderTopColor: theme.colors.surfaceVariant }]}>
            <ChartBar day="Mon" height={40} />
            <ChartBar day="Tue" height={65} />
            <ChartBar day="Wed" height={50} />
            <ChartBar day="Thu" height={85} active />
            <ChartBar day="Fri" height={30} />
            <ChartBar day="Sat" height={70} />
            <ChartBar day="Sun" height={45} />
          </View>
        </View>

        {/* Smart Suggestions Section */}
        <View style={styles.suggestionsHeader}>
          <MaterialIcons name="lightbulb" size={20} color={theme.colors.secondary} />
          <Text style={[theme.typography.button, { color: theme.colors.onSurface, marginLeft: 8 }]}>Smart Suggestions</Text>
        </View>

        {/* Card 1: Stock Alert */}
        <View style={[styles.suggestionCard, { borderLeftColor: theme.colors.error }]}>
          <View style={styles.suggestionContent}>
            <View style={[styles.suggestionIcon, { backgroundColor: theme.colors.errorContainer }]}>
              <MaterialIcons name="warning" size={24} color={theme.colors.onErrorContainer} />
            </View>
            <View style={styles.suggestionText}>
              <View style={styles.suggestionTitleRow}>
                <Text style={[theme.typography.button, { color: theme.colors.onSurface }]}>Kulang sa Stock Alert</Text>
                <View style={[styles.urgentBadge, { backgroundColor: theme.colors.errorContainer }]}>
                  <Text style={[theme.typography.labelMedium, { color: theme.colors.onErrorContainer }]}>Urgent</Text>
                </View>
              </View>
              <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant, marginTop: 4 }]}>
                <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>Datu Puti Soy Sauce (1L)</Text> is running low. Expected to run out by <Text style={{ color: theme.colors.error, fontWeight: '700' }}>Thursday afternoon</Text> based on current sales velocity.
              </Text>
              <TouchableOpacity 
                style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => Alert.alert('Suppliers', 'Fetching supplier matrix...')}
              >
                <MaterialIcons name="local-shipping" size={20} color={theme.colors.onPrimary} />
                <Text style={[theme.typography.button, { color: theme.colors.onPrimary, marginLeft: 8 }]}>View Suppliers</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Card 2: Sales Opportunity */}
        <View style={styles.opportunityCard}>
          <View style={[styles.opportunityAccent, { backgroundColor: theme.colors.tertiaryFixed }]} />
          <View style={styles.suggestionContent}>
            <View style={[styles.suggestionIcon, { backgroundColor: theme.colors.tertiaryFixed }]}>
              <MaterialIcons name="storefront" size={24} color={theme.colors.onTertiaryFixed} />
            </View>
            <View style={styles.suggestionText}>
              <Text style={[theme.typography.button, { color: theme.colors.onSurface }]}>Sales Opportunity</Text>
              <Text style={[theme.typography.bodyMedium, { color: theme.colors.onSurfaceVariant, marginTop: 4 }]}>
                Try bundling <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>Snacks and Sodas</Text> between <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>3 PM - 5 PM</Text>. Historical data shows a 25% increase in margin during this peak merienda window.
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.secondaryButton, { borderColor: theme.colors.primary }]}
                  onPress={() => Alert.alert('Suggestion', 'Opportunity dismissed.')}
                >
                  <Text style={[theme.typography.button, { color: theme.colors.primary }]}>Dismiss</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.accentButton, { backgroundColor: theme.colors.primaryContainer }]}
                  onPress={() => Alert.alert('Bundle Applied', 'Promotional bundle activated for POS.')}
                >
                  <Text style={[theme.typography.button, { color: theme.colors.onPrimaryContainer }]}>Apply Bundle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ChartBar({ day, height, active = false }: { day: string, height: number, active?: boolean }) {
  return (
    <View style={styles.barGroup}>
      <View style={[
        styles.barBase, 
        { 
          height: `${height}%`, 
          backgroundColor: active ? theme.colors.primaryContainer : theme.colors.surfaceContainer 
        }
      ]}>
        {!active && <View style={styles.barOverlay} />}
      </View>
      <Text style={[
        theme.typography.labelMedium, 
        { color: active ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: active ? '600' : '400', marginTop: 8 }
      ]}>
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
  accentButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
});
