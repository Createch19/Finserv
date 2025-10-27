
'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from '@/types';
import { useFirebase } from '@/firebase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

const defaultUsers = {
    'admin@finserv.com': { name: 'Admin User', role: 'admin' },
    'agent@finserv.com': { name: 'Agent User', role: 'agent' }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        } else {
            // This case handles when a default user is created in auth but not yet in Firestore.
            const defaultUserInfo = defaultUsers[firebaseUser.email as keyof typeof defaultUsers];
            if (defaultUserInfo) {
                const newUser: User = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email!,
                    name: defaultUserInfo.name,
                    role: defaultUserInfo.role as 'admin' | 'agent'
                };
                await setDoc(userDocRef, newUser);
                setUser(newUser);
            } else {
                setUser(null);
            }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  const signIn = async (email: string, pass: string) => {
    if (!auth) {
      throw new Error('Firebase Auth is not initialized.');
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      // Check for specific error codes for user not found.
      // 'auth/user-not-found' is for older SDKs, 'auth/invalid-credential' can be for newer ones.
      if (
        (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') &&
        defaultUsers.hasOwnProperty(email)
      ) {
        // If it's a default user that doesn't exist, create them.
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
          const firebaseUser = userCredential.user;
          const defaultUserInfo = defaultUsers[email as keyof typeof defaultUsers];
          
          // Immediately create the Firestore document.
          const newUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            name: defaultUserInfo.name,
            role: defaultUserInfo.role as 'admin' | 'agent'
          };
          const userDocRef = doc(firestore, 'users', firebaseUser.uid);
          await setDoc(userDocRef, newUser);
          
          // Manually set the user in the state since onAuthStateChanged might not fire immediately.
          setUser(newUser);
          
        } catch (creationError) {
          console.error('Failed to create default user:', creationError);
          setLoading(false);
          throw creationError; // Re-throw creation error
        }
      } else {
        // For any other error, re-throw it.
        console.error('Sign in error:', error);
        setLoading(false);
        throw error;
      }
    } finally {
        // Loading is set to false by onAuthStateChanged in the happy path
        if (auth.currentUser) {
            setLoading(false);
        }
    }
  };

  const signOut = async () => {
    if (!auth) return;
    setLoading(true);
    await firebaseSignOut(auth);
    setUser(null);
    setLoading(false);
  };

  const value = { user, loading, signIn, signOut };

  return (
    <AuthContext.Provider value={value}>
        {children}
    </AuthContext.Provider>
  );
};
