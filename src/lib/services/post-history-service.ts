import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PostHistory } from '@/lib/types';

const COLLECTION_NAME = 'postHistory';

export class PostHistoryService {
  // Get all post history
  static async getAllPostHistory(): Promise<PostHistory[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as PostHistory[];
    } catch (error) {
      console.error('Error getting post history:', error);
      throw new Error('Failed to fetch post history');
    }
  }

  // Get post history by ID
  static async getPostHistoryById(postId: string): Promise<PostHistory | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, postId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          timestamp: data.timestamp?.toDate(),
        } as PostHistory;
      }
      return null;
    } catch (error) {
      console.error('Error getting post history:', error);
      throw new Error('Failed to fetch post history');
    }
  }

  // Create new post history entry
  static async createPostHistory(postData: {
    accountId: string;
    groupId: string;
    templateUsed?: string;
    content: string;
    notes?: string;
    operatorId: string;
  }): Promise<string> {
    try {
      const newPost = {
        ...postData,
        timestamp: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newPost);
      return docRef.id;
    } catch (error) {
      console.error('Error creating post history:', error);
      throw new Error('Failed to create post history');
    }
  }

  // Update post history
  static async updatePostHistory(postId: string, updates: Partial<PostHistory>): Promise<void> {
    try {
      const updateData: any = {
        ...updates,
      };

      // Convert timestamp if present
      if (updates.timestamp) {
        updateData.timestamp = updates.timestamp;
      }

      const postRef = doc(db, COLLECTION_NAME, postId);
      await updateDoc(postRef, updateData);
    } catch (error) {
      console.error('Error updating post history:', error);
      throw new Error('Failed to update post history');
    }
  }

  // Delete post history
  static async deletePostHistory(postId: string): Promise<void> {
    try {
      const postRef = doc(db, COLLECTION_NAME, postId);
      await deleteDoc(postRef);
    } catch (error) {
      console.error('Error deleting post history:', error);
      throw new Error('Failed to delete post history');
    }
  }

  // Get post history by account
  static async getPostHistoryByAccount(accountId: string): Promise<PostHistory[]> {
    try {
      // Use only where clause to avoid composite index requirement
      const q = query(
        collection(db, COLLECTION_NAME),
        where('accountId', '==', accountId)
      );

      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as PostHistory[];

      // Sort client-side by timestamp desc
      return posts.sort((a, b) =>
        (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)
      );
    } catch (error) {
      console.error('Error getting post history by account:', error);
      throw new Error('Failed to fetch post history by account');
    }
  }

  // Get post history by group
  static async getPostHistoryByGroup(groupId: string): Promise<PostHistory[]> {
    try {
      // Use only where clause to avoid composite index requirement
      const q = query(
        collection(db, COLLECTION_NAME),
        where('groupId', '==', groupId)
      );

      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as PostHistory[];

      // Sort client-side by timestamp desc
      return posts.sort((a, b) =>
        (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)
      );
    } catch (error) {
      console.error('Error getting post history by group:', error);
      throw new Error('Failed to fetch post history by group');
    }
  }

  // Get post history by operator
  static async getPostHistoryByOperator(operatorId: string): Promise<PostHistory[]> {
    try {
      // Use only where clause to avoid composite index requirement
      const q = query(
        collection(db, COLLECTION_NAME),
        where('operatorId', '==', operatorId)
      );

      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as PostHistory[];

      // Sort client-side by timestamp desc
      return posts.sort((a, b) =>
        (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)
      );
    } catch (error) {
      console.error('Error getting post history by operator:', error);
      throw new Error('Failed to fetch post history by operator');
    }
  }

  // Get recent post history
  static async getRecentPostHistory(limitCount: number = 50): Promise<PostHistory[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as PostHistory[];
    } catch (error) {
      console.error('Error getting recent post history:', error);
      throw new Error('Failed to fetch recent post history');
    }
  }

  // Get post history for date range
  static async getPostHistoryByDateRange(startDate: Date, endDate: Date): Promise<PostHistory[]> {
    try {
      // Use only where clauses to avoid composite index requirement
      const q = query(
        collection(db, COLLECTION_NAME),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate)
      );

      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as PostHistory[];

      // Sort client-side by timestamp desc
      return posts.sort((a, b) =>
        (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)
      );
    } catch (error) {
      console.error('Error getting post history by date range:', error);
      throw new Error('Failed to fetch post history by date range');
    }
  }

  // Get today's post history
  static async getTodayPostHistory(): Promise<PostHistory[]> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      return this.getPostHistoryByDateRange(startOfDay, endOfDay);
    } catch (error) {
      console.error('Error getting today\'s post history:', error);
      throw new Error('Failed to fetch today\'s post history');
    }
  }

  // Get post history statistics
  static async getPostHistoryStats(): Promise<{
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  }> {
    try {
      const allPosts = await this.getAllPostHistory();
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      return {
        total: allPosts.length,
        today: allPosts.filter(p => p.timestamp && p.timestamp >= startOfToday).length,
        thisWeek: allPosts.filter(p => p.timestamp && p.timestamp >= startOfWeek).length,
        thisMonth: allPosts.filter(p => p.timestamp && p.timestamp >= startOfMonth).length,
      };
    } catch (error) {
      console.error('Error getting post history stats:', error);
      return {
        total: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
      };
    }
  }

  // Search post history by content or notes
  static async searchPostHistory(searchTerm: string): Promise<PostHistory[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as PostHistory[];

      // Filter posts that match the search term
      return posts.filter(post =>
        post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching post history:', error);
      throw new Error('Failed to search post history');
    }
  }

  // Log a completed post (convenience method)
  static async logCompletedPost(
    accountId: string,
    groupId: string,
    templateUsed: string | undefined,
    content: string,
    operatorId: string,
    notes?: string
  ): Promise<string> {
    try {
      return await this.createPostHistory({
        accountId,
        groupId,
        templateUsed,
        content,
        notes,
        operatorId,
      });
    } catch (error) {
      console.error('Error logging completed post:', error);
      throw new Error('Failed to log completed post');
    }
  }
}