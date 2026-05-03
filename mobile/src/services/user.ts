import { supabase } from '../lib/supabase';

export type UserRole = 'owner' | 'customer' | 'moderator';
export type UserStatus = 'active' | 'suspended' | 'banned';

export interface UserProfile {
  user_id: string;
  firebase_uid: string;
  name: string | null;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export const UserService = {
  /**
   * Upsert a user profile in Supabase from a Firebase user.
   * This is called right after a successful Firebase sign-in.
   * If the user already exists (by firebase_uid), it updates their name/email.
   * If not, it creates a new record with the default role of 'customer'.
   */
  async syncFromFirebase(params: {
    firebase_uid: string;
    email: string;
    name: string | null;
  }): Promise<UserProfile> {
    const { firebase_uid, email, name } = params;

    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          firebase_uid,
          email,
          name,
        },
        {
          onConflict: 'firebase_uid',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to sync user to Supabase: ${error.message}`);
    }

    return data as UserProfile;
  },

  /**
   * Get a user profile by their Firebase UID.
   */
  async getByFirebaseUid(firebase_uid: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebase_uid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return data as UserProfile;
  },
};
