'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import {
  getAuth,
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

// Initialize firebase
const { auth, firestore } = initializeFirebase();

// Seed default users if they don't exist
const seedUsers = async () => {
    const usersToSeed = [
        { email: 'admin@finserv.com', name: 'Admin User', role: 'admin', uid: 'default-admin-uid' },
        { email: 'agent@finserv.com', name: 'Agent User', role: 'agent', uid: 'default-agent-uid' }
    ];
    const password = 'Finserve@123';

    for (const user of usersToSeed) {
        try {
            // Check if user document exists in Firestore
            const userDocRef = doc(firestore, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (!userDoc.exists()) {
                 try {
                    // This is a workaround for environments where auth creation might be restricted.
                    // In a real app, you'd handle this differently (e.g., admin SDK).
                    await signInWithEmailAndPassword(auth, user.email, password);
                } catch (error: any) {
                    if (error.code === 'auth/user-not-found') {
                        const userCredential = await createUserWithEmailAndPassword(auth, user.email, password);
                        const firebaseUser = userCredential.user;
                        // Now create the user profile document in Firestore
                        const newUser: User = {
                            uid: firebaseUser.uid,
                            email: user.email,
                            name: user.name,
                            role: user.role as 'admin' | 'agent',
                        };
                        await setDoc(doc(firestore, 'users', firebaseUser.uid), newUser);
                    } else if (error.code !== 'auth/wrong-password' && error.code !== 'auth/too-many-requests') {
                         console.error(`Error checking/creating user ${user.email}:`, error);
                    }
                }
            }
        } catch (error) {
             console.error(`Failed to process user ${user.email}:`, error);
        }
    }
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    seedUsers().then(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            const userDocRef = doc(firestore, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
            setUser(userDoc.data() as User);
            } else {
            // Handle case where user exists in Auth but not in Firestore
            setUser(null);
            }
        } else {
            setUser(null);
        }
        setLoading(false);
        });
        return () => unsubscribe();
    });
  }, []);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } finally {
      setLoading(false);
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
