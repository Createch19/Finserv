
'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

export function useCollection<T = any>(
  query: Query | CollectionReference | null | undefined
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    const queryId = query ? JSON.stringify(query) : 'null';
    console.error(`[useCollection] useEffect triggered. Query ID: ${queryId}`);

    if (query === null || query === undefined) {
      console.error('[useCollection] Query is null/undefined. Resetting state.');
      setData(null);
      setIsLoading(false); // Important: if no query, we are not loading.
      setError(null);
      return;
    }

    console.error('[useCollection] Setting up new snapshot listener.');
    setIsLoading(true);
    setError(null);
    setData(null);

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<DocumentData>) => {
        console.error(`[useCollection] Snapshot received. Docs found: ${snapshot.docs.length}`);
        const results: WithId<T>[] = snapshot.docs.map((doc) => ({
          ...(doc.data() as T),
          id: doc.id,
        }));
        setData(results);
        setIsLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        console.error('[useCollection] Snapshot error:', err);
        let contextualError: Error = err;
        if (err.code === 'permission-denied') {
          const path =
            query.type === 'collection'
              ? (query as CollectionReference).path
              : (query as Query)._query.path.canonicalString();
          contextualError = new FirestorePermissionError({
            operation: 'list',
            path,
          });
          errorEmitter.emit('permission-error', contextualError);
        }
        setError(contextualError);
        setIsLoading(false);
        setData(null);
      }
    );

    return () => {
      console.error('[useCollection] Unsubscribing from snapshot listener.');
      unsubscribe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(query)]);

  return { data, isLoading, error };
}
