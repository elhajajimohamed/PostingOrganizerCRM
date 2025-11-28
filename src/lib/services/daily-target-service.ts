import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface DailyTarget {
  id: string;
  date: string; // YYYY-MM-DD format
  target: number;
  completed: number;
  createdAt: string;
  updatedAt: string;
}

export class DailyTargetService {
  private static COLLECTION = 'daily_targets';

  // Get or create daily target for a specific date
  static async getDailyTarget(date: string): Promise<DailyTarget> {
    try {
      const targetId = date; // Use date as ID
      const docRef = doc(db, this.COLLECTION, targetId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          date: data.date,
          target: data.target || 10, // Default target is 10
          completed: data.completed || 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        };
      } else {
        // Create new daily target
        const newTarget: Omit<DailyTarget, 'id'> = {
          date,
          target: 10, // Default target
          completed: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(docRef, {
          ...newTarget,
          createdAt: Timestamp.now(),
        });

        return {
          id: targetId,
          ...newTarget,
        };
      }
    } catch (error) {
      console.error('Error getting daily target:', error);
      throw error;
    }
  }

  // Update daily target progress
  static async incrementProgress(date: string, increment: number = 1): Promise<DailyTarget> {
    try {
      const targetId = date;
      const docRef = doc(db, this.COLLECTION, targetId);
      
      // First get current target
      const currentTarget = await this.getDailyTarget(date);
      
      // Update the completed count
      const newCompleted = Math.max(0, currentTarget.completed + increment);
      
      await updateDoc(docRef, {
        completed: newCompleted,
        updatedAt: new Date().toISOString(),
      });

      return {
        ...currentTarget,
        completed: newCompleted,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error incrementing daily target progress:', error);
      throw error;
    }
  }

  // Decrement daily target progress
  static async decrementProgress(date: string, decrement: number = 1): Promise<DailyTarget> {
    try {
      const targetId = date;
      const docRef = doc(db, this.COLLECTION, targetId);
      
      // First get current target
      const currentTarget = await this.getDailyTarget(date);
      
      // Update the completed count (ensure it doesn't go below 0)
      const newCompleted = Math.max(0, currentTarget.completed - decrement);
      
      await updateDoc(docRef, {
        completed: newCompleted,
        updatedAt: new Date().toISOString(),
      });

      return {
        ...currentTarget,
        completed: newCompleted,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error decrementing daily target progress:', error);
      throw error;
    }
  }

  // Set custom daily target
  static async setDailyTarget(date: string, target: number): Promise<DailyTarget> {
    try {
      const targetId = date;
      const docRef = doc(db, this.COLLECTION, targetId);
      
      await updateDoc(docRef, {
        target: Math.max(1, target), // Minimum target is 1
        updatedAt: new Date().toISOString(),
      });

      return await this.getDailyTarget(date);
    } catch (error) {
      console.error('Error setting daily target:', error);
      throw error;
    }
  }

  // Reset daily target for a new day
  static async resetDailyTarget(date: string): Promise<DailyTarget> {
    try {
      const targetId = date;
      const docRef = doc(db, this.COLLECTION, targetId);
      
      // Get current target to preserve the target number
      const currentTarget = await this.getDailyTarget(date);
      
      await updateDoc(docRef, {
        completed: 0,
        updatedAt: new Date().toISOString(),
      });

      return {
        ...currentTarget,
        completed: 0,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error resetting daily target:', error);
      throw error;
    }
  }

  // Get today's date in YYYY-MM-DD format
  static getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}