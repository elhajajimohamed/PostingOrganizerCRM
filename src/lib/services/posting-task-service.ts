import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PostingTask, PostingHistory, PostingText, SafetyRules } from '@/lib/types';

export class PostingTaskService {
  private static readonly TASKS_COLLECTION = 'posting_tasks';
  private static readonly HISTORY_COLLECTION = 'posting_history';
  private static readonly TEXTS_COLLECTION = 'posting_texts';
  private static readonly SAFETY_RULES_COLLECTION = 'safety_rules';

  // Task Management
  static async createTask(task: Omit<PostingTask, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, this.TASKS_COLLECTION), {
      ...task,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  }

  static async getAllTasks(): Promise<PostingTask[]> {
    const q = query(collection(db, this.TASKS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      postedAt: doc.data().postedAt?.toDate(),
    })) as PostingTask[];
  }

  static async getPendingTasks(): Promise<PostingTask[]> {
    const q = query(
      collection(db, this.TASKS_COLLECTION),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      postedAt: doc.data().postedAt?.toDate(),
    })) as PostingTask[];
  }

  static async updateTask(id: string, updates: Partial<PostingTask>): Promise<void> {
    const docRef = doc(db, this.TASKS_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      ...(updates.postedAt && { postedAt: Timestamp.fromDate(updates.postedAt) }),
    });
  }

  static async deleteTask(id: string): Promise<void> {
    await deleteDoc(doc(db, this.TASKS_COLLECTION, id));
  }

  // Smart Rotation Engine
  static async generateSmartTasks(count: number = 20): Promise<PostingTask[]> {
    const safetyRules = await this.getSafetyRules();
    const accounts = await this.getActiveAccounts();
    const groups = await this.getActiveGroups();
    const texts = await this.getAvailableTexts();
    const media = await this.getAvailableMedia();

    const tasks: PostingTask[] = [];
    const usedCombinations = new Set<string>();

    for (let i = 0; i < count; i++) {
      const task = await this.generateSingleSmartTask(
        accounts,
        groups,
        texts,
        media,
        safetyRules,
        usedCombinations
      );

      if (task) {
        tasks.push(task);
        usedCombinations.add(`${task.accountId}-${task.groupId}-${task.textId}-${task.mediaId}`);
      }
    }

    // Save all tasks
    const savedTasks: PostingTask[] = [];
    for (const task of tasks) {
      const id = await this.createTask(task);
      savedTasks.push({ ...task, id });
    }

    return savedTasks;
  }

  private static async generateSingleSmartTask(
    accounts: any[],
    groups: any[],
    texts: PostingText[],
    media: any[],
    safetyRules: SafetyRules,
    usedCombinations: Set<string>
  ): Promise<PostingTask | null> {
    // Shuffle arrays for randomization
    const shuffledAccounts = [...accounts].sort(() => Math.random() - 0.5);
    const shuffledGroups = [...groups].sort(() => Math.random() - 0.5);
    const shuffledTexts = [...texts].sort(() => Math.random() - 0.5);
    const shuffledMedia = [...media].sort(() => Math.random() - 0.5);

    for (const account of shuffledAccounts) {
      // Check account daily limit
      const accountPostsToday = await this.getAccountPostsToday(account.id);
      if (accountPostsToday >= safetyRules.maxPostsPerAccountPerDay) continue;

      for (const group of shuffledGroups) {
        // Check group cooldown
        const lastPostInGroup = await this.getLastPostInGroup(group.id);
        if (lastPostInGroup) {
          const daysSinceLastPost = (Date.now() - lastPostInGroup.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceLastPost < safetyRules.groupCooldownDays) continue;
        }

        // Check group daily limit
        const groupPostsToday = await this.getGroupPostsToday(group.id);
        if (groupPostsToday >= safetyRules.maxPostsPerGroupPerDay) continue;

        for (const text of shuffledTexts) {
          for (const mediaItem of shuffledMedia) {
            const combination = `${account.id}-${group.id}-${text.id}-${mediaItem.id}`;

            if (usedCombinations.has(combination)) continue;

            // Check if this combination was used recently by this account
            const lastUsedByAccount = await this.getLastUsedByAccount(account.id, text.id!, mediaItem.id);
            if (lastUsedByAccount) {
              const daysSinceLastUse = (Date.now() - lastUsedByAccount.getTime()) / (1000 * 60 * 60 * 24);
              if (daysSinceLastUse < 7) continue; // Avoid same content within 7 days
            }

            return {
              accountId: account.id,
              groupId: group.id,
              textId: text.id!,
              mediaId: mediaItem.id,
              status: 'pending',
              createdAt: new Date(),
              rotationScore: Math.random(), // For future optimization
            };
          }
        }
      }
    }

    return null; // No valid combination found
  }

  // History Management
  static async recordPosting(taskId: string, status: 'success' | 'failed' | 'skipped', notes?: string): Promise<void> {
    const task = await this.getTaskById(taskId);
    if (!task) return;

    await addDoc(collection(db, this.HISTORY_COLLECTION), {
      taskId,
      accountId: task.accountId,
      groupId: task.groupId,
      textId: task.textId,
      mediaId: task.mediaId,
      postedAt: Timestamp.now(),
      status,
      notes,
    });

    // Update task status
    await this.updateTask(taskId, {
      status: status === 'success' ? 'posted' : status === 'failed' ? 'failed' : 'skipped',
      postedAt: new Date(),
      notes,
    });
  }

  static async getPostingHistory(limitCount: number = 50): Promise<PostingHistory[]> {
    const q = query(collection(db, this.HISTORY_COLLECTION), orderBy('postedAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      postedAt: doc.data().postedAt?.toDate(),
    })) as PostingHistory[];
  }

  // Text Management
  static async createText(text: Omit<PostingText, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<string> {
    const docRef = await addDoc(collection(db, this.TEXTS_COLLECTION), {
      ...text,
      usageCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  }

  static async getAllTexts(): Promise<PostingText[]> {
    const q = query(collection(db, this.TEXTS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as PostingText[];
  }

  // Safety Rules Management
  static async getSafetyRules(): Promise<SafetyRules> {
    const snapshot = await getDocs(collection(db, this.SAFETY_RULES_COLLECTION));
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        ...doc.data(),
        updatedAt: doc.data().updatedAt?.toDate(),
      } as SafetyRules;
    }

    // Default rules
    return {
      delayBetweenPostsMinutes: { min: 3, max: 7 },
      groupCooldownDays: 15,
      maxPostsPerAccountPerDay: 5,
      maxPostsPerGroupPerDay: 1,
      avoidRecentWarnings: true,
      updatedAt: new Date(),
    };
  }

  static async updateSafetyRules(rules: Omit<SafetyRules, 'updatedAt'>): Promise<void> {
    const snapshot = await getDocs(collection(db, this.SAFETY_RULES_COLLECTION));
    const docRef = snapshot.empty
      ? await addDoc(collection(db, this.SAFETY_RULES_COLLECTION), rules)
      : doc(db, this.SAFETY_RULES_COLLECTION, snapshot.docs[0].id);

    await updateDoc(docRef, {
      ...rules,
      updatedAt: Timestamp.now(),
    });
  }

  // Helper methods
  private static async getTaskById(id: string): Promise<PostingTask | null> {
    const docSnap = await getDocs(query(collection(db, this.TASKS_COLLECTION), where('__name__', '==', id)));
    if (!docSnap.empty) {
      const doc = docSnap.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        postedAt: doc.data().postedAt?.toDate(),
      } as PostingTask;
    }
    return null;
  }

  private static async getActiveAccounts(): Promise<any[]> {
    try {
      const { AccountService } = await import('@/lib/services/account-service');
      return await AccountService.getAllAccounts().then(accounts => accounts.filter(a => a.status === 'active'));
    } catch (error) {
      console.error('Failed to load accounts:', error);
      return [];
    }
  }

  private static async getActiveGroups(): Promise<any[]> {
    try {
      const { GroupService } = await import('@/lib/services/group-service');
      return await GroupService.getAllGroups().then(groups => groups.filter(g => g.warningCount === 0));
    } catch (error) {
      console.error('Failed to load groups:', error);
      return [];
    }
  }

  private static async getAvailableTexts(): Promise<PostingText[]> {
    try {
      return await this.getAllTexts();
    } catch (error) {
      console.error('Failed to load texts:', error);
      return [];
    }
  }

  private static async getAvailableMedia(): Promise<any[]> {
    try {
      const { MediaService } = await import('@/lib/services/media-service');
      return await MediaService.getAllMedia();
    } catch (error) {
      console.error('Failed to load media:', error);
      return [];
    }
  }

  private static async getAccountPostsToday(accountId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const q = query(
      collection(db, this.HISTORY_COLLECTION),
      where('accountId', '==', accountId),
      where('postedAt', '>=', Timestamp.fromDate(today)),
      where('status', '==', 'success')
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  private static async getGroupPostsToday(groupId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const q = query(
      collection(db, this.HISTORY_COLLECTION),
      where('groupId', '==', groupId),
      where('postedAt', '>=', Timestamp.fromDate(today)),
      where('status', '==', 'success')
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  private static async getLastPostInGroup(groupId: string): Promise<Date | null> {
    const q = query(
      collection(db, this.HISTORY_COLLECTION),
      where('groupId', '==', groupId),
      where('status', '==', 'success'),
      orderBy('postedAt', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : snapshot.docs[0].data().postedAt?.toDate();
  }

  private static async getLastUsedByAccount(accountId: string, textId: string, mediaId: string): Promise<Date | null> {
    const q = query(
      collection(db, this.HISTORY_COLLECTION),
      where('accountId', '==', accountId),
      where('textId', '==', textId),
      where('mediaId', '==', mediaId),
      orderBy('postedAt', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : snapshot.docs[0].data().postedAt?.toDate();
  }
}