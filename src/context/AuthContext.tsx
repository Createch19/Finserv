
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
} from 'firebase/auth';
import { doc, getDoc, setDoc, DocumentSnapshot } from 'firebase/firestore';
import type { User } from '@/types';
import { useFirebase } from '@/firebase';

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
      console.log('[DEBUG] Firebase services not ready, setting loading to false.');
      setLoading(false);
      return;
    };

    console.log('[DEBUG] Setting up onAuthStateChanged listener.');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[DEBUG] onAuthStateChanged triggered.');
      setLoading(true);

      if (firebaseUser) {
        console.log(`[DEBUG] Firebase user is present. UID: ${firebaseUser.uid}, Email: ${firebaseUser.email}`);
        try {
            const userDocRef = doc(firestore, 'users', firebaseUser.uid);
            console.log(`[DEBUG] Attempting to GET document from path: ${userDocRef.path}`);
            const userDoc: DocumentSnapshot = await getDoc(userDocRef);

            if (userDoc.exists()) {
                console.log('[DEBUG] User document found in Firestore.');
                const userData = {
                    ...userDoc.data(),
                    uid: firebaseUser.uid,
                } as User;
                setUser(userData);
                console.log('[DEBUG] User state set with data:', userData);
            } else {
                console.log('[DEBUG] User document NOT found. Attempting to create it.');
                const defaultUserInfo = defaultUsers[firebaseUser.email as keyof typeof defaultUsers];
                
                if (defaultUserInfo) {
                    console.log('[DEBUG] User is a default user. Creating new profile.');
                    const newUser: User = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email!,
                        name: defaultUserInfo.name,
                        role: defaultUserInfo.role as 'admin' | 'agent'
                    };
                    console.log(`[DEBUG] Attempting to SET document at path: ${userDocRef.path}`);
                    await setDoc(userDocRef, newUser);
                    setUser(newUser);
                    console.log('[DEBUG] New user profile created and state set:', newUser);
                } else {
                    console.error("[DEBUG] CRITICAL: User document not found, and user is not a default user. Cannot proceed.");
                    setUser(null);
                }
            }
        } catch(error) {
            console.error("[DEBUG] FIRESTORE ERROR during onAuthStateChanged:", error);
            setUser(null);
        } finally {
            console.log('[DEBUG] Auth state change processing finished. Setting loading to false.');
            setLoading(false);
        }
      } else {
        console.log('[DEBUG] No Firebase user. Setting user state to null and loading to false.');
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
        console.log('[DEBUG] Cleaning up onAuthStateChanged listener.');
        unsubscribe();
    }
  }, [auth, firestore]);

  const signIn = async (email: string, pass: string) => {
    if (!auth || !firestore) {
      throw new Error('Firebase Auth/Firestore is not initialized.');
    }
    console.log('[DEBUG] signIn called. Setting loading to true.');
    setLoading(true);
    try {
      console.log('[DEBUG] Attempting signInWithEmailAndPassword...');
      await signInWithEmailAndPassword(auth, email, pass);
      console.log('[DEBUG] signInWithEmailAndPassword successful. onAuthStateChanged will handle the rest.');
      // onAuthStateChanged will handle setting the user state and final loading state
    } catch (error: any) {
      console.log('[DEBUG] signIn failed with error:', error.code);
      if (
        (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') &&
        defaultUsers.hasOwnProperty(email)
      ) {
        console.log('[DEBUG] Default user not found, attempting to create...');
        try {
          await createUserWithEmailAndPassword(auth, email, pass);
          console.log('[DEBUG] createUserWithEmailAndPassword successful. onAuthStateChanged will handle the rest.');
        } catch (creationError) {
          console.error('[DEBUG] Failed to create default user:', creationError);
          setLoading(false);
          throw creationError;
        }
      } else {
        console.error('[DEBUG] Sign in error:', error);
        setLoading(false);
        throw error;
      }
    } 
  };

  const signOut = async () => {
    if (!auth) return;
    console.log('[DEBUG] signOut called.');
    setLoading(true);
    await firebaseSignOut(auth);
    setUser(null);
    setLoading(false);
    console.log('[DEBUG] signOut finished.');
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
