import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../src/lib/firebase';
import { UserService, UserProfile } from '../src/services/user';

export default function Index() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setProfile(null);

      if (!firebaseUser) return;

      setLoadingProfile(true);
      UserService.getByFirebaseUid(firebaseUser.uid)
        .then((resolved) => {
          setProfile(resolved);
        })
        .catch(() => {
          setProfile(null);
        })
        .finally(() => setLoadingProfile(false));
    });
    return unsubscribe;
  }, []);

  if (user === undefined || loadingProfile) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (user) {
    const roles = profile?.roles ?? [];
    if (roles.includes('owner')) return <Redirect href="/(tabs)" />;
    return <Redirect href="/(customer)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
