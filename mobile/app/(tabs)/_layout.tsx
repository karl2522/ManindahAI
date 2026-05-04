import { Tabs, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity, Alert, Platform, View, Text, StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { AuthService } from '../../src/services/auth';
import { theme } from '../../src/theme/theme';

export default function TabsLayout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const doLogout = async () => {
    try {
      await AuthService.logout();
      queryClient.clear();
      router.replace('/(auth)/login');
    } catch (e: any) {
      Alert.alert('Error', String(e?.message ?? e));
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
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primaryContainer,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarStyle: {
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.surfaceVariant,
          elevation: 8,
          shadowColor: '#00535B',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTitleStyle: {
          color: theme.colors.primaryContainer,
          fontWeight: '700',
          fontSize: 20,
        },
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
            <MaterialIcons name="logout" size={22} color={theme.colors.primaryContainer} />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Stock List',
          tabBarLabel: 'Stock List',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="inventory-2" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarLabel: () => null,
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ focused }) => (
            <View style={styles.scanButtonContainer}>
              <View style={[
                styles.scanButton,
                { backgroundColor: theme.colors.secondaryContainer }
              ]}>
                <MaterialIcons name="qr-code-scanner" size={28} color={theme.colors.onSecondaryContainer} />
              </View>
              <Text style={styles.scanLabel}>Scan</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="financial_hub"
        options={{
          title: 'Financial Hub',
          tabBarLabel: 'Financial Hub',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="payments" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarLabel: 'Insights',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="insights" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden legacy tab */}
      <Tabs.Screen
        name="products"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -10,
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: theme.colors.surface,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  scanLabel: {
    fontSize: 10,
    color: theme.colors.outline,
    marginTop: 4,
    fontWeight: '500',
  },
});
