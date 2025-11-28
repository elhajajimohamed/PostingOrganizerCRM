import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Group {
  id: string;
  name: string;
  url: string;
  memberCount: number;
  category?: string;
  description?: string;
  createdAt: any;
  updatedAt: any;
}

interface Account {
  id: string;
  name: string;
  profileImage?: string;
  browserType?: string;
  browser?: string;
  status: string;
  createdAt: any;
  updatedAt: any;
}

interface Text {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

interface Image {
  id: string;
  filename: string;
  url: string;
  storagePath: string;
  size: number;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

interface WeeklyPostingPlan {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  totalTasks: number;
  generatedAt: string;
  status: 'active' | 'completed' | 'cancelled';
}

interface WeeklyTask {
  id: string;
  planId: string;
  dayOfWeek: number; // 0-4 for Monday-Friday
  accountId: string;
  accountName: string;
  accountBrowser?: string;
  groupId: string;
  groupName: string;
  groupUrl: string;
  groupMemberCount: number;
  textId: string;
  textTitle: string;
  textContent: string;
  imageId?: string;
  imageUrl?: string;
  imageFilename?: string;
  scheduledTime: string;
  status: 'pending' | 'completed' | 'failed' | 'joining';
  createdAt: string;
  updatedAt: string;
}

export class GroupsPostingGeneratorService {
  private static COLLECTIONS = {
    WEEKLY_PLANS: 'weeklyPostingPlans',
    WEEKLY_TASKS: 'weeklyPostingTasks',
    ACCOUNTS: 'accountsVOIP',
    GROUPS: 'groupsVOIP',
    TEXTS: 'textsVOIP',
    IMAGES: 'imagesVOIP'
  };

  // Get current week's start and end dates (Monday to Friday)
  private static getCurrentWeekRange(): { start: Date; end: Date } {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentWeekStart = new Date(now);
    
    // Calculate Monday of current week
    if (currentDay === 0) {
      // If Sunday, go to next Monday
      currentWeekStart.setDate(now.getDate() + 1);
    } else if (currentDay > 1) {
      // If Tuesday-Friday, go back to Monday
      currentWeekStart.setDate(now.getDate() - (currentDay - 1));
    }
    // If Monday, currentWeekStart is already set correctly
    
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 4); // Friday
    currentWeekEnd.setHours(23, 59, 59, 999);
    
    return { start: currentWeekStart, end: currentWeekEnd };
  }

  // Get current week's range in ISO format for database
  private static getCurrentWeekRangeISO(): { start: string; end: string } {
    const { start, end } = this.getCurrentWeekRange();
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  // Check if a weekly plan already exists for current week
  static async hasCurrentWeekPlan(): Promise<boolean> {
    try {
      const { start } = this.getCurrentWeekRangeISO();
      const q = query(
        collection(db, this.COLLECTIONS.WEEKLY_PLANS),
        where('weekStartDate', '==', start)
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking current week plan:', error);
      return false;
    }
  }

  // Get existing weekly plan
  static async getCurrentWeekPlan(): Promise<WeeklyPostingPlan | null> {
    try {
      const { start } = this.getCurrentWeekRangeISO();
      const q = query(
        collection(db, this.COLLECTIONS.WEEKLY_PLANS),
        where('weekStartDate', '==', start)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as WeeklyPostingPlan;
    } catch (error) {
      console.error('Error getting current week plan:', error);
      return null;
    }
  }

  // Get all data from collections
  private static async getData(): Promise<{
    accounts: Account[];
    groups: Group[];
    texts: Text[];
    images: Image[];
  }> {
    try {
      const [accountsSnapshot, groupsSnapshot, textsSnapshot, imagesSnapshot] = await Promise.all([
        getDocs(query(collection(db, this.COLLECTIONS.ACCOUNTS), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, this.COLLECTIONS.GROUPS), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, this.COLLECTIONS.TEXTS), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, this.COLLECTIONS.IMAGES), orderBy('createdAt', 'desc')))
      ]);

      const accounts = accountsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter((acc: any) => {
          // Flexible account filtering - accept active, or accounts without status field
          return acc.status === 'active' || acc.status === undefined || acc.status === 'available';
        }) as Account[];

      const groups = groupsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .sort((a: any, b: any) => (b.memberCount || 0) - (a.memberCount || 0)) as Group[];

      const allTexts = textsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      console.log(`📊 [Data] Found ${allTexts.length} total texts in database`);

      const texts = allTexts.filter((text: any) => {
        // Check for content in either 'content' or 'body' field
        const content = text.content || text.body;
        const hasContent = content && content.trim().length > 0;
        console.log(`📝 [Text Filter] Text "${text.title}": hasContent=${hasContent}, contentField=${text.content ? 'content' : text.body ? 'body' : 'none'}, contentLength=${content?.length || 0}`);
        return hasContent;
      }).map((text: any) => ({
        ...text,
        content: text.content || text.body // Normalize to 'content' field
      })) as Text[];

      console.log(`📊 [Data] After filtering: ${texts.length} valid texts`);

      const images = imagesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter((img: any) => {
          // Flexible image filtering - accept active images, or images without isActive field
          return img.isActive === true || img.isActive === undefined;
        }) as Image[];

      return { accounts, groups, texts, images };
    } catch (error) {
      console.error('Error getting data:', error);
      throw error;
    }
  }

