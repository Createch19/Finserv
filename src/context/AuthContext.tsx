
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

const defaultUsers = {
    'admin@finserv.com': { name: 'Admin User', role: 'admin' },
    'agent@finserv.com': { name: 'Agent User', role: 'agent' }
};

interface AuthProviderProps {
  children: ReactNode;
  auth: Auth;
  firestore: Firestore;
}

export const AuthProvider = ({ children, auth, firestore }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.error('[AuthContext] useEffect triggered. Auth/Firestore initialized:', !!auth, !!firestore);
    if (!auth || !firestore) {
      setLoading(false);
      return;
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.error('[AuthContext] onAuthStateChanged triggered. Firebase User:', firebaseUser?.email);
      setLoading(true);

      if (firebaseUser) {
        try {
            const userDocRef = doc(firestore, 'users', firebaseUser.uid);
            console.error('[AuthContext] Fetching user doc:', userDocRef.path);
            const userDoc: DocumentSnapshot = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = {
                    ...userDoc.data(),
                    uid: firebaseUser.uid,
                } as User;
                console.error('[AuthContext] User doc exists. Setting user:', userData);
                setUser(userData);
            } else {
                console.error('[AuthContext] User doc does not exist. Checking for default user.');
                const defaultUserInfo = defaultUsers[firebaseUser.email as keyof typeof defaultUsers];
                
                if (defaultUserInfo) {
                    const newUser: User = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email!,
                        name: defaultUserInfo.name,
                        role: defaultUserInfo.role as 'admin' | 'agent'
                    };
                    console.error('[AuthContext] Found default user. Creating doc:', newUser);
                    await setDoc(userDocRef, newUser);
                    setUser(newUser);
                } else {
                    console.error('[AuthContext] No default user found. Setting user to null.');
                    setUser(null);
                }
            }
        } catch(error) {
            console.error('[AuthContext] Error fetching/creating user doc:', error);
            setUser(null);
        } finally {
            console.error('[AuthContext] Finished auth check. Setting loading to false.');
            setLoading(false);
        }
      } else {
        console.error('[AuthContext] No firebase user. Setting user to null and loading to false.');
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
        console.error('[AuthContext] Unsubscribing from onAuthStateChanged.');
        unsubscribe();
    }
  }, [auth, firestore]);

  const signIn = async (email: string, pass: string) => {
    if (!auth || !firestore) {
      throw new Error('Firebase Auth/Firestore is not initialized.');
    }
    console.error('[AuthContext] signIn called for email:', email);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle the rest.
    } catch (error: any) {
      console.error('[AuthContext] signIn error:', error.code);
      if (
        (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') &&
        defaultUsers.hasOwnProperty(email)
      ) {
        try {
          console.error('[AuthContext] User not found, attempting to create default user.');
          await createUserWithEmailAndPassword(auth, email, pass);
        } catch (creationError) {
          console.error('[AuthContext] Failed to create default user:', creationError);
          throw creationError;
        }
      } else {
        throw error;
      }
    } finally {
        // We let onAuthStateChanged handle the final loading state
        console.error('[AuthContext] signIn finished.');
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
