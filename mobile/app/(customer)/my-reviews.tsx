import { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../../src/hooks/useStore';
import { CustomerService, Review } from '../../src/services/customer';
import { theme } from '../../src/theme/theme';

export default function MyReviewsScreen() {
  const router = useRouter();
  const { profile } = useStore();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['my-reviews', profile?.user_id],
    queryFn: () => CustomerService.getReviewsByUserId(profile!.user_id),
    enabled: !!profile?.user_id,
  });

  const summary = useMemo(() => {
    if (reviews.length === 0) return 0;
    return Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;
  }, [reviews]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primaryContainer} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: 'My Reviews' }} />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryRating}>{(summary || 0).toFixed(1)}</Text>
        <Text style={styles.summarySub}>{reviews.length} reviews submitted</Text>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.review_id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ReviewCard
            review={item}
            onPress={() => router.push(`/store/${item.store_id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>You have not reviewed any stores yet.</Text>
          </View>
        }
      />

    </View>
  );
}

function ReviewCard({ review, onPress }: { review: Review; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.reviewCard} onPress={onPress}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewStore}>{review.store_name ?? 'Store'}</Text>
        <View style={styles.ratingRow}>
          <MaterialIcons name="star" size={14} color={theme.colors.secondary} />
          <Text style={styles.ratingText}>{(review.rating || 0).toFixed(1)}</Text>
        </View>
      </View>
      <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text>
      <Text style={styles.reviewText}>{review.comment ?? 'No comment provided.'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  summaryCard: {
    margin: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    gap: 6,
  },
  summaryRating: {
    ...theme.typography.h2,
    color: theme.colors.primaryContainer,
  },
  summarySub: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 180,
    gap: 12,
  },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    gap: 6,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewStore: {
    ...theme.typography.button,
    color: theme.colors.onSurface,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: {
    ...theme.typography.labelMedium,
    color: theme.colors.onSurfaceVariant,
  },
  reviewDate: {
    ...theme.typography.labelMedium,
    color: theme.colors.outline,
  },
  reviewText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
  },
  emptyText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.outline,
  },
});