  // Remove duplicate groups (same group URL/name appearing multiple times)
  private static removeDuplicateGroups(groups: Group[]): Group[] {
    const uniqueGroups = new Map<string, Group>();

    groups.forEach(group => {
      // Create a more comprehensive key using both URL and name
      const urlKey = group.url ? group.url.toLowerCase().trim() : '';
      const nameKey = group.name ? group.name.toLowerCase().trim() : '';
      const key = urlKey || nameKey; // Prefer URL if available, fallback to name

      if (!uniqueGroups.has(key)) {
        uniqueGroups.set(key, group);
      } else {
        // Keep the one with higher member count, or if equal, the one with more complete data
        const existing = uniqueGroups.get(key)!;
        const existingMembers = existing.memberCount || 0;
        const currentMembers = group.memberCount || 0;

        if (currentMembers > existingMembers) {
          uniqueGroups.set(key, group);
        } else if (currentMembers === existingMembers) {
          // If member counts are equal, prefer the one with more complete data
          const existingCompleteness = (existing.url ? 1 : 0) + (existing.name ? 1 : 0) + (existing.memberCount ? 1 : 0);
          const currentCompleteness = (group.url ? 1 : 0) + (group.name ? 1 : 0) + (group.memberCount ? 1 : 0);

          if (currentCompleteness > existingCompleteness) {
            uniqueGroups.set(key, group);
          }
        }
      }
    });

    return Array.from(uniqueGroups.values()).sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
  }

  // Get the days remaining in the current week (weekday-aware generation)
  private static getRemainingWeekDays(): number[] {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
    
    console.log(`📅 [Algorithm] Current day: ${currentDay}, generating for remaining days`);
    
    // If it's Saturday (6) or Sunday (0), generate for full week starting Monday
    if (currentDay === 0 || currentDay === 6) {
      console.log('📅 [Algorithm] Weekend detected, generating full week (Monday-Friday)');
      return [1, 2, 3, 4, 5]; // Monday to Friday (1=Monday, 5=Friday)
    }
    
    // Convert JavaScript day (1=Monday, 2=Tuesday, etc.) to our system (1=Monday, 5=Friday)
    // We need to return values 1-5 where 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday
    const remainingDays = [];
    for (let day = currentDay; day <= 5; day++) {
      remainingDays.push(day);
    }
    
    console.log(`📅 [Algorithm] Weekday detected, generating for remaining days: [${remainingDays.join(', ')}]`);
    return remainingDays;
  }

