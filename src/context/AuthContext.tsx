
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
    console.log('[DEBUG] AuthProvider useEffect triggered. Waiting for Firebase services...');
    if (!auth || !firestore) {
      console.log('[DEBUG] Firebase services not yet available.');
      setLoading(false);
      return;
    };
    console.log('[DEBUG] Firebase services are available. Setting up onAuthStateChanged listener.');

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[DEBUG] onAuthStateChanged triggered.');
      if (firebaseUser) {
        console.log(`[DEBUG] Firebase user is present. UID: ${firebaseUser.uid}, Email: ${firebaseUser.email}`);
        setLoading(true); // Set loading while we fetch firestore data
        try {
            const userDocRef = doc(firestore, 'users', firebaseUser.uid);
            console.log(`[DEBUG] Attempting to GET document from path: ${userDocRef.path}`);
            const userDoc: DocumentSnapshot = await getDoc(userDocRef);

            if (userDoc.exists()) {
                console.log(`[DEBUG] User document found for UID: ${firebaseUser.uid}. Data:`, userDoc.data());
                const userData = {
                    uid: firebaseUser.uid,
                    ...userDoc.data()
                } as User;
                setUser(userData);
                console.log('[DEBUG] User state set with existing document data.');
            } else {
                console.log(`[DEBUG] User document NOT found for UID: ${firebaseUser.uid}. This is a new user or first login.`);
                const defaultUserInfo = defaultUsers[firebaseUser.email as keyof typeof defaultUsers];
                
                if (defaultUserInfo) {
                    console.log(`[DEBUG] User is a default user. Preparing to create user document.`);
                    const newUser: Omit<User, 'uid'> = {
                        email: firebaseUser.email!,
                        name: defaultUserInfo.name,
                        role: defaultUserInfo.role as 'admin' | 'agent'
                    };
                    console.log('[DEBUG] Attempting to SET document with data:', newUser);
                    console.log(`[DEBUG] Target path for SET: ${userDocRef.path}`);
                    await setDoc(userDocRef, newUser);
                    console.log('[DEBUG] Successfully created user document in Firestore.');
                    setUser({ uid: firebaseUser.uid, ...newUser });
                    console.log('[DEBUG] User state set after creating new document.');
                } else {
                    console.error("[DEBUG] CRITICAL: User document not found, and user is not a default user. Cannot proceed.");
                    setUser(null);
                }
            }
        } catch(error) {
            console.error("[DEBUG] FIRESTORE ERROR during onAuthStateChanged:", error);
            setUser(null);
        } finally {
            console.log('[DEBUG] Finished processing onAuthStateChanged. Setting loading to false.');
            setLoading(false);
        }
      } else {
        console.log('[DEBUG] No Firebase user is present. Setting user state to null.');
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
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting the user state
    } catch (error: any) {
      if (
        (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') &&
        defaultUsers.hasOwnProperty(email)
      ) {
        // If it's a default user that doesn't exist, create it.
        try {
          await createUserWithEmailAndPassword(auth, email, pass);
          // onAuthStateChanged will handle creating the firestore doc and setting state
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
