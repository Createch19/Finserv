
'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

export function useDoc<T = any>(
  docRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (docRef === null || docRef === undefined) {
      setData(null);
      // If no docRef is provided, we are not actively loading.
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          const docData = { ...(snapshot.data() as T), id: snapshot.id };
          setData(docData);
        } else {
          // Document does not exist
          setData(null);
        }
        setIsLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        let contextualError: Error = err;
        if (err.code === 'permission-denied') {
          contextualError = new FirestorePermissionError({
            operation: 'get',
            path: docRef.path,
          });
          errorEmitter.emit('permission-error', contextualError);
        }
        setError(contextualError);
        setIsLoading(false);
        setData(null);
      }
    );

    return () => unsubscribe();
  }, [docRef]);

  return { data, isLoading, error };
}
