import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { getOutboxCount } from '../lib/outbox';
import { theme } from '../theme/theme';

export function SyncBadge() {
  const { data: count = 0, refetch } = useQuery({
    queryKey: ['outbox-count'],
    queryFn: getOutboxCount,
    refetchInterval: 5000, // Poll every 5s for the badge
  });

  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: count > 0 ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [count]);

  if (count === 0) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.badge}>
        <MaterialIcons name="sync" size={12} color="#fff" style={styles.icon} />
        <Text style={styles.text}>{count} pending</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 9999,
  },
  badge: {
    backgroundColor: theme.colors.tertiaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
