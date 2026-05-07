import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore } from '../../../src/hooks/useStore';
import { CustomerService, Review } from '../../../src/services/customer';
import { theme } from '../../../src/theme/theme';

export default function StoreReviewsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { profile } = useStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ['store-reviews', storeId],
    queryFn: () => CustomerService.getReviewsByStoreId(storeId ?? ''),
    enabled: !!storeId,
  });

  const { data: store, isLoading: loadingStore } = useQuery({
    queryKey: ['store', storeId],
    queryFn: () => CustomerService.getStoreById(storeId ?? ''),
    enabled: !!storeId,
  });

  const isLoading = loadingReviews || loadingStore;

  const ratingSummary = useMemo(() => {
    if (reviews.length === 0) return { rating: 0, count: 0 };
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return { rating: Math.round(avg * 10) / 10, count: reviews.length };
  }, [reviews]);

  const handleSubmitReview = async () => {
    if (!storeId) return;
    if (!profile?.user_id) {
      Alert.alert('Review', 'You must be logged in to submit a review.');
      return;
    }
    if (rating < 1) {
      Alert.alert('Review', 'Select a rating to continue.');
      return;
    }
    setSubmitting(true);
    try {
      await CustomerService.createReview({
        store_id: storeId,
        user_id: profile.user_id,
        rating,
        comment: comment.trim() || undefined,
      });
      setModalVisible(false);
      setRating(0);
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['store-reviews', storeId] });
      queryClient.invalidateQueries({ queryKey: ['store', storeId] });
      queryClient.invalidateQueries({ queryKey: ['customer-stores'] });
    } catch (e: any) {
      Alert.alert('Review Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}> 
        <ActivityIndicator size="large" color={theme.colors.primaryContainer} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <Stack.Screen options={{ title: store?.store_name ? `Reviews: ${store.store_name}` : 'Reviews' }} />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryRating}>{(ratingSummary.rating || 0).toFixed(1)}</Text>
        <RatingStars rating={ratingSummary.rating} size={18} />
        <Text style={styles.summarySub}>Based on {ratingSummary.count} community reviews</Text>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.review_id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <ReviewCard review={item} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No reviews yet.</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <MaterialIcons name="rate-review" size={22} color={theme.colors.onSecondaryContainer} />
        <Text style={styles.fabText}>Write a Review</Text>
      </TouchableOpacity>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(customer)')}>
          <MaterialIcons name="map" size={22} color={theme.colors.primaryContainer} />
          <Text style={styles.navLabelActive}>Explore</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(customer)/saved')}>
          <MaterialIcons name="favorite-border" size={22} color={theme.colors.outline} />
          <Text style={styles.navLabel}>Saved</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(customer)/profile')}>
          <MaterialIcons name="person-outline" size={22} color={theme.colors.outline} />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={22} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Rating</Text>
            <View style={styles.ratingPickerRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.ratingPill,
                    rating >= value && { backgroundColor: theme.colors.secondaryContainer, borderColor: theme.colors.secondary },
                  ]}
                  onPress={() => setRating(value)}
                >
                  <MaterialIcons
                    name="star"
                    size={16}
                    color={rating >= value ? theme.colors.onSecondaryContainer : theme.colors.outline}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Comment (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Share your experience"
              placeholderTextColor={theme.colors.outline}
              value={comment}
              onChangeText={setComment}
              multiline
            />

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleSubmitReview}
              disabled={submitting}
            >
              <Text style={styles.modalButtonText}>{submitting ? 'Submitting...' : 'Submit Review'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const initials = review.author_name ? review.author_name.charAt(0).toUpperCase() : 'U';

  return (
    <View style={styles.reviewCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.reviewBody}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewAuthor}>{review.author_name ?? 'Community Member'}</Text>
          <RatingStars rating={review.rating} size={14} />
        </View>
        <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text>
        <Text style={styles.reviewText}>{review.comment ?? 'No comment provided.'}</Text>
      </View>
    </View>
  );
}

function RatingStars({ rating, size }: { rating: number; size: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <View style={styles.starsRow}>
      {Array.from({ length: fullStars }).map((_, index) => (
        <MaterialIcons key={`full-${index}`} name="star" size={size} color={theme.colors.secondary} />
      ))}
      {hasHalf && <MaterialIcons name="star-half" size={size} color={theme.colors.secondary} />}
      {Array.from({ length: emptyStars }).map((_, index) => (
        <MaterialIcons key={`empty-${index}`} name="star-outline" size={size} color={theme.colors.secondary} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  summaryCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  summaryRating: {
    ...theme.typography.h1,
    color: theme.colors.primaryContainer,
  },
  summarySub: {
    ...theme.typography.labelMedium,
    color: theme.colors.onSurfaceVariant,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 180,
    gap: 12,
  },
  reviewCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...theme.typography.button,
    color: theme.colors.primaryContainer,
  },
  reviewBody: { flex: 1, gap: 4 },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewAuthor: {
    ...theme.typography.button,
    color: theme.colors.onSurface,
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.secondaryContainer,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    ...theme.typography.button,
    color: theme.colors.onSecondaryContainer,
  },
  bottomNav: {
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceVariant,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: theme.colors.outline,
  },
  navLabelActive: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primaryContainer,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.onSurface,
  },
  modalLabel: {
    ...theme.typography.labelMedium,
    color: theme.colors.onSurfaceVariant,
  },
  ratingPickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  modalInput: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.onSurface,
    ...theme.typography.bodyMedium,
  },
  modalButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    ...theme.typography.button,
    color: theme.colors.onPrimary,
  },
  starsRow: { flexDirection: 'row' },
});
