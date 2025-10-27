
'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, DocumentSnapshot } from 'firebase/firestore';
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
    if (!auth || !firestore) {
      setLoading(false);
      return;
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
            const userDocRef = doc(firestore, 'users', firebaseUser.uid);
            const userDoc: DocumentSnapshot = await getDoc(userDocRef);

            if (userDoc.exists()) {
                // Combine auth and firestore data for the complete user profile
                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email!,
                    ...userDoc.data()
                } as User);
            } else {
                 // This can happen if the Firestore doc wasn't created yet for a default user
                const defaultUserInfo = defaultUsers[firebaseUser.email as keyof typeof defaultUsers];
                if (defaultUserInfo) {
                    const newUser: User = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email!,
                        name: defaultUserInfo.name,
                        role: defaultUserInfo.role as 'admin' | 'agent'
                    };
                    await setDoc(userDocRef, { name: newUser.name, role: newUser.role, email: newUser.email });
                    setUser(newUser);
                } else {
                    console.error("User document not found and not a default user.");
                    setUser(null);
                }
            }
        } catch(error) {
            console.error("Error fetching user document:", error);
            setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  const signIn = async (email: string, pass: string) => {
    if (!auth || !firestore) {
      throw new Error('Firebase Auth/Firestore is not initialized.');
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting the user state
    } catch (error: any) {
      if (
        (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') &&
        defaultUsers.hasOwnProperty(email)
      ) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
          const firebaseUser = userCredential.user;
          const defaultUserInfo = defaultUsers[email as keyof typeof defaultUsers];
          
          const newUser: Omit<User, 'uid'> = {
            email: firebaseUser.email!,
            name: defaultUserInfo.name,
            role: defaultUserInfo.role as 'admin' | 'agent'
          };
          const userDocRef = doc(firestore, 'users', firebaseUser.uid);
          await setDoc(userDocRef, newUser);
          // onAuthStateChanged will handle setting the user state
          
        } catch (creationError) {
          console.error('Failed to create default user:', creationError);
          setLoading(false);
          throw creationError;
        }
      } else {
        console.error('Sign in error:', error);
        setLoading(false);
        throw error;
      }
    } 
    // Loading is set to false by onAuthStateChanged
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
