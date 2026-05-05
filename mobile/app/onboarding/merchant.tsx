import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../src/theme/theme';

export default function MerchantOnboardingScreen() {
  const router = useRouter();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: 'Merchant Onboarding' }} />
      <View style={styles.content}>
        <Text style={styles.title}>Launch your store with ManindahAI</Text>
        <Text style={styles.subtitle}>
          Everything you need to digitize daily sales, manage inventory, and grow your sari-sari business.
        </Text>

        <FeatureCard
          icon="inventory"
          title="Smart Inventory"
          description="Auto-track stocks and never run out of top sellers."
        />
        <FeatureCard
          icon="insights"
          title="Daily Insights"
          description="See your profits and sales trends at a glance."
        />
        <FeatureCard
          icon="wifi-off"
          title="Offline-First"
          description="Works even without internet in your barangay."
        />

        <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/onboarding/store-setup')}>
          <Text style={styles.ctaText}>Start My Store Registration</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function FeatureCard({ icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIcon}>
        <MaterialIcons name={icon} size={24} color={theme.colors.primaryContainer} />
      </View>
      <View style={styles.featureTextBlock}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 16 },
  title: {
    ...theme.typography.h2,
    color: theme.colors.onSurface,
  },
  subtitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
  },
  featureCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextBlock: { flex: 1, gap: 4 },
  featureTitle: {
    ...theme.typography.button,
    color: theme.colors.onSurface,
  },
  featureDescription: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
  },
  ctaButton: {
    marginTop: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    ...theme.typography.button,
    color: theme.colors.onPrimary,
  },
});
