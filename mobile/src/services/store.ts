import { supabase } from '../lib/supabase';
import { UserService } from './user';

export type StoreStatus = 'active' | 'inactive' | 'under_review';

export type Store = {
  store_id: string;
  user_id: string;
  store_name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  status: StoreStatus;
  created_at: string;
  updated_at: string;
};

export const StoreService = {
  /**
   * Get the store owned by a given user_id.
   * Returns null if the user has no store yet.
   */
  async getByUserId(user_id: string): Promise<Store | null> {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch store: ${error.message}`);
    }

    return data as Store;
  },

  /**
   * Create a new store for the given user_id.
   */
  async create(user_id: string, store_name: string): Promise<Store> {
    const { data, error } = await supabase
      .from('stores')
      .insert({ user_id, store_name })
      .select()
      .single();

    if (error) throw new Error(`Failed to create store: ${error.message}`);

    await UserService.addRole(user_id, 'owner');

    return data as Store;
  },
};
