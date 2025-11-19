
'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  Auth,
  Firestore,
} from 'firebase/auth';
import { doc, getDoc, setDoc, DocumentSnapshot, collection } from 'firebase/firestore';
import type { User } from '@/types';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  updatePassword: (currentPass: string, newPass: string) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: ReactNode;
  auth: Auth;
  firestore: Firestore;
}

export const AuthProvider = ({ children, auth, firestore }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
      setLoading(false);
      return;
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (firebaseUser) {
        try {
            // Force refresh the token to get the latest custom claims
            const idTokenResult = await firebaseUser.getIdTokenResult(true);
            const claims = idTokenResult.claims;

            const userDocRef = doc(firestore, 'users', firebaseUser.uid);
            const userDoc: DocumentSnapshot = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const docData = userDoc.data();
                // Construct the user object by merging claims and firestore data.
                // Claims are the source of truth for roles and company, but fallback to doc for stability.
                const userData: User = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email!,
                    name: docData.name,
                    role: claims.role || docData.role,
                    companyId: claims.companyId || docData.companyId,
                };
                setUser(userData);
            } else {
                 // User exists in Auth but not Firestore. This case should be handled
                 // by a backend provisioning function, so we log an error.
                 console.error("User document not found for authenticated user:", firebaseUser.uid);
                 setUser(null);
            }
        } catch(error) {
            console.error("Error fetching user data:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
        unsubscribe();
    }
  }, [auth, firestore]);

  const signIn = async (email: string, pass: string) => {
    if (!auth || !firestore) {
      throw new Error('Firebase Auth/Firestore is not initialized.');
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle fetching user doc and claims.
    } catch (error: any) {
        // Don't attempt to create user on client-side anymore
        console.error("Sign in failed:", error);
        throw error;
    } finally {
        // We let onAuthStateChanged handle the final loading state
    }
  };

  const signOut = async () => {
    if (!auth) return;
    setLoading(true);
    await firebaseSignOut(auth);
    setUser(null);
    setLoading(false);
  };

  const updatePasswordHandler = async (currentPass: string, newPass: string) => {
    if (!auth || !auth.currentUser) {
        throw new Error("User not authenticated.");
    }
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email!, currentPass);

    try {
        await reauthenticateWithCredential(user, credential);
        await firebaseUpdatePassword(user, newPass);
    } catch(error: any) {
        console.error("Password update error:", error);
        if(error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            throw new Error("The current password you entered is incorrect.");
        }
        throw new Error("An error occurred while changing your password.");
    }
  }

  const value = { user, loading, signIn, signOut, updatePassword: updatePasswordHandler };
  
  return (
    <AuthContext.Provider value={value}>
        {children}
    </AuthContext.Provider>
  );
};
