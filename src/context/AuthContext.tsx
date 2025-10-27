"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@/types';
import { adminUser, agentUser } from '@/lib/demo-data'; // Using demo data

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you'd use Firebase's onAuthStateChanged here.
    // For this demo, we'll check for a "user" in localStorage to persist state.
    const storedUser = localStorage.getItem('demo-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);
  
  // Simulate sign-in
  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    // In a real app, you'd use signInWithEmailAndPassword from Firebase
    // For this demo, we'll check the email to determine the role
    let demoUser: User | null = null;
    if (email.toLowerCase() === 'admin@finserv.com') {
      demoUser = adminUser;
    } else if (email.toLowerCase() === 'agent@finserv.com') {
      demoUser = agentUser;
    }

    if (demoUser) {
      setUser(demoUser);
      localStorage.setItem('demo-user', JSON.stringify(demoUser));
    } else {
      // If email doesn't match, you might want to throw an error
      // For simplicity, we just won't log in
      console.error("Invalid demo user credentials");
    }

    setLoading(false);
    if (!demoUser) {
        throw new Error("Invalid credentials. Use 'admin@finserv.com' or 'agent@finserv.com'.");
    }
  };
  
  // Simulate sign-out
  const signOut = async () => {
    setLoading(true);
    // In a real app, you'd use signOut from Firebase
    setUser(null);
    localStorage.removeItem('demo-user');
    setLoading(false);
  };

  const value = { user, loading, signIn, signOut };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
