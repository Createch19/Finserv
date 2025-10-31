
'use client';

import React, { type ReactNode } from 'react';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * @deprecated This component is deprecated and will be removed. 
 * Please use AppProvider in `app/app-provider.tsx` at the root layout instead.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  console.warn("FirebaseClientProvider is deprecated. Please use AppProvider instead.");
  return <>{children}</>;
}
