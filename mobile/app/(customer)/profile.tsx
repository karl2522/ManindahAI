import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '../../src/hooks/useStore';
import { AuthService } from '../../src/services/auth';
import { theme } from '../../src/theme/theme';
import { useState } from 'react';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, roles } = useStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const doLogout = async () => {
    try {
      await AuthService.logout();
      router.replace('/(auth)/login');
    } catch (e: any) {
      console.error('Logout error:', e.message);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
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

        {roles.includes('owner') ? (
          <View style={styles.ctaCard}>
            <View style={styles.ctaTextBlock}>
              <Text style={styles.ctaTitle}>Your Store is Active</Text>
              <Text style={styles.ctaBody}>
                Manage your inventory and track your sales performance.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.ctaButtonText}>Go to Shop Dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
        )}
      </ScrollView>

      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={theme.colors.onError} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <MaterialIcons name="logout" size={28} color={theme.colors.error} />
              </View>
              <Text style={styles.modalTitle}>Confirm Logout</Text>
              <Text style={styles.modalBody}>Are you sure you want to sign out of your account?</Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButton} 
                onPress={() => {
                  setShowLogoutModal(false);
                  doLogout();
                }}
              >
                <Text style={styles.confirmButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    gap: 24,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    gap: 12,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
  },
  modalBody: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...theme.typography.button,
    color: theme.colors.onSurfaceVariant,
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    ...theme.typography.button,
    color: theme.colors.onError,
  },
});
