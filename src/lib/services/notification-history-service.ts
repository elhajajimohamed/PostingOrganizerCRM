import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface NotificationHistoryItem {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  taskId?: string;
  timestamp: Date;
  read: boolean;
  dismissed: boolean;
}

class NotificationHistoryService {
  private static COLLECTION_NAME = 'notificationHistory';

  // Save a notification to history
  static async saveNotification(notification: Omit<NotificationHistoryItem, 'id' | 'timestamp' | 'read' | 'dismissed'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...notification,
        timestamp: serverTimestamp(),
        read: false,
        dismissed: false,
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving notification to history:', error);
      throw error;
    }
  }

  // Get notification history for a user
  static async getNotificationHistory(userId: string, limitCount: number = 50): Promise<NotificationHistoryItem[]> {
    try {
      // Use a very simple query to avoid any index requirements
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const notifications: NotificationHistoryItem[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          taskId: data.taskId,
          timestamp: data.timestamp?.toDate() || new Date(),
          read: data.read || false,
          dismissed: data.dismissed || false,
        });
      });

      // Sort by timestamp descending (client-side)
      notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply limit after sorting
      return notifications.slice(0, limitCount);
    } catch (error) {
      console.error('Error getting notification history:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.COLLECTION_NAME, notificationId);
      await updateDoc(notificationRef, {
        read: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark notification as dismissed
  static async markAsDismissed(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, this.COLLECTION_NAME, notificationId);
      await updateDoc(notificationRef, {
        dismissed: true,
      });
    } catch (error) {
      console.error('Error marking notification as dismissed:', error);
      throw error;
    }
  }

  // Delete old notifications (cleanup function)
  static async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('timestamp', '<', Timestamp.fromDate(cutoffDate)),
        where('read', '==', true),
        where('dismissed', '==', true)
      );

      const querySnapshot = await getDocs(q);
      let deletedCount = 0;

      const deletePromises = querySnapshot.docs.map(async (document) => {
        await deleteDoc(doc(db, this.COLLECTION_NAME, document.id));
        deletedCount++;
      });

      await Promise.all(deletePromises);
      return deletedCount;
    } catch (error) {
      console.error('Error deleting old notifications:', error);
      throw error;
    }
  }

  // Get unread count for a user
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('read', '==', false),
        where('dismissed', '==', false)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }
}

export { NotificationHistoryService };