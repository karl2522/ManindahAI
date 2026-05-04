import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { UserService, UserProfile, UserRole } from '../services/user';
import { StoreService, Store } from '../services/store';

type UseStoreResult = {
  store: Store | null;
  userId: string | null;
  profile: UserProfile | null;
  roles: UserRole[];
  loading: boolean;
  error: string | null;
  setStore: (store: Store | null) => void;
};

/**
 * Resolves the current Firebase user → Supabase user profile → store.
 * Returns `store: null` (without an error) if the user has no store yet.
 * Returns `userId` so screens can call StoreService.create() if needed.
 */
export function useStore(): UseStoreResult {
  const [store, setStore] = useState<Store | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      try {
        const resolvedProfile = await UserService.getByFirebaseUid(firebaseUser.uid);
        if (!resolvedProfile) throw new Error('User profile not found in Supabase.');

        setProfile(resolvedProfile);
        setUserId(resolvedProfile.user_id);

        const storeData = await StoreService.getByUserId(resolvedProfile.user_id);
        setStore(storeData);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { store, userId, profile, roles: profile?.roles ?? [], loading, error, setStore };
}
