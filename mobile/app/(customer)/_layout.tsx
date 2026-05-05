import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../src/theme/theme';

export default function CustomerTabsLayout() {
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarLabel: 'Saved',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="favorite" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-reviews"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
