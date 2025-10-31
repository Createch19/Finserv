
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
    if (!auth || !firestore) {
      setLoading(false);
      return;
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      if (firebaseUser) {
        try {
            const userDocRef = doc(firestore, 'users', firebaseUser.uid);
            const userDoc: DocumentSnapshot = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = {
                    ...userDoc.data(),
                    uid: firebaseUser.uid,
                } as User;
                setUser(userData);
            } else {
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
        } catch(error) {
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
      // onAuthStateChanged will handle the rest.
    } catch (error: any) {
      if (
        (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') &&
        defaultUsers.hasOwnProperty(email)
      ) {
        try {
          await createUserWithEmailAndPassword(auth, email, pass);
        } catch (creationError) {
          console.error('Failed to create default user:', creationError);
          throw creationError;
        }
      } else {
        console.error('Sign in error:', error);
        throw error;
      }
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
