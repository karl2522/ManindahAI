import { auth } from '../lib/firebase';
import { UserService, UserProfile } from '../services/user';
import { StoreService, Store } from '../services/store';
import { useQuery } from '@tanstack/react-query';

type UseStoreResult = {
  store: Store | null;
  userId: string | null;
  profile: UserProfile | null;
  roles: string[];
  loading: boolean;
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

  return {
    store: store ?? null,
    userId: profile?.user_id ?? null,
    profile: profile ?? null,
    roles: profile?.roles ?? [],
    loading: loadingProfile || loadingStore,
    error: profileError || storeError,
  };
}
