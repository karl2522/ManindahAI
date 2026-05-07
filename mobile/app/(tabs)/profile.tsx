import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../../src/hooks/useStore';
import { AuthService } from '../../src/services/auth';
import { ProductService } from '../../src/services/product';
import { InventoryService } from '../../src/services/inventory';
import { SalesService } from '../../src/services/sales';
import { theme } from '../../src/theme/theme';

export default function OwnerProfileScreen() {
  const router = useRouter();
  const { profile, store } = useStore();

  const today = new Date().toISOString().split('T')[0];

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['products', store?.store_id],
    queryFn: () => ProductService.getByStoreId(store!.store_id),
    enabled: !!store?.store_id,
  });

  const { data: lowStockProducts, isLoading: loadingLowStock } = useQuery({
    queryKey: ['low-stock', store?.store_id],
    queryFn: () => InventoryService.getLowStockProducts(store!.store_id),
    enabled: !!store?.store_id,
  });

  const { data: todaySales, isLoading: loadingSales } = useQuery({
    queryKey: ['sales-today', store?.store_id, today],
    queryFn: () => SalesService.getByDateRange(store!.store_id, today, today),
    enabled: !!store?.store_id,
  });

  const itemCount = products?.length ?? 0;
  const lowStockCount = lowStockProducts?.length ?? 0;
  const todayRevenue = todaySales?.reduce((sum, s) => sum + s.total_amount, 0) ?? 0;

  const doLogout = async () => {
    try {
      await AuthService.logout();
      router.replace('/(auth)/login');
    } catch (e: any) {
      Alert.alert('Logout Error', e.message);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) doLogout();
      return;
    }
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: doLogout },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Store Profile', 
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTitleStyle: { ...theme.typography.h3, color: theme.colors.primaryContainer, fontWeight: '700' },
          headerTintColor: theme.colors.primaryContainer,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <MaterialIcons name="arrow-back-ios" size={20} color={theme.colors.primaryContainer} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBorder}>
              <View style={styles.avatar}>
                <MaterialIcons name="store" size={48} color={theme.colors.primaryContainer} />
              </View>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>Platinum Merchant</Text>
            </View>
          </View>
          
          <View style={styles.headerInfo}>
            <Text style={styles.storeName}>{store?.store_name ?? "Juan's Sari-Sari Store"}</Text>
            <Text style={styles.ownerEmail}>{profile?.email ?? 'juan.delacruz@manindah.ai'}</Text>
          </View>
        </View>

        {/* Business Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.secondary }]}>
              {loadingSales ? '--' : `₱${todayRevenue.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            </Text>
            <Text style={styles.statLabel}>TODAY</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {loadingProducts ? '--' : itemCount}
            </Text>
            <Text style={styles.statLabel}>ITEMS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.error }]}>
              {loadingLowStock ? '--' : lowStockCount}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.error }]}>LOW STOCK</Text>
          </View>
        </View>

        {/* Management Menu */}
        <View style={styles.menuContainer}>
          <MenuItem 
            label="Inventory Settings" 
            icon="inventory-2" 
            onPress={() => router.push('/(tabs)/inventory')} 
          />
          <MenuItem 
            label="Monthly Reports" 
            icon="assessment" 
            onPress={() => router.push('/(tabs)/insights')} 
          />
          <MenuItem 
            label="Store Notifications" 
            icon="notifications" 
            hasBadge
            onPress={() => {}} 
          />
          <MenuItem 
            label="Staff & Access" 
            icon="manage-accounts" 
            onPress={() => {}} 
          />
          <MenuItem 
            label="App Settings" 
            icon="settings" 
            isLast
            onPress={() => {}} 
          />
        </View>

        {/* Subscription CTA Card */}
        <View style={styles.subscriptionCard}>
          <View style={styles.subIconContainer}>
            <MaterialIcons name="verified" size={40} color={theme.colors.onPrimary} style={{ opacity: 0.2 }} />
          </View>
          <View style={styles.subContent}>
            <Text style={styles.subTitle}>Subscription Plan: Pro</Text>
            <Text style={styles.subBody}>
              Your Pro subscription expires in 12 days. Renew now to maintain access to advanced insights.
            </Text>
            <TouchableOpacity style={styles.renewButton} onPress={() => {}}>
              <Text style={styles.renewButtonText}>Renew Subscription</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Action */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={theme.colors.error} />
          <Text style={styles.logoutText}>Sign Out from Store</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function MenuItem({ 
  label, 
  icon, 
  onPress, 
  isLast = false,
  hasBadge = false 
}: { 
  label: string; 
  icon: any; 
  onPress: () => void;
  isLast?: boolean;
  hasBadge?: boolean;
}) {
  return (
    <TouchableOpacity 
      style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]} 
      onPress={onPress}
    >
      <View style={styles.menuIconBox}>
        <MaterialIcons name={icon} size={22} color={theme.colors.primary} />
        {hasBadge && <View style={styles.menuDot} />}
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <MaterialIcons name="chevron-right" size={24} color={theme.colors.outlineVariant} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.gridMargin,
    gap: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 100,
  },
  headerSection: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    shadowColor: theme.colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    gap: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  avatarBorder: {
    padding: 4,
    borderRadius: 60,
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusBadgeText: {
    ...theme.typography.labelSmall,
    color: theme.colors.onSecondaryContainer,
    fontWeight: '700',
  },
  headerInfo: {
    alignItems: 'center',
    gap: 4,
  },
  storeName: {
    ...theme.typography.h2,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  ownerEmail: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    shadowColor: theme.colors.primaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    ...theme.typography.h3,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.outline,
    letterSpacing: 0.5,
  },
  menuContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    overflow: 'hidden',
    shadowColor: theme.colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceContainerLow,
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  menuDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.error,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  menuLabel: {
    flex: 1,
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  subscriptionCard: {
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: 24,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: theme.colors.primaryContainer,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  subIconContainer: {
    position: 'absolute',
    top: -20,
    right: -20,
  },
  subContent: {
    gap: 12,
    zIndex: 1,
  },
  subTitle: {
    ...theme.typography.h3,
    color: theme.colors.onPrimary,
    fontWeight: '700',
  },
  subBody: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primaryFixed,
    lineHeight: 20,
  },
  renewButton: {
    backgroundColor: theme.colors.secondaryContainer,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  renewButtonText: {
    ...theme.typography.button,
    color: theme.colors.onSecondaryContainer,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    gap: 8,
  },
  logoutText: {
    ...theme.typography.button,
    color: theme.colors.error,
    fontWeight: '700',
  },
});
