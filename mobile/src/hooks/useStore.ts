import { auth } from '../lib/firebase';
import { UserService, UserProfile } from '../services/user';
import { StoreService, Store } from '../services/store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

type UseStoreResult = {
  store: Store | null;
  userId: string | null;
  profile: UserProfile | null;
  roles: string[];
  loading: boolean;
  isFetching: boolean;
  error: any;
};

/**
 * Resolves the current Firebase user → Supabase user profile → store using React Query.
 * This ensures data is cached and synchronized across all screens.
 */
export function useStore(): UseStoreResult {
  const firebaseUser = auth.currentUser;

  const { 
    data: profile, 
    isLoading: loadingProfile, 
    isFetching: isFetchingProfile,
    error: profileError 
  } = useQuery({
    queryKey: ['profile', firebaseUser?.uid],
    queryFn: () => UserService.getByFirebaseUid(firebaseUser!.uid),
    enabled: !!firebaseUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { 
    data: store, 
    isLoading: loadingStore, 
    error: storeError 
  } = useQuery({
    queryKey: ['store', profile?.user_id],
    queryFn: () => StoreService.getByUserId(profile!.user_id),
    enabled: !!profile?.user_id,
    staleTime: 1000 * 60 * 5,
  });

  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-sync if profile is missing but firebase user exists
  useEffect(() => {
    const sync = async () => {
      if (firebaseUser && !profile && !loadingProfile && !profileError && !isSyncing) {
        setIsSyncing(true);
        try {
          await UserService.syncFromFirebase({
            firebase_uid: firebaseUser.uid,
            email: firebaseUser.email!,
            name: firebaseUser.displayName,
          });
          queryClient.invalidateQueries({ queryKey: ['profile', firebaseUser.uid] });
        } catch (e) {
          console.error('[useStore] Auto-sync failed:', e);
        } finally {
          setIsSyncing(false);
        }
      }
    };
    sync();
  }, [firebaseUser, profile, loadingProfile, queryClient, isSyncing, profileError]);

  return {
    store: store ?? null,
    userId: profile?.user_id ?? null,
    profile: profile ?? null,
    roles: profile?.roles ?? [],
    loading: loadingProfile || loadingStore || isSyncing,
    isFetching: isFetchingProfile,
    error: profileError || storeError,
  };
}
