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
import { FacebookGroup, CreateGroupData } from '@/lib/types';

const COLLECTION_NAME = 'groupsVOIP';

export class GroupService {
  // Get all groups
  static async getAllGroups(): Promise<FacebookGroup[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastPostAt: doc.data().lastPostAt?.toDate(),
      })) as FacebookGroup[];
    } catch (error) {
      console.error('Error getting groups:', error);
      throw new Error('Failed to fetch groups');
    }
  }

  // Get group by ID
  static async getGroupById(groupId: string): Promise<FacebookGroup | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, groupId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          lastPostAt: data.lastPostAt?.toDate(),
        } as FacebookGroup;
      }
      return null;
    } catch (error) {
      console.error('Error getting group:', error);
      throw new Error('Failed to fetch group');
    }
  }

  // Create new group
  static async createGroup(groupData: CreateGroupData): Promise<string> {
    try {
      const newGroup = {
        ...groupData,
        warningCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log('Creating group with data:', newGroup);

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newGroup);
      console.log('Group created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating group:', error);
      throw new Error('Failed to create group');
    }
  }

  // Update group
  static async updateGroup(groupId: string, groupData: Partial<CreateGroupData>): Promise<void> {
    try {
      const updateData = {
        ...groupData,
        updatedAt: serverTimestamp(),
      };

      const groupRef = doc(db, COLLECTION_NAME, groupId);
      await updateDoc(groupRef, updateData);
    } catch (error) {
      console.error('Error updating group:', error);
      throw new Error('Failed to update group');
    }
  }

  // Delete group
  static async deleteGroup(groupId: string): Promise<void> {
    try {
      const groupRef = doc(db, COLLECTION_NAME, groupId);
      await deleteDoc(groupRef);
    } catch (error) {
      console.error('Error deleting group:', error);
      throw new Error('Failed to delete group');
    }
  }

  // Get groups by language
  static async getGroupsByLanguage(language: string): Promise<FacebookGroup[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('language', '==', language),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastPostAt: doc.data().lastPostAt?.toDate(),
      })) as FacebookGroup[];
    } catch (error) {
      console.error('Error getting groups by language:', error);
      throw new Error('Failed to fetch groups by language');
    }
  }

  // Update last post timestamp and warning count
  static async updatePostingInfo(groupId: string, warningCount?: number): Promise<void> {
    try {
      const updateData: any = {
        lastPostAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (warningCount !== undefined) {
        updateData.warningCount = warningCount;
      }

      const groupRef = doc(db, COLLECTION_NAME, groupId);
      await updateDoc(groupRef, updateData);
    } catch (error) {
      console.error('Error updating posting info:', error);
      throw new Error('Failed to update posting info');
    }
  }

  // Get groups with recent activity
  static async getRecentGroups(limitCount: number = 10): Promise<FacebookGroup[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('lastPostAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastPostAt: doc.data().lastPostAt?.toDate(),
      })) as FacebookGroup[];
    } catch (error) {
      console.error('Error getting recent groups:', error);
      throw new Error('Failed to fetch recent groups');
    }
  }

  // Search groups by name or tags
  static async searchGroups(searchTerm: string): Promise<FacebookGroup[]> {
    try {
      // Note: Firestore doesn't support full-text search directly
      // This is a basic implementation - in production, consider using Algolia or similar
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const groups = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastPostAt: doc.data().lastPostAt?.toDate(),
      })) as FacebookGroup[];

      // Filter groups that match the search term
      return groups.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching groups:', error);
      throw new Error('Failed to search groups');
    }
  }

  // Get active groups only
  static async getActiveGroups(): Promise<FacebookGroup[]> {
    try {
      // Use simple query to avoid composite index requirement
      // Filter for active groups client-side instead
      const q = query(collection(db, COLLECTION_NAME));

      const querySnapshot = await getDocs(q);
      const allGroups = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastPostAt: doc.data().lastPostAt?.toDate(),
      })) as FacebookGroup[];

      // Filter for active groups and sort by member count client-side
      const activeGroups = allGroups
        .filter((group: any) => group.isActive === true || group.isActive !== false)
        .sort((a: any, b: any) => (b.memberCount || 0) - (a.memberCount || 0));

      return activeGroups;
    } catch (error) {
      console.error('Error getting active groups:', error);
      throw new Error('Failed to fetch active groups');
    }
  }
}