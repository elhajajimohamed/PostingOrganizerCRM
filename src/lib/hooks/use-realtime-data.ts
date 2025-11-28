'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  limit,
  QueryConstraint,
  DocumentData,
  Query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Task } from '@/lib/types';

interface UseRealtimeDataOptions {
  collectionName: string;
  queryConstraints?: QueryConstraint[];
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  where?: { field: string; operator: any; value: any }[];
  enabled?: boolean;
}

export function useRealtimeData<T extends DocumentData>({
  collectionName,
  queryConstraints = [],
  orderBy: orderByConfig,
  where: whereConditions = [],
  enabled = true,
}: UseRealtimeDataOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query constraints
      const constraints: QueryConstraint[] = [...queryConstraints];

      // Add where conditions
      whereConditions.forEach(condition => {
        constraints.push(where(condition.field, condition.operator, condition.value));
      });

      // Add order by
      if (orderByConfig) {
        constraints.push(orderBy(orderByConfig.field, orderByConfig.direction));
      }

      // Create query
      const q = query(collection(db, collectionName), ...constraints);

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const documents = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // Convert Firestore timestamps to Date objects for Task type
              ...(data.date && { date: data.date.toDate() }),
              ...(data.doneAt && { doneAt: data.doneAt.toDate() }),
              ...(data.createdAt && { createdAt: data.createdAt.toDate() }),
            } as T;
          });

          setData(documents);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error(`Error listening to ${collectionName}:`, err);
          setError(err.message);
          setLoading(false);
        }
      );

      // Cleanup listener on unmount
      return () => unsubscribe();
    } catch (err: any) {
      console.error(`Error setting up listener for ${collectionName}:`, err);
      setError(err.message);
      setLoading(false);
    }
  }, [collectionName, JSON.stringify(queryConstraints), JSON.stringify(orderByConfig), JSON.stringify(whereConditions), enabled]);

  return { data, loading, error, refetch: () => {} };
}

// Specialized hooks for specific collections
export function useRealtimeAccounts() {
  return useRealtimeData({
    collectionName: 'accountsVOIP',
    orderBy: { field: 'createdAt', direction: 'desc' },
  });
}

export function useRealtimeGroups() {
  return useRealtimeData({
    collectionName: 'groups',
    orderBy: { field: 'createdAt', direction: 'desc' },
  });
}

export function useRealtimeTemplates() {
  return useRealtimeData({
    collectionName: 'templates',
    orderBy: { field: 'createdAt', direction: 'desc' },
  });
}

export function useRealtimeTasks(userId?: string) {
  const whereConditions = userId ? [{ field: 'assignedTo', operator: '==', value: userId }] : [];

  // Don't use orderBy when there are where conditions to avoid composite index requirement
  // The component will handle sorting client-side
  return useRealtimeData<Task>({
    collectionName: 'tasks',
    orderBy: whereConditions.length === 0 ? { field: 'date', direction: 'asc' } : undefined,
    where: whereConditions,
  });
}

export function useRealtimePostHistory(limitCount?: number) {
  // Use limit without orderBy to avoid potential issues
  const queryConstraints = limitCount ? [limit(limitCount)] : [];

  return useRealtimeData({
    collectionName: 'postHistory',
    orderBy: { field: 'timestamp', direction: 'desc' },
    queryConstraints,
  });
}

export function useRealtimeMedia(userId?: string) {
  const whereConditions = userId ? [{ field: 'uploadedBy', operator: '==', value: userId }] : [];

  // Don't use orderBy when there are where conditions to avoid composite index requirement
  // The component will handle sorting client-side if needed
  return useRealtimeData({
    collectionName: 'media',
    orderBy: whereConditions.length === 0 ? { field: 'uploadedAt', direction: 'desc' } : undefined,
    where: whereConditions,
  });
}

export function useRealtimeSettings() {
  return useRealtimeData({
    collectionName: 'settings',
    enabled: false, // Settings are usually single document, handle differently
  });
}