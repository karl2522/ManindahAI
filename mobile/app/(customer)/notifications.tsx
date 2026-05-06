import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../src/theme/theme';

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <Stack.Screen options={{ title: 'Notifications' }} />

      <View style={styles.emptyState}>
        <MaterialIcons name="notifications-none" size={48} color={theme.colors.outline} />
        <Text style={styles.emptyTitle}>No notifications yet</Text>
        <Text style={styles.emptyText}>We will let you know when stores reply or updates arrive.</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
  },
  emptyText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
