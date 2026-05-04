import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { theme } from '../../src/theme/theme';
import { AuthService } from '../../src/services/auth';

export default function TabsIndex() {
  const router = useRouter();

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Stack.Screen 
        options={{
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <View style={styles.storeIcon}>
                <MaterialIcons name="storefront" size={20} color={theme.colors.primaryContainer} />
              </View>
              <View>
                <Text style={styles.headerTitleText}>Manindah Store</Text>
                <View style={styles.statusContainer}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Naka-Offline</Text>
                </View>
              </View>
            </View>
          ),
          headerRight: () => (
            <TouchableOpacity style={styles.headerIconButton}>
              <MaterialIcons name="cloud-off" size={24} color={theme.colors.primaryContainer} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Today's Sales Card */}
      <View style={styles.salesCard}>
        <View style={styles.salesHeader}>
          <Text style={styles.salesTitle}>Today's Sales</Text>
          <MaterialIcons name="trending-up" size={24} color={theme.colors.tertiaryContainer} />
        </View>
        <View>
          <Text style={styles.salesAmount}>₱ 4,250.00</Text>
          <Text style={styles.salesSubtitle}>24 Transactions</Text>
        </View>
      </View>

      {/* Quick Action Grid */}
      <View style={styles.actionGrid}>
        <ActionButton 
          icon="point-of-sale" 
          label="Manual Sale" 
          color={theme.colors.primaryFixed} 
          iconColor={theme.colors.primaryContainer} 
          onPress={() => Alert.alert('Manual Sale', 'Opening POS interface...')}
        />
        <ActionButton 
          icon="receipt-long" 
          label="Add Expense" 
          color={theme.colors.errorContainer} 
          iconColor={theme.colors.onErrorContainer} 
          onPress={() => router.push('/(tabs)/financial_hub')}
        />
        <ActionButton 
          icon="local-shipping" 
          label="Supplier Matrix" 
          color={theme.colors.secondaryContainer} 
          iconColor={theme.colors.onSecondaryContainer} 
          onPress={() => Alert.alert('Supplier Matrix', 'Opening supplier management...')}
        />
        <ActionButton 
          icon="settings" 
          label="Settings" 
          color={theme.colors.surfaceVariant} 
          iconColor={theme.colors.onSurfaceVariant} 
          onPress={() => Alert.alert('Settings', 'Opening store settings...')}
        />
      </View>

      {/* Low Stock Alert Section */}
      <View style={styles.alertSection}>
        <View style={styles.alertHeader}>
          <MaterialIcons name="warning" size={20} color={theme.colors.error} />
          <Text style={styles.alertTitle}>Kulang sa Stocks</Text>
        </View>
        
        <View style={styles.alertList}>
          <LowStockItem 
            name="Lucky Me Beef Noodles" 
            stock="Only 5 left" 
            imageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuBEwWFVajpT8dN2HALY9xNTDCr667cuDe5SKfqsFcsxvlyZAyCVXnYdnM-FuEQRUuuc4EhkWDkWDdisJovyZ88RuBlra7o30zaYocjj6GTIQwhNq95jGB3Zikryy9_WkGRcWEQK4GTjrVwONbNdNgychji48QP_AuJKMT9_cz1wJTaRXVWxMn3dW1shNI7xcRQtYQkjttjM4BvpzRZsEVdFAkOncioVjNW5TotU2udDI3vMkpHRfxtqJ_HFC74W4HDE0Yy8lbqQDco"
            onRestock={() => router.push('/(tabs)/inventory')}
          />
          <LowStockItem 
            name="Coke Kasalo 800ml" 
            stock="Only 2 left" 
            imageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuAF7cYvn5HSOLMFLCZEbnQmJsMFkgZk1dyE7UaoZGC_wE61XRG5k7T3yrvWEaYGpIfBDyAGDTTG9QeEQpg28BlPdUvO0NsYcqo1_QwlazGdHUfh18FqDpP0crVSrd473HRTMgiXLzVRWYviymGlHwRzvWeuzNDMlIluTj0qwDuP-U0EypSnFkwLFgB1IwUu83X99HXGtvaw9Akt-34MBQv3hVbMvl9LKQcqXXXj-NqK8d2SSBmt7RhFc-iFP2aVRU6k-rvu-_ccgUw"
            onRestock={() => router.push('/(tabs)/inventory')}
          />
        </View>
      </View>

      {/* Temporary Logout Button */}
      <TouchableOpacity 
        style={[styles.actionButton, { marginTop: 20, backgroundColor: theme.colors.errorContainer, alignSelf: 'stretch', justifyContent: 'center' }]} 
        onPress={async () => {
          try {
            await AuthService.logout();
            router.replace('/(auth)/login');
          } catch (e: any) {
            Alert.alert('Logout Error', e.message);
          }
        }}
      >
        <Text style={[styles.actionLabel, { color: theme.colors.onErrorContainer, fontSize: 16, textAlign: 'center', width: '100%' }]}>Logout (Temporary)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ActionButton({ icon, label, color, iconColor, onPress }: { icon: any, label: string, color: string, iconColor: string, onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <View style={[styles.actionIconContainer, { backgroundColor: color }]}>
        <MaterialIcons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function LowStockItem({ name, stock, imageUrl, onRestock }: { name: string, stock: string, imageUrl: string, onRestock?: () => void }) {
  return (
    <View style={styles.stockItem}>
      <Image source={{ uri: imageUrl }} style={styles.stockImage} />
      <View style={styles.stockInfo}>
        <Text style={styles.stockName}>{name}</Text>
        <Text style={styles.stockCount}>{stock}</Text>
      </View>
      <TouchableOpacity style={styles.restockButton} onPress={onRestock}>
        <Text style={styles.restockButtonText}>Restock</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.containerPadding,
    gap: theme.spacing.stackGap,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primaryContainer,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.error,
  },
  statusText: {
    fontSize: 10,
    color: theme.colors.outline,
    fontWeight: '500',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    marginRight: 8,
  },
  salesCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.containerPadding,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    elevation: 2,
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    gap: 16,
  },
  salesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salesTitle: {
    ...theme.typography.h2,
    color: theme.colors.onSurface,
  },
  salesAmount: {
    ...theme.typography.h1,
    color: theme.colors.primaryContainer,
  },
  salesSubtitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.outline,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.xl,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    minWidth: '45%',
    minHeight: 96,
    elevation: 2,
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...theme.typography.labelMedium,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  alertSection: {
    backgroundColor: 'rgba(255, 218, 214, 0.3)', // errorContainer at 30% opacity
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.containerPadding,
    borderWidth: 1,
    borderColor: theme.colors.errorContainer,
    gap: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertTitle: {
    ...theme.typography.h3,
    color: theme.colors.error,
  },
  alertList: {
    gap: 8,
  },
  stockItem: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  stockImage: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceContainer,
  },
  stockInfo: {
    flex: 1,
  },
  stockName: {
    ...theme.typography.bodyMedium,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  stockCount: {
    ...theme.typography.labelMedium,
    color: theme.colors.error,
  },
  restockButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  restockButtonText: {
    ...theme.typography.button,
    fontSize: 12,
    color: theme.colors.onPrimary,
  },
});
