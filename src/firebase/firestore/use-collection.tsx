
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
    const queryPath = query ? (query as any)._query?.path.canonicalString() || (query as CollectionReference).path : "null";
    console.log(`[useCollection] useEffect triggered for path: ${queryPath}`);

    if (query === null || query === undefined) {
      console.log('[useCollection] Query is null/undefined. Setting data to null and loading to false.');
      setData(null);
      // When no query is provided, it's not "loading" in the sense of an active fetch.
      // Set to false so UI can show "no data" or wait for a valid query.
      setIsLoading(false); 
      setError(null);
      return;
    }

    console.log('[useCollection] Query is valid. Setting loading to true and subscribing to snapshot.');
    setIsLoading(true);

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<DocumentData>) => {
        console.log(`[useCollection] Snapshot received for path: ${queryPath}. Doc count: ${snapshot.docs.length}`);
        const results: WithId<T>[] = snapshot.docs.map((doc) => ({
          ...(doc.data() as T),
          id: doc.id,
        }));
        setData(results);
        setIsLoading(false);
        setError(null);
        console.log('[useCollection] Data set, loading is false.');
      },
      (err: FirestoreError) => {
        console.error(`[useCollection] Snapshot error for path: ${queryPath}`, err);
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
        console.log('[useCollection] Error occurred, loading is false.');
      }
    );

    return () => {
      console.log(`[useCollection] Unsubscribing from snapshot for path: ${queryPath}`);
      unsubscribe();
    }
  }, [query]);

  return { data, isLoading, error };
}
