import { supabase } from '../lib/supabase';

export type UserRole = 'owner' | 'customer' | 'moderator';
export type UserStatus = 'active' | 'suspended' | 'banned';

export interface UserProfile {
  user_id: string;
  firebase_uid: string;
  name: string | null;
  email: string;
  roles: UserRole[];
  status: UserStatus;
  push_token?: string | null;
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
    roles?: UserRole[];
  }): Promise<UserProfile> {
    const { firebase_uid, email, name, roles } = params;

    const upsertPayload: Record<string, unknown> = { firebase_uid, email, name };
    if (roles) upsertPayload.roles = roles;

    const { data, error } = await supabase
      .from('users')
      .upsert(
        upsertPayload,
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
   * Add a role to a user's roles array if they don't already have it.
   */
  async addRole(user_id: string, role: UserRole): Promise<void> {
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('roles')
      .eq('user_id', user_id)
      .single();

    if (fetchError) throw new Error(`Failed to fetch user roles: ${fetchError.message}`);

    const current: UserRole[] = data.roles ?? ['customer'];
    let newRoles: UserRole[];
    if (role === 'owner') {
      // When becoming an owner, we replace 'customer' with 'owner' for a cleaner role state
      newRoles = current.filter(r => r !== 'customer');
      if (!newRoles.includes('owner')) newRoles.push('owner');
      
      // If the roles didn't change (e.g. they were already just 'owner'), we can return
      if (newRoles.length === current.length && newRoles.every(r => current.includes(r))) {
        return;
      }
    } else {
      if (current.includes(role)) return;
      newRoles = [...current, role];
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ roles: newRoles })
      .eq('user_id', user_id);

    if (updateError) throw new Error(`Failed to update roles: ${updateError.message}`);
  },

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

  /**
   * Update a user's profile data.
   */
  async update(user_id: string, input: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('users')
      .update(input)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update user profile: ${error.message}`);

    return data as UserProfile;
  },
};
