import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../../src/hooks/useStore';
import { AuthService } from '../../src/services/auth';
import { theme } from '../../src/theme/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile } = useStore();

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
      <Stack.Screen options={{ title: 'Profile' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={32} color={theme.colors.primaryContainer} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name ?? 'Community Member'}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Community Member</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuSection}>
          <MenuItem label="My Reviews" icon="star" onPress={() => router.push('/(customer)/my-reviews')} />
        </View>

        <View style={styles.ctaCard}>
          <View style={styles.ctaTextBlock}>
            <Text style={styles.ctaTitle}>Own a Sari-Sari Store?</Text>
            <Text style={styles.ctaBody}>
              Digitize your inventory, track sales, and grow your business with ManindahAI.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/onboarding/merchant')}
          >
            <Text style={styles.ctaButtonText}>Register as Store Owner</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={theme.colors.onError} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MenuItem({ label, icon, onPress }: { label: string; icon: any; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIcon}>
        <MaterialIcons name={icon} size={20} color={theme.colors.primaryContainer} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <MaterialIcons name="chevron-right" size={20} color={theme.colors.outline} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, gap: 20, paddingBottom: 140 },
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    shadowColor: '#00535B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  profileInfo: { flex: 1, gap: 6 },
  profileName: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.secondaryContainer,
  },
  badgeText: {
    ...theme.typography.labelMedium,
    color: theme.colors.onSecondaryContainer,
  },
  menuSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  menuLabel: {
    flex: 1,
    ...theme.typography.button,
    color: theme.colors.onSurface,
  },
  ctaCard: {
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  ctaTextBlock: { gap: 6 },
  ctaTitle: {
    ...theme.typography.h3,
    color: theme.colors.onPrimary,
  },
  ctaBody: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onPrimary,
  },
  ctaButton: {
    backgroundColor: theme.colors.secondaryContainer,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    ...theme.typography.button,
    color: theme.colors.onSecondaryContainer,
  },
  logoutButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    ...theme.typography.button,
    color: theme.colors.onError,
  },
  logoutContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 90,
  },
});
