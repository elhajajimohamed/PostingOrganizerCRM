'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from './types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, role?: 'admin' | 'operator') => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isOperator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Convert Firebase user to our User type
  const convertFirebaseUser = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || userData.displayName || '',
          role: userData.role || 'operator',
          createdAt: userData.createdAt?.toDate() || new Date(),
        };
      } else {
        // Create new user document if it doesn't exist
        const newUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || '',
          role: 'operator',
          createdAt: new Date(),
        };

        await setDoc(doc(db, 'users', firebaseUser.uid), {
          ...newUser,
          createdAt: serverTimestamp(),
        });

        return newUser;
      }
    } catch (error) {
      console.error('Error converting Firebase user:', error);
      return null;
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in');
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, displayName: string, role: 'admin' | 'operator' = 'operator') => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update display name
      await updateProfile(firebaseUser, { displayName });

      // Create user document in Firestore
      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName,
        role,
        createdAt: new Date(),
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...newUser,
        createdAt: serverTimestamp(),
      });
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign up');
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to logout');
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    console.log('Setting up auth state listener');
    
    // For development, check if we should bypass auth
    const isDevelopment = process.env.NODE_ENV === 'development';
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

    if (isDevelopment && bypassAuth) {
      console.log('Development mode: Attempting to bypass auth');
      
      // First try to sign in anonymously (for Firebase Console users who have it enabled)
      signInAnonymously(auth).then((userCredential) => {
        console.log('✅ Anonymous sign-in successful, user:', userCredential.user.uid);
        setFirebaseUser(userCredential.user);
        setUser({
          uid: userCredential.user.uid,
          email: '',
          displayName: 'Anonymous User',
          role: 'operator',
          createdAt: new Date(),
        });
        setLoading(false);
      }).catch((anonymousError) => {
        console.log('⚠️ Anonymous sign-in failed, using fallback for development');
        console.log('❌ Anonymous error code:', anonymousError.code);
        console.log('❌ Anonymous error message:', anonymousError.message);
        
        // If anonymous fails (usually because it's disabled in Firebase Console),
        // create a mock user for development
        console.log('🔧 Using development fallback - creating mock user');
        
        const mockUser = {
          uid: 'dev-mock-user-' + Date.now(),
          email: 'dev@example.com',
          displayName: 'Development User',
          role: 'operator' as const,
          createdAt: new Date(),
        };
        
        setUser(mockUser);
        setFirebaseUser(null); // No actual Firebase user
        setLoading(false);
        
        console.log('✅ Development fallback user created:', mockUser.uid);
      });
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser ? 'user logged in' : 'user logged out');
      if (firebaseUser) {
        setFirebaseUser(firebaseUser);
        try {
          const convertedUser = await convertFirebaseUser(firebaseUser);
          console.log('Converted user:', convertedUser);
          setUser(convertedUser);
        } catch (error) {
          console.error('Error converting user:', error);
          // Set a basic user object on error
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            role: 'operator',
            createdAt: new Date(),
          });
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
      console.log('Auth loading set to false');
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    isAdmin: user?.role === 'admin',
    isOperator: user?.role === 'operator',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
