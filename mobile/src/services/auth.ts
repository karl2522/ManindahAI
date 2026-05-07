import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  getIdToken,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { UserService, UserProfile, UserRole } from './user';
import { Platform } from 'react-native';

/**
 * Authentication Service
 * 
 * Uses Firebase Auth for identity and syncs the user profile
 * into Supabase after every successful sign-in.
 */

export const AuthService = {
  /**
   * Register a new user with email and password via Firebase.
   * Also syncs the new user to the Supabase users table.
   */
  async registerWithEmail(
    email: string,
    password: string,
    name?: string,
    roles?: UserRole[]
  ): Promise<{ user: User; profile: UserProfile }> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const profile = await UserService.syncFromFirebase({
      firebase_uid: user.uid,
      email: user.email ?? email,
      name: name || user.displayName,
      roles,
    });

    return { user, profile };
  },

  /**
   * Login with email and password via Firebase.
   * Also syncs the user to the Supabase users table.
   */
  async loginWithEmail(email: string, password: string): Promise<{ user: User; profile: UserProfile }> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const profile = await UserService.syncFromFirebase({
      firebase_uid: user.uid,
      email: user.email ?? email,
      name: user.displayName,
    });

    return { user, profile };
  },

  /**
   * Login with Google OAuth (Web Only for now).
   * Also syncs the Google user to the Supabase users table.
   */
  async loginWithGoogle(): Promise<{ user: User; profile: UserProfile }> {
    if (Platform.OS !== 'web') {
      throw new Error("Google Sign-In via Popup is only supported on the Web. Native implementation requires expo-auth-session.");
    }
    
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    const profile = await UserService.syncFromFirebase({
      firebase_uid: user.uid,
      email: user.email ?? '',
      name: user.displayName,
    });

    return { user, profile };
  },

  /**
   * Login with a Google ID token (for native platforms via expo-auth-session).
   * Also syncs the Google user to the Supabase users table.
   */
  async loginWithGoogleCredential(idToken: string): Promise<{ user: User; profile: UserProfile }> {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;

    const profile = await UserService.syncFromFirebase({
      firebase_uid: user.uid,
      email: user.email ?? '',
      name: user.displayName,
    });

    return { user, profile };
  },

  /**
   * Logout from Firebase
   */
  async logout(): Promise<void> {
    await signOut(auth);
    // Best-effort Supabase sign-out — don't block or throw if offline
    supabase.auth.signOut().catch(() => {});
  },

  /**
   * Get the current user's JWT token
   */
  async getToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return await getIdToken(user);
  },

  /**
   * Get the current user
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }
};



