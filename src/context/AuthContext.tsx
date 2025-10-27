
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
import { initializeFirebase } from '@/firebase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

const { auth, firestore } = initializeFirebase();

const defaultUsers = {
    'admin@finserv.com': { name: 'Admin User', role: 'admin' },
    'agent@finserv.com': { name: 'Agent User', role: 'agent' }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        } else {
          // If user exists in Auth but not Firestore, create Firestore doc.
          // This can happen with the default users on first login.
          const defaultUser = defaultUsers[firebaseUser.email as keyof typeof defaultUsers];
          if (defaultUser) {
              const newUser: User = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email!,
                  name: defaultUser.name,
                  role: defaultUser.role as 'admin' | 'agent'
              };
              await setDoc(userDocRef, newUser);
              setUser(newUser);
          } else {
              setUser(null); // Or handle as an unexpected state
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
        // If the user is one of our default users and doesn't exist, create them.
        if (error.code === 'auth/user-not-found' && defaultUsers[email as keyof typeof defaultUsers]) {
            try {
                await createUserWithEmailAndPassword(auth, email, pass);
                // The onAuthStateChanged listener will handle creating the Firestore doc.
            } catch (creationError) {
                 console.error("Failed to create default user:", creationError);
                 throw creationError;
            }
        } else {
            console.error("Sign in error:", error);
            throw error;
        }
    } finally {
      // setLoading(false); // onAuthStateChanged will set loading to false
    }
  };

  const signOut = async () => {
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
