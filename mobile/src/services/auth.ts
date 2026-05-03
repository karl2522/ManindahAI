import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  getIdToken,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { supabase } from '../lib/supabase';

/**
 * Authentication Service
 * 
 * Uses Firebase Auth for identity and handles the syncing of the JWT
 * with Supabase if Supabase is configured to accept Firebase tokens.
 */

export const AuthService = {
  /**
   * Register a new user with email and password via Firebase
   */
  async registerWithEmail(email: string, password: string): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  /**
   * Login with email and password via Firebase
   */
  async loginWithEmail(email: string, password: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Optionally: Sync token with Supabase here if you use Supabase custom JWT integration
    // const token = await userCredential.user.getIdToken();
    // await supabase.auth.setSession({ access_token: token, refresh_token: '' });
    
    return userCredential.user;
  },

  /**
   * Logout from Firebase
   */
  async logout(): Promise<void> {
    await signOut(auth);
    // Sign out from Supabase as well
    await supabase.auth.signOut();
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
