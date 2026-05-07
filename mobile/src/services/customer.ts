import { supabase } from '../lib/supabase';
import { StoreStatus } from './store';

export type StoreSummary = {
  store_id: string;
  store_name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  status: StoreStatus;
  rating: number;
  review_count: number;
  owner_name: string | null;
  sales_count: number;
  total_sales: number;
};

export type Review = {
  review_id: string;
  user_id: string;
  store_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  author_name: string | null;
  store_name?: string | null;
};

export type CreateReviewInput = {
  store_id: string;
  user_id: string;
  rating: number;
  comment?: string;
};

const roundRating = (value: number) => Math.round(value * 10) / 10;

const mapStoreSummary = (row: any): StoreSummary => {
  const ratings = (row.reviews ?? []).map((r: any) => r.rating as number);
  const reviewCount = ratings.length;
  const average = reviewCount ? ratings.reduce((sum: number, r: number) => sum + r, 0) / reviewCount : 0;

  const sales = row.sales ?? [];
  const salesCount = sales.length;
  const totalSales = sales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);

  return {
    store_id: row.store_id,
    store_name: row.store_name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    image_url: row.image_url,
    status: row.status,
    rating: roundRating(average) || 0,
    review_count: reviewCount,
    owner_name: row.users?.name ?? null,
    sales_count: salesCount,
    total_sales: totalSales,
  };
};

export const CustomerService = {
  /**
   * Fetch all stores for discovery (includes rating summary).
   */
  async listStores(): Promise<StoreSummary[]> {
    const { data, error } = await supabase
      .from('stores')
      .select('store_id, store_name, address, latitude, longitude, image_url, status, reviews(rating), users(name), sales(total_amount)')
      .order('store_name');

    if (error) throw new Error(`Failed to fetch stores: ${error.message}`);

    return (data ?? []).map(mapStoreSummary);
  },

  /**
   * Search stores by name for discovery.
   */
  async searchStores(query: string): Promise<StoreSummary[]> {
    if (!query.trim()) return this.listStores();

    const { data, error } = await supabase
      .from('stores')
      .select('store_id, store_name, address, latitude, longitude, image_url, status, reviews(rating), users(name), sales(total_amount)')
      .ilike('store_name', `%${query}%`)
      .order('store_name');

    if (error) throw new Error(`Failed to search stores: ${error.message}`);

    return (data ?? []).map(mapStoreSummary);
  },

  /**
   * Fetch a single store with rating summary.
   */
  async getStoreById(store_id: string): Promise<StoreSummary | null> {
    const { data, error } = await supabase
      .from('stores')
      .select('store_id, store_name, address, latitude, longitude, image_url, status, reviews(rating), users(name), sales(total_amount)')
      .eq('store_id', store_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch store: ${error.message}`);
    }

    return mapStoreSummary(data);
  },

  /**
   * Fetch multiple stores by IDs (favorites).
   */
  async getStoresByIds(store_ids: string[]): Promise<StoreSummary[]> {
    if (store_ids.length === 0) return [];

    const { data, error } = await supabase
      .from('stores')
      .select('store_id, store_name, address, latitude, longitude, image_url, status, reviews(rating), users(name), sales(total_amount)')
      .in('store_id', store_ids);

    if (error) throw new Error(`Failed to fetch saved stores: ${error.message}`);

    return (data ?? []).map(mapStoreSummary);
  },

  /**
   * Fetch reviews for a store (includes author name when available).
   */
  async getReviewsByStoreId(store_id: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('review_id, user_id, store_id, rating, comment, created_at, users(name)')
      .eq('store_id', store_id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch reviews: ${error.message}`);

    return (data ?? []).map((row: any) => ({
      review_id: row.review_id,
      user_id: row.user_id,
      store_id: row.store_id,
      rating: row.rating,
      comment: row.comment,
      created_at: row.created_at,
      author_name: row.users?.name ?? null,
    }));
  },

  /**
   * Create a new review for a store.
   */
  async createReview(input: CreateReviewInput): Promise<Review> {
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        store_id: input.store_id,
        user_id: input.user_id,
        rating: input.rating,
        comment: input.comment ?? null,
      })
      .select('review_id, user_id, store_id, rating, comment, created_at, users(name)')
      .single();

    if (error) throw new Error(`Failed to create review: ${error.message}`);

    return {
      review_id: data.review_id,
      user_id: data.user_id,
      store_id: data.store_id,
      rating: data.rating,
      comment: data.comment,
      created_at: data.created_at,
      author_name: data.users?.[0]?.name ?? null,
    };
  },

  /**
   * Fetch reviews written by a specific user (includes store name).
   */
  async getReviewsByUserId(user_id: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('review_id, user_id, store_id, rating, comment, created_at, stores(store_name)')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch user reviews: ${error.message}`);

    return (data ?? []).map((row: any) => ({
      review_id: row.review_id,
      user_id: row.user_id,
      store_id: row.store_id,
      rating: row.rating,
      comment: row.comment,
      created_at: row.created_at,
      author_name: null,
      store_name: row.stores?.store_name ?? null,
    }));
  },
};
