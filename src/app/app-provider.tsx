
'use client';

import React, { useMemo } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);

  return (
    <FirebaseProvider {...firebaseServices}>
      <AuthProvider auth={firebaseServices.auth} firestore={firebaseServices.firestore}>
        {children}
      </AuthProvider>
    </FirebaseProvider>
  );
}
