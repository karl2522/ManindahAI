import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../src/theme/theme';
import { useState } from 'react';

export default function MoneyScreen() {
  const [activeTab, setActiveTab] = useState<'sales' | 'expenses'>('sales');

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: 'Financial Hub' }} />
      
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Toggle Segment */}
        <View style={[styles.toggleContainer, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          <TouchableOpacity 
            style={[
              styles.toggleButton, 
              activeTab === 'sales' && [styles.toggleButtonActive, { backgroundColor: theme.colors.surface }]
            ]}
            onPress={() => setActiveTab('sales')}
          >
            <Text style={[
              theme.typography.button, 
              { color: activeTab === 'sales' ? theme.colors.primaryContainer : theme.colors.onSurfaceVariant }
            ]}>
              Sales
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.toggleButton, 
              activeTab === 'expenses' && [styles.toggleButtonActive, { backgroundColor: theme.colors.surface }]
            ]}
            onPress={() => setActiveTab('expenses')}
          >
            <Text style={[
              theme.typography.button, 
              { color: activeTab === 'expenses' ? theme.colors.primaryContainer : theme.colors.onSurfaceVariant }
            ]}>
              Expenses
            </Text>
          </TouchableOpacity>
        </View>

        {/* Monthly Profit Card */}
        <View style={[styles.profitCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceContainerLow }]}>
          <View style={styles.profitHeader}>
            <View>
              <Text style={[theme.typography.h3, { color: theme.colors.onSurface }]}>Monthly Profit</Text>
              <Text style={[theme.typography.labelMedium, { color: theme.colors.outline }]}>Oct 2023</Text>
            </View>
            <View style={[styles.trendBadge, { backgroundColor: theme.colors.tertiaryFixed }]}>
              <MaterialIcons name="trending-up" size={16} color={theme.colors.onTertiaryFixed} />
              <Text style={[theme.typography.labelMedium, { color: theme.colors.onTertiaryFixed, marginLeft: 4 }]}>+12.5%</Text>
            </View>
          </View>
          
          <Text style={[theme.typography.h1, { color: theme.colors.primaryContainer, marginVertical: 16 }]}>₱45,200.00</Text>
          
          {/* Mock Chart */}
          <View style={styles.chartContainer}>
            {[30, 50, 45, 70, 60, 90].map((height, index) => (
              <View 
                key={index} 
                style={[
                  styles.chartBar, 
                  { 
                    height: `${height}%`, 
                    backgroundColor: theme.colors.tertiaryContainer,
                    opacity: 0.2 + (index * 0.15)
                  }
                ]} 
              />
            ))}
          </View>
        </View>

        {/* Transactions Header */}
        <View style={styles.sectionHeader}>
          <Text style={[theme.typography.h3, { color: theme.colors.onSurface }]}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => Alert.alert('Transactions', 'Opening full transaction history...')}>
            <Text style={[theme.typography.button, { color: theme.colors.primaryContainer }]}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions List */}
        <View style={styles.transactionList}>
          <TransactionItem 
            icon="storefront" 
            title="Walk-in Sale" 
            date="Today, 2:30 PM" 
            amount="+₱1,250.00" 
            type="sale" 
          />
          <TransactionItem 
            icon="bolt" 
            title="Meralco Bill" 
            date="Yesterday, 10:15 AM" 
            amount="-₱4,500.00" 
            type="expense" 
          />
          <TransactionItem 
            icon="inventory" 
            title="Supplier Restock" 
            date="Oct 12, 9:00 AM" 
            amount="-₱12,300.00" 
            type="expense" 
          />
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.colors.secondaryContainer }]}
        activeOpacity={0.8}
        onPress={() => Alert.alert('New Transaction', 'Opening Add Transaction modal...')}
      >
        <MaterialIcons name="add" size={28} color={theme.colors.onSecondaryContainer} />
      </TouchableOpacity>
    </View>
  );
}

function TransactionItem({ icon, title, date, amount, type }: { icon: any, title: string, date: string, amount: string, type: 'sale' | 'expense' }) {
  const isSale = type === 'sale';
  return (
    <View style={[styles.transactionItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceContainerLow }]}>
      <View style={styles.transactionInfo}>
        <View style={[
          styles.iconContainer, 
          { backgroundColor: isSale ? `${theme.colors.tertiaryFixed}4D` : `${theme.colors.errorContainer}80` }
        ]}>
          <MaterialIcons 
            name={icon} 
            size={24} 
            color={isSale ? theme.colors.tertiaryContainer : theme.colors.onErrorContainer} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[theme.typography.button, { color: theme.colors.onSurface }]}>{title}</Text>
          <Text style={[theme.typography.labelMedium, { color: theme.colors.outline }]}>{date}</Text>
        </View>
      </View>
      <Text style={[
        theme.typography.button, 
        { color: isSale ? theme.colors.tertiaryContainer : theme.colors.error }
      ]}>
        {amount}
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
    paddingBottom: 100, // Space for FAB and TabBar
  },
  toggleContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.gridGutter,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
  },
  toggleButtonActive: {
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profitCard: {
    padding: theme.spacing.containerPadding,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: theme.spacing.gridGutter,
  },
  profitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  chartContainer: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  chartBar: {
    width: '14%',
    borderRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.gridGutter,
    marginBottom: theme.spacing.base,
  },
  transactionList: {
    gap: theme.spacing.stackGap,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    justifyContent: 'center',
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
});