  // Enhanced group selection with account rotation and member count prioritization
  private static selectNextGroup(
    groups: Group[],
    usedGroupIds: Set<string>,
    usedAccountIds: Set<string>,
    dayOfWeek: number,
    taskIndex: number
  ): Group | null {
    // Sort groups by member count (descending) and filter out used ones
    const availableGroups = groups
      .filter(group => !usedGroupIds.has(group.id))
      .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));

    if (availableGroups.length === 0) return null;

    // Strategy 1: Try to find a group from an account that hasn't been used today
    for (const group of availableGroups) {
      const groupAccountId = (group as any).accountId || (group as any).assigned_accounts?.[0];
      if (groupAccountId && !usedAccountIds.has(groupAccountId)) {
        return group;
      }
    }

    // Strategy 2: If no groups from unused accounts, return the highest priority available group
    return availableGroups[0] || null;
  }

  // Enhanced weekly posting plan generator with flexible task counts
  static async generateWeeklyPlan(options: {
    tasksPerDay?: number;
    startTime?: string; // Format: "09:00"
    timeInterval?: number; // Minutes between tasks
    forcePartialWeek?: boolean; // Force partial week generation
  } = {}): Promise<WeeklyPostingPlan> {
    try {
      console.log('🚀 [Algorithm] Starting SIMPLIFIED weekly plan generation...');
      const startTime = Date.now();
      
      const now = new Date();
      const currentDay = now.getDay();
      const remainingDays = this.getRemainingWeekDays();
      
      console.log(`📅 [Algorithm] Current day: ${currentDay}, remaining days: [${remainingDays.join(', ')}]`);
      
      // Check if we should generate full week or partial week
      const isFullWeek = (currentDay === 0 || currentDay === 6) || options.forcePartialWeek === false;
      console.log(`📅 [Algorithm] Is full week: ${isFullWeek}, isPartialWeek option: ${options.forcePartialWeek}`);
      
      // Check if plan already exists for the relevant days
      const plan = await this.getCurrentWeekPlan();
      if (plan && !options.forcePartialWeek) {
        // Check if the existing plan has any tasks - if it has 0 tasks, allow regeneration
        const existingTasks = await this.getCurrentWeekTasks();
        if (existingTasks.length > 0) {
          throw new Error('Weekly plan already exists for current week with tasks. Please use the existing plan or clear it first.');
        }
        console.log('📋 [Algorithm] Found existing plan with 0 tasks - will replace it');
      }

      console.log('📦 [Algorithm] Loading data from collections...');
      const { start, end } = this.getCurrentWeekRange();
      const { accounts, groups, texts, images } = await this.getData();
      
      console.log(`📊 [Algorithm] Data loaded - Accounts: ${accounts.length}, Groups: ${groups.length}, Texts: ${texts.length}, Images: ${images.length}`);

      // Simple duplicate removal and prioritize by member count
      const uniqueGroups = this.removeDuplicateGroups(groups);
      console.log(`📊 [Algorithm] After duplicate removal - Unique groups: ${uniqueGroups.length}`);
      
      // Validate data availability
      if (accounts.length === 0) throw new Error('No active accounts found');
      if (uniqueGroups.length === 0) throw new Error('No groups found');
      if (texts.length === 0) throw new Error('No active texts found');

      // Allow flexible task counts (15-20) regardless of data limitations - resources will cycle
      const defaultTasksPerDay = 15; // Default to 15 tasks per day as requested
      const tasksPerDay = options.tasksPerDay || defaultTasksPerDay;

      // Calculate optimal time interval based on tasks per day
      const startTimeStr = options.startTime || '09:00';
      const startHour = 9; // 09:00
      const endHour = 23; // 23:00 (11 PM)
      const availableHours = endHour - startHour; // 14 hours
      const timeInterval = Math.max(30, Math.floor((availableHours * 60) / (tasksPerDay - 1))); // Min 30 minutes

      console.log(`⚙️ [Algorithm] Generation config - Tasks per day: ${tasksPerDay}, Start time: ${startTimeStr}, Interval: ${timeInterval} minutes`);
      console.log(`📊 [Algorithm] Data availability - Accounts: ${accounts.length}, Groups: ${uniqueGroups.length}, Texts: ${texts.length}, Images: ${images.length}`);

      // Calculate which days to generate for
      const daysToGenerate = isFullWeek ? [1, 2, 3, 4, 5] : remainingDays;
      console.log(`📅 [Algorithm] Days to generate: [${daysToGenerate.join(', ')}]`);
      
      // Calculate total tasks
      const totalTasks = tasksPerDay * daysToGenerate.length;
      console.log(`📊 [Algorithm] Total tasks to generate: ${totalTasks}`);

      // Create or update weekly plan
      let planId: string;
      let planData: Omit<WeeklyPostingPlan, 'id'>;

      if (plan && !isFullWeek) {
        // Update existing plan for partial week
        console.log('📝 [Algorithm] Updating existing plan for partial week');
        planId = plan.id;
        planData = {
          weekStartDate: plan.weekStartDate,
          weekEndDate: plan.weekEndDate,
          totalTasks: plan.totalTasks + totalTasks,
          generatedAt: plan.generatedAt,
          status: 'active'
        };
        
        await updateDoc(doc(db, this.COLLECTIONS.WEEKLY_PLANS, planId), planData);
      } else {
        // Create new plan
        console.log('📝 [Algorithm] Creating new plan');
        planData = {
          weekStartDate: start.toISOString().split('T')[0],
          weekEndDate: end.toISOString().split('T')[0],
          totalTasks,
          generatedAt: new Date().toISOString(),
          status: 'active'
        };

        const planRef = await addDoc(collection(db, this.COLLECTIONS.WEEKLY_PLANS), planData);
        planId = planRef.id;
        console.log(`✅ [Algorithm] Plan created with ID: ${planId}`);
      }

      // Get existing tasks to avoid duplicates
      console.log('🔍 [Algorithm] Checking for existing tasks...');
      const existingTasks = planId ? await this.getCurrentWeekTasks() : [];
      const existingGroupIds = new Set(existingTasks.map(task => task.groupId));
      const existingTextIds = new Set(existingTasks.map(task => task.textId));
      const existingImageIds = new Set(existingTasks.map(task => task.imageId).filter(Boolean));

      console.log(`📊 [Algorithm] Existing tasks: ${existingTasks.length}, used groups: ${existingGroupIds.size}, used texts: ${existingTextIds.size}, used images: ${existingImageIds.size}`);

      // Generate tasks for remaining days only
      console.log('🔄 [Algorithm] Starting SIMPLE task generation...');
      const tasks: Omit<WeeklyTask, 'id'>[] = [];
      let globalTaskIndex = existingTasks.length;

      for (const dayOfWeek of daysToGenerate) {
        console.log(`📅 [Algorithm] Processing day ${dayOfWeek} (${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][dayOfWeek - 1]})...`);

        // Skip if this day already has tasks (for partial week updates)
        const dayHasTasks = existingTasks.some(task => task.dayOfWeek === dayOfWeek);
        if (dayHasTasks && !isFullWeek) {
          console.log(`⏭️ [Algorithm] Skipping day ${dayOfWeek} - already has tasks`);
          continue;
        }

        const dayDate = new Date(start);
        console.log(`📅 [Algorithm] Week start date: ${start.toDateString()}, Day of week: ${dayOfWeek}`);
        dayDate.setDate(start.getDate() + (dayOfWeek - 1)); // Adjust for Monday being day 1
        console.log(`📅 [Algorithm] Calculated day date: ${dayDate.toDateString()}`);

        // Track used group names for this day to ensure uniqueness
        const usedGroupNamesForDay = new Set<string>();

        for (let taskIndex = 0; taskIndex < tasksPerDay; taskIndex++) {
          // Calculate scheduled time
          const [hours, minutes] = startTimeStr.split(':').map(Number);
          const scheduledTime = new Date(dayDate);
          scheduledTime.setHours(hours + Math.floor((taskIndex * timeInterval) / 60),
                                (minutes + (taskIndex * timeInterval)) % 60, 0, 0);

          // Find an account that hasn't been used today (if possible)
          let account = accounts[globalTaskIndex % accounts.length];

          // Find a group that hasn't been used today (by name)
          let group: Group | null = null;
          let groupSearchIndex = 0;

          while (!group && groupSearchIndex < uniqueGroups.length) {
            const candidateGroup = uniqueGroups[(globalTaskIndex + groupSearchIndex) % uniqueGroups.length];
            const groupNameKey = candidateGroup.name.toLowerCase().trim();

            if (!usedGroupNamesForDay.has(groupNameKey)) {
              group = candidateGroup;
              usedGroupNamesForDay.add(groupNameKey);
              console.log(`✅ [Algorithm] Selected unique group for day ${dayOfWeek}: ${candidateGroup.name}`);
            } else {
              console.log(`⏭️ [Algorithm] Skipping duplicate group name for day ${dayOfWeek}: ${candidateGroup.name}`);
              groupSearchIndex++;
            }
          }

          // If we couldn't find a unique group, use the next available one (fallback)
          if (!group) {
            group = uniqueGroups[globalTaskIndex % uniqueGroups.length];
            console.log(`⚠️ [Algorithm] Fallback: Using group ${group.name} (may have duplicate name in day ${dayOfWeek})`);
          }

          const text = texts[globalTaskIndex % texts.length];
          const image = images.length > 0 ? images[globalTaskIndex % images.length] : null;

          console.log(`🔄 [Algorithm] Creating task ${globalTaskIndex + 1}: Day ${dayOfWeek}, Task ${taskIndex + 1}`);
          console.log(`   📋 Account: ${account.name}`);
          console.log(`   👥 Group: ${group.name}`);
          console.log(`   📝 Text: ${text.title}`);
          console.log(`   ⏰ Time: ${scheduledTime.toISOString()}`);

          const task: Omit<WeeklyTask, 'id'> = {
            planId,
            dayOfWeek,
            accountId: account.id,
            accountName: account.name,
            accountBrowser: account.browser,
            groupId: group.id,
            groupName: group.name,
            groupUrl: group.url,
            groupMemberCount: group.memberCount || 0,
            textId: text.id,
            textTitle: text.title,
            textContent: text.content || '',
            imageId: image?.id,
            imageUrl: image?.url,
            imageFilename: image?.filename,
            scheduledTime: scheduledTime.toISOString(),
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          tasks.push(task);

          globalTaskIndex++;

          if (taskIndex % 5 === 0) {
            console.log(`🔄 [Algorithm] Generated ${tasks.length}/${totalTasks} tasks...`);
          }
        }
      }

      console.log(`💾 [Algorithm] Generated ${tasks.length} tasks, saving to database...`);
      
      // Save all new tasks
      let savedCount = 0;
      for (const task of tasks) {
        await addDoc(collection(db, this.COLLECTIONS.WEEKLY_TASKS), task);
        savedCount++;
        if (savedCount % 10 === 0) {
          console.log(`💾 [Algorithm] Saved ${savedCount}/${tasks.length} tasks...`);
        }
      }

      const endTime = Date.now();
      console.log(`✅ Generated ${isFullWeek ? 'full' : 'partial'} weekly plan: ${totalTasks} planned tasks, ${tasks.length} actual tasks in ${endTime - startTime}ms`);

      return {
        id: planId,
        ...planData
      };
    } catch (error) {
      console.error('❌ [Algorithm] Error generating weekly plan:', error);
      throw error;
    }
  }

  // Get tasks for current week
  static async getCurrentWeekTasks(): Promise<WeeklyTask[]> {
    try {
      const plan = await this.getCurrentWeekPlan();
      if (!plan) return [];

      console.log('🔍 [Tasks] Getting tasks for plan:', plan.id);

      // Always use simple query to avoid composite index issues
      const allTasksSnapshot = await getDocs(collection(db, this.COLLECTIONS.WEEKLY_TASKS));
      const tasks = allTasksSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }) as WeeklyTask)
        .filter(task => task.planId === plan.id)
        .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

      console.log(`✅ [Tasks] Found ${tasks.length} tasks for plan ${plan.id}`);
      return tasks;
    } catch (error) {
      console.error('Error getting current week tasks:', error);
      return [];
    }
  }

  // Get today's tasks
  static async getTodaysTasks(): Promise<WeeklyTask[]> {
    try {
      const tasks = await this.getCurrentWeekTasks();
      const today = new Date();
      const todayString = today.getFullYear() + '-' +
                         String(today.getMonth() + 1).padStart(2, '0') + '-' +
                         String(today.getDate()).padStart(2, '0');

      console.log(`📅 [Today's Tasks] Filtering for date: ${todayString}`);
      console.log(`📊 [Today's Tasks] Total tasks in week: ${tasks.length}`);

      const todaysTasks = tasks.filter(task => {
        const taskDate = new Date(task.scheduledTime);
        const taskDateString = taskDate.getFullYear() + '-' +
                              String(taskDate.getMonth() + 1).padStart(2, '0') + '-' +
                              String(taskDate.getDate()).padStart(2, '0');
        return taskDateString === todayString;
      });

      console.log(`✅ [Today's Tasks] Found ${todaysTasks.length} tasks for today`);
      return todaysTasks;
    } catch (error) {
      console.error('Error getting today\'s tasks:', error);
      return [];
    }
  }

  // Update task status
  static async updateTaskStatus(taskId: string, status: 'completed' | 'failed' | 'joining', errorMessage?: string): Promise<void> {
    try {
      const taskRef = doc(db, this.COLLECTIONS.WEEKLY_TASKS, taskId);
      const updateData: any = {
        status,
        updatedAt: new Date().toISOString()
      };

      if (status === 'completed') {
        updateData.completedAt = new Date().toISOString();
      } else if (status === 'failed' && errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      await updateDoc(taskRef, updateData);
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }

  // Clear current week plan
  static async clearCurrentWeekPlan(): Promise<void> {
    try {
      const plan = await this.getCurrentWeekPlan();
      if (!plan) return;

      // Delete all tasks - use simple query to avoid composite index issues
      const tasksSnapshot = await getDocs(collection(db, this.COLLECTIONS.WEEKLY_TASKS));
      const planTasks = tasksSnapshot.docs.filter(doc => doc.data().planId === plan.id);
      console.log(`🗑️ [Clear Plan] Found ${planTasks.length} tasks to delete for plan ${plan.id}`);
      
      const deletePromises = tasksSnapshot.docs.map((document: any) =>
        deleteDoc(doc(db, this.COLLECTIONS.WEEKLY_TASKS, document.id))
      );
      
      await Promise.all(deletePromises);

      // Delete the plan
      await deleteDoc(doc(db, this.COLLECTIONS.WEEKLY_PLANS, plan.id));

      console.log('✅ Cleared current week plan and all tasks');
    } catch (error) {
      console.error('Error clearing current week plan:', error);
      throw error;
    }
  }

  // Get statistics for current week
  static async getCurrentWeekStats(): Promise<{
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    failedTasks: number;
    joiningTasks: number;
    groupsUsed: number;
    accountsUsed: number;
  }> {
    try {
      const tasks = await this.getCurrentWeekTasks();

      const stats = {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        pendingTasks: tasks.filter(t => t.status === 'pending').length,
        failedTasks: tasks.filter(t => t.status === 'failed').length,
        joiningTasks: tasks.filter(t => t.status === 'joining').length,
        groupsUsed: new Set(tasks.map(t => t.groupId)).size,
        accountsUsed: new Set(tasks.map(t => t.accountId)).size
      };

      return stats;
    } catch (error) {
      console.error('Error getting current week stats:', error);
      return {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        failedTasks: 0,
        joiningTasks: 0,
        groupsUsed: 0,
        accountsUsed: 0
      };
    }
  }
}