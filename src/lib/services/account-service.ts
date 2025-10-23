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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FacebookAccount, CreateAccountData } from '@/lib/types';

const COLLECTION_NAME = 'accounts';

export class AccountService {
  // Get all accounts
  static async getAllAccounts(): Promise<FacebookAccount[]> {
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
      })) as FacebookAccount[];
    } catch (error) {
      console.error('Error getting accounts:', error);
      throw new Error('Failed to fetch accounts');
    }
  }

  // Get account by ID
  static async getAccountById(accountId: string): Promise<FacebookAccount | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, accountId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as FacebookAccount;
      }
      return null;
    } catch (error) {
      console.error('Error getting account:', error);
      throw new Error('Failed to fetch account');
    }
  }

  // Create new account
  static async createAccount(accountData: CreateAccountData): Promise<string> {
    try {
      const newAccount = {
        ...accountData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newAccount);
      return docRef.id;
    } catch (error) {
      console.error('Error creating account:', error);
      throw new Error('Failed to create account');
    }
  }

  // Update account
  static async updateAccount(accountId: string, accountData: Partial<CreateAccountData>): Promise<void> {
    try {
      const updateData = {
        ...accountData,
        updatedAt: serverTimestamp(),
      };

      const accountRef = doc(db, COLLECTION_NAME, accountId);
      await updateDoc(accountRef, updateData);
    } catch (error) {
      console.error('Error updating account:', error);
      throw new Error('Failed to update account');
    }
  }

  // Delete account
  static async deleteAccount(accountId: string): Promise<void> {
    try {
      const accountRef = doc(db, COLLECTION_NAME, accountId);
      await deleteDoc(accountRef);
    } catch (error) {
      console.error('Error deleting account:', error);
      throw new Error('Failed to delete account');
    }
  }

  // Get accounts by status
  static async getAccountsByStatus(status: 'active' | 'limited' | 'banned'): Promise<FacebookAccount[]> {
    try {
      // Use only where clause to avoid composite index requirement
      // Sort client-side instead
      const q = query(
        collection(db, COLLECTION_NAME),
        where('status', '==', status)
      );

      const querySnapshot = await getDocs(q);
      const accounts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as FacebookAccount[];

      // Sort client-side by createdAt desc
      return accounts.sort((a, b) =>
        (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
      );
    } catch (error) {
      console.error('Error getting accounts by status:', error);
      throw new Error('Failed to fetch accounts by status');
    }
  }

  // Get active accounts only
  static async getActiveAccounts(): Promise<FacebookAccount[]> {
    return this.getAccountsByStatus('active');
  }
}