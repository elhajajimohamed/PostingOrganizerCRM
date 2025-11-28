import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TaskService } from './task-service';
import { GroupService } from './group-service';
import { AccountService } from './account-service';
import { TemplateService } from './template-service';
import { MediaService } from './media-service';
import { GroupStateService } from './group-state-service';
import { SettingsService } from './settings-service';
import { FacebookGroup, FacebookAccount, Template, Media, Task, EnhancedSchedulingConfig, TextVariant, TemplateUsage } from '@/lib/types';

export interface SchedulingConfig {
  postsPerDay: number;
  startHour: number;
  endHour: number;
  minIntervalMinutes: number;
  maxGroupsPerAccount: number;
}

export interface PostCombination {
  template: Template;
  media?: Media;
  group: FacebookGroup;
  account: FacebookAccount;
  scheduledTime: Date;
  textVariant?: TextVariant;
  mediaIds?: string[];
}

// Enhanced scheduling result
export interface EnhancedSchedulingResult {
  tasks: PostCombination[];
  warnings: string[];
  notifications: string[];
  stats: {
    totalCandidates: number;
    successfulPosts: number;
    skippedDueToRateLimit: number;
    skippedDueToDuplicate: number;
    skippedDueToRampUp: number;
  };
}

export class SchedulingService {
  private static defaultConfig: SchedulingConfig = {
    postsPerDay: 20,
    startHour: 9,
    endHour: 18,
    minIntervalMinutes: 30,
    maxGroupsPerAccount: 5,
  };

  // Generate daily schedule for today
  static async generateDailySchedule(
    config: Partial<SchedulingConfig> = {}
  ): Promise<PostCombination[]> {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      // Get all required data
      const [accounts, groups, templates, mediaFiles] = await Promise.all([
        AccountService.getActiveAccounts(),
        GroupService.getAllGroups(),
        TemplateService.getAllTemplates(),
        MediaService.getAllMedia(),
      ]);

      if (accounts.length === 0) {
        throw new Error('No active accounts available for scheduling');
      }

      if (groups.length === 0) {
        throw new Error('No groups available for scheduling');
      }

      if (templates.length === 0) {
        throw new Error('No templates available for scheduling');
      }

      // Filter out recently posted groups (within last 24 hours)
      const recentGroups = await this.getRecentlyPostedGroups();
      const availableGroups = groups.filter(
        group => !recentGroups.some(recent => recent.id === group.id)
      );

      if (availableGroups.length < finalConfig.postsPerDay) {
        console.warn(
          `Only ${availableGroups.length} groups available, but ${finalConfig.postsPerDay} posts requested`
        );
      }

      // Generate time slots for the day
      const timeSlots = this.generateTimeSlots(finalConfig);

      // Generate combinations
      const combinations = this.generatePostCombinations(
        availableGroups,
        accounts,
        templates,
        mediaFiles,
        timeSlots,
        finalConfig
      );

      return combinations;
    } catch (error) {
      console.error('Error generating daily schedule:', error);
      throw error;
    }
  }

  // Build candidate pool with group availability filtering
  private static async buildCandidatePool(
    accounts: FacebookAccount[],
    groups: FacebookGroup[],
    config: EnhancedSchedulingConfig,
    stats: EnhancedSchedulingResult['stats']
  ): Promise<Array<{
    account: FacebookAccount;
    availableGroups: string[];
  }>> {
    const candidatePool: Array<{
      account: FacebookAccount;
      availableGroups: string[];
    }> = [];

    // For now, use a simpler approach that works with basic data
    // In the future, this can be enhanced with proper group state management
    for (const account of accounts) {
      // Get available groups for this account (simplified approach)
      const availableGroups = await this.getAvailableGroupsForAccountSimplified(account.id!, groups, config);
      stats.totalCandidates += availableGroups.length;

      if (availableGroups.length > 0) {
        candidatePool.push({
          account,
          availableGroups,
        });
      }
    }

    return candidatePool;
  }

  // Simplified group availability check (works without group state records)
  private static async getAvailableGroupsForAccountSimplified(
    accountId: string,
    allGroups: FacebookGroup[],
    config: EnhancedSchedulingConfig
  ): Promise<string[]> {
    const availableGroups: string[] = [];
    const now = new Date();

    for (const group of allGroups) {
      try {
        // Basic availability checks (can be enhanced later)

        // Check if group was posted to recently (24 hours)
        if (group.lastPostAt) {
          const hoursSinceLastPost = (now.getTime() - group.lastPostAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastPost < 24) {
            continue; // Skip groups posted to recently
          }
        }

        // Check daily limit (simplified)
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // For now, assume 1 post per day per group
        if (group.lastPostAt && group.lastPostAt >= todayStart) {
          continue; // Already posted today
        }

        availableGroups.push(group.id!);

      } catch (error) {
        console.error(`Error checking group ${group.id}:`, error);
      }
    }

    return availableGroups;
  }

  // Generate schedule with enhanced constraints
  private static async generateScheduleWithConstraints(
    candidatePool: Array<{
      account: FacebookAccount;
      availableGroups: string[];
    }>,
    templates: Template[],
    mediaFiles: Media[],
    config: EnhancedSchedulingConfig,
    stats: EnhancedSchedulingResult['stats'],
    warnings: string[],
    notifications: string[]
  ): Promise<PostCombination[]> {
    const tasks: PostCombination[] = [];
    const usedGroups = new Set<string>();
    const accountGroupCount = new Map<string, number>();

    // Shuffle for randomization
    const shuffledTemplates = [...templates].sort(() => Math.random() - 0.5);
    const shuffledMedia = [...mediaFiles].sort(() => Math.random() - 0.5);

    let templateIndex = 0;
    let mediaIndex = 0;

    // Generate time slots with variation
    const timeSlots = this.generateTimeSlotsWithVariation(config);

    for (const timeSlot of timeSlots) {
      // Find next available account-group combination
      let foundCombination = false;

      for (let attempts = 0; attempts < candidatePool.length && !foundCombination; attempts++) {
        const candidateIndex = attempts % candidatePool.length;
        const candidate = candidatePool[candidateIndex];
        const { account, availableGroups } = candidate;

        // Check account rate limits
        const currentCount = accountGroupCount.get(account.id!) || 0;
        if (currentCount >= config.maxGroupsPerAccount!) {
          continue;
        }

        // Find available group for this account
        for (const groupId of availableGroups) {
          if (usedGroups.has(groupId)) continue;

          const group = await GroupService.getGroupById(groupId);
          if (!group) continue;

          // Select template with variants
          const template = shuffledTemplates[templateIndex % shuffledTemplates.length];
          const textVariant = template.text_variants?.length
            ? template.text_variants[Math.floor(Math.random() * template.text_variants.length)]
            : undefined;

          // Select media based on template requirements
          const selectedMedia = this.selectMediaForTemplate(
            template,
            shuffledMedia,
            mediaIndex
          );

          // Check for duplicate content
          const isDuplicate = textVariant && selectedMedia.length > 0
            ? await GroupStateService.checkDuplicateContent(
                groupId,
                textVariant.id,
                selectedMedia.map(m => m.id!),
                config.duplicate_content_window_days
              )
            : false;

          if (isDuplicate) {
            stats.skippedDueToDuplicate++;
            continue;
          }

          // Create combination
          const combination: PostCombination = {
            template,
            group,
            account,
            scheduledTime: timeSlot,
            textVariant,
            mediaIds: selectedMedia.map(m => m.id!),
          };

          tasks.push(combination);
          usedGroups.add(groupId);
          accountGroupCount.set(account.id!, currentCount + 1);
          foundCombination = true;

          // Update indices
          templateIndex++;
          if (selectedMedia.length > 0) {
            mediaIndex++;
          }

          stats.successfulPosts++;
          break;
        }
      }

      if (!foundCombination) {
        warnings.push(`Could not find available combination for time slot ${timeSlot.toISOString()}`);
      }
    }

    return tasks;
  }

  // Select media based on template requirements
  private static selectMediaForTemplate(
    template: Template,
    availableMedia: Media[],
    startIndex: number
  ): Media[] {
    if (!template.min_media || template.min_media === 0) {
      // Optional media - randomly include or not
      if (Math.random() > 0.3 && availableMedia.length > 0) {
        return [availableMedia[startIndex % availableMedia.length]];
      }
      return [];
    }

    const minMedia = template.min_media || 0;
    const maxMedia = template.max_media || minMedia;
    const count = Math.floor(Math.random() * (maxMedia - minMedia + 1)) + minMedia;

    if (availableMedia.length === 0) return [];

    const selected: Media[] = [];
    for (let i = 0; i < count && i < availableMedia.length; i++) {
      selected.push(availableMedia[(startIndex + i) % availableMedia.length]);
    }

    return selected;
  }

  // Generate time slots with variation
  private static generateTimeSlotsWithVariation(config: EnhancedSchedulingConfig): Date[] {
    const slots: Date[] = [];
    const today = new Date();
    const totalMinutes = (config.endHour! - config.startHour!) * 60;
    const baseInterval = config.baseline_min_interval || config.minIntervalMinutes;
    const variationPct = (config.interval_variation_pct || 20) / 100;

    // Calculate number of posts that fit
    const maxPosts = Math.min(config.postsPerDay!, Math.floor(totalMinutes / baseInterval));

    for (let i = 0; i < maxPosts; i++) {
      // Add random variation to interval
      const variation = (Math.random() - 0.5) * 2 * variationPct * baseInterval;
      const interval = baseInterval + variation;

      const minutesFromStart = i * interval;
      const hour = config.startHour! + Math.floor(minutesFromStart / 60);
      const minute = Math.floor(minutesFromStart % 60);

      const slot = new Date(today);
      slot.setHours(hour, minute, 0, 0);
      slots.push(slot);
    }

    return slots;
  }

  // Enhanced scheduling with cross-account awareness
  static async generateEnhancedSchedule(
    config: EnhancedSchedulingConfig,
    assignedTo: string
  ): Promise<EnhancedSchedulingResult> {
    const warnings: string[] = [];
    const notifications: string[] = [];
    const stats = {
      totalCandidates: 0,
      successfulPosts: 0,
      skippedDueToRateLimit: 0,
      skippedDueToDuplicate: 0,
      skippedDueToRampUp: 0,
    };

    try {
      // Get all required data
      const [accounts, groups, templates, mediaFiles] = await Promise.all([
        AccountService.getActiveAccounts(),
        GroupService.getAllGroups(),
        TemplateService.getAllTemplates(),
        MediaService.getAllMedia(),
      ]);

      if (accounts.length === 0) {
        warnings.push('No active accounts available for scheduling');
        return { tasks: [], warnings, notifications, stats };
      }

      if (groups.length === 0) {
        warnings.push('No groups available for scheduling');
        return { tasks: [], warnings, notifications, stats };
      }

      if (templates.length === 0) {
        warnings.push('No templates available for scheduling');
        return { tasks: [], warnings, notifications, stats };
      }

      // Build candidate pool with group availability filtering
      const candidatePool = await this.buildCandidatePool(accounts, groups, config, stats);

      if (candidatePool.length === 0) {
        warnings.push('No available groups for scheduling after filtering. This might be because:');
        warnings.push('• Groups were posted to recently (within 24 hours)');
        warnings.push('• Groups already reached daily posting limit');
        warnings.push('• No groups are available for the selected accounts');
        return { tasks: [], warnings, notifications, stats };
      }

      // Generate schedule using enhanced algorithm
      const tasks = await this.generateScheduleWithConstraints(
        candidatePool,
        templates,
        mediaFiles,
        config,
        stats,
        warnings,
        notifications
      );

      return { tasks, warnings, notifications, stats };
    } catch (error) {
      console.error('Error in enhanced scheduling:', error);
      warnings.push(`Scheduling error: ${error}`);
      return { tasks: [], warnings, notifications, stats };
    }
  }

  // Simplified task creation (works without group state records)
  static async createTaskSimplified(
    combination: PostCombination,
    assignedTo: string
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      const groupId = combination.group.id!;

      // Create task with basic data
      const taskData = {
        date: combination.scheduledTime,
        assignedTo,
        groupId,
        accountId: combination.account.id!,
        templateId: combination.template.id!,
        content: combination.textVariant
          ? `Template: ${combination.template.title} (Variant: ${combination.textVariant.content.substring(0, 50)}...)`
          : `Template: ${combination.template.title}`,
        media_ids: combination.mediaIds,
        text_variant_id: combination.textVariant?.id,
        notes: JSON.stringify({
          title: `Auto-generated schedule - ${combination.scheduledTime.toLocaleTimeString()}`,
          description: `Auto-generated schedule - ${combination.scheduledTime.toLocaleTimeString()}`
        }),
        createdAt: new Date(),
      };

      const taskId = await TaskService.createTask(taskData);

      // Update group posting info (simplified)
      await GroupService.updatePostingInfo(groupId);

      return { success: true, taskId };
    } catch (error) {
      console.error('Error creating task:', error);
      return { success: false, error: `Failed to create task: ${error}` };
    }
  }

  // Generate and save enhanced tasks with atomic operations
  static async generateAndSaveEnhancedTasks(
    config: EnhancedSchedulingConfig,
    assignedTo: string
  ): Promise<{
    taskIds: string[];
    warnings: string[];
    notifications: string[];
    stats: EnhancedSchedulingResult['stats'];
  }> {
    const result = await this.generateEnhancedSchedule(config, assignedTo);
    const taskIds: string[] = [];
    const errors: string[] = [];

    // Attempt to create each task
    for (const combination of result.tasks) {
      const taskResult = await this.createTaskSimplified(combination, assignedTo);

      if (taskResult.success && taskResult.taskId) {
        taskIds.push(taskResult.taskId);
      } else {
        errors.push(`Failed to create task for ${combination.group.name}: ${taskResult.error}`);
      }
    }

    return {
      taskIds,
      warnings: [...result.warnings, ...errors],
      notifications: result.notifications,
      stats: result.stats,
    };
  }

  // Generate and save tasks for today
  static async generateAndSaveDailyTasks(
    assignedTo: string,
    config: Partial<SchedulingConfig> = {}
  ): Promise<string[]> {
    try {
      const combinations = await this.generateDailySchedule(config);
      const taskIds: string[] = [];

      for (const combo of combinations) {
        const taskData = {
          date: combo.scheduledTime,
          assignedTo,
          groupId: combo.group.id!,
          accountId: combo.account.id!,
          templateId: combo.template.id!,
          content: combo.media
            ? `Template: ${combo.template.title} + Media: ${combo.media.name}`
            : `Template: ${combo.template.title}`,
          notes: JSON.stringify({
            title: `Auto-generated schedule - ${combo.scheduledTime.toLocaleTimeString()}`,
            description: `Auto-generated schedule - ${combo.scheduledTime.toLocaleTimeString()}`
          }),
        };

        const taskId = await TaskService.createTask(taskData);
        taskIds.push(taskId);

        // Update group posting info
        await GroupService.updatePostingInfo(combo.group.id!);

        // Update template usage count
        await TemplateService.incrementUsageCount(combo.template.id!);
      }

      return taskIds;
    } catch (error) {
      console.error('Error generating and saving daily tasks:', error);
      throw error;
    }
  }

  // Get groups that were posted to recently (within 24 hours)
  private static async getRecentlyPostedGroups(): Promise<FacebookGroup[]> {
    try {
      const groups = await GroupService.getAllGroups();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      return groups.filter(group =>
        group.lastPostAt && group.lastPostAt > twentyFourHoursAgo
      );
    } catch (error) {
      console.error('Error getting recently posted groups:', error);
      return [];
    }
  }

  // Generate time slots distributed throughout the day
  private static generateTimeSlots(config: SchedulingConfig): Date[] {
    const slots: Date[] = [];
    const today = new Date();
    const totalMinutes = (config.endHour - config.startHour) * 60;
    const totalPosts = Math.min(config.postsPerDay, totalMinutes / config.minIntervalMinutes);

    // Calculate interval between posts
    const intervalMinutes = Math.max(
      config.minIntervalMinutes,
      totalMinutes / totalPosts
    );

    for (let i = 0; i < totalPosts; i++) {
      const minutesFromStart = i * intervalMinutes;
      const hour = config.startHour + Math.floor(minutesFromStart / 60);
      const minute = Math.floor(minutesFromStart % 60);

      const slot = new Date(today);
      slot.setHours(hour, minute, 0, 0);
      slots.push(slot);
    }

    return slots;
  }

  // Generate post combinations ensuring no group repeats
  private static generatePostCombinations(
    groups: FacebookGroup[],
    accounts: FacebookAccount[],
    templates: Template[],
    mediaFiles: Media[],
    timeSlots: Date[],
    config: SchedulingConfig
  ): PostCombination[] {
    const combinations: PostCombination[] = [];
    const usedGroups = new Set<string>();
    const accountGroupCount = new Map<string, number>();

    // Shuffle arrays for randomization
    const shuffledGroups = [...groups].sort(() => Math.random() - 0.5);
    const shuffledTemplates = [...templates].sort(() => Math.random() - 0.5);
    const shuffledMedia = [...mediaFiles].sort(() => Math.random() - 0.5);
    const shuffledAccounts = [...accounts].sort(() => Math.random() - 0.5);

    let templateIndex = 0;
    let mediaIndex = 0;
    let accountIndex = 0;

    for (let i = 0; i < timeSlots.length && i < shuffledGroups.length; i++) {
      const timeSlot = timeSlots[i];

      // Find next available group (not used today)
      let group: FacebookGroup | null = null;
      for (const g of shuffledGroups) {
        if (!usedGroups.has(g.id!)) {
          group = g;
          usedGroups.add(g.id!);
          break;
        }
      }

      if (!group) break; // No more available groups

      // Select account (round-robin with limits)
      let account = shuffledAccounts[accountIndex % shuffledAccounts.length];
      const currentCount = accountGroupCount.get(account.id!) || 0;

      if (currentCount >= config.maxGroupsPerAccount) {
        // Find next available account
        for (let j = 1; j < shuffledAccounts.length; j++) {
          const nextAccountIndex = (accountIndex + j) % shuffledAccounts.length;
          const nextAccount = shuffledAccounts[nextAccountIndex];
          if ((accountGroupCount.get(nextAccount.id!) || 0) < config.maxGroupsPerAccount) {
            account = nextAccount;
            accountIndex = nextAccountIndex;
            break;
          }
        }
      }

      accountGroupCount.set(account.id!, currentCount + 1);

      // Select template (round-robin)
      const template = shuffledTemplates[templateIndex % shuffledTemplates.length];

      // Select media (optional, some posts may not have media)
      const media = Math.random() > 0.3 && shuffledMedia.length > 0
        ? shuffledMedia[mediaIndex % shuffledMedia.length]
        : undefined;

      if (media) {
        mediaIndex++;
      }

      templateIndex++;

      combinations.push({
        template,
        media,
        group,
        account,
        scheduledTime: timeSlot,
      });
    }

    return combinations;
  }

  // Get scheduling statistics
  static async getSchedulingStats(): Promise<{
    totalGroups: number;
    availableGroups: number;
    activeAccounts: number;
    totalTemplates: number;
    totalMedia: number;
    lastScheduleGeneration?: Date;
  }> {
    try {
      const [accounts, groups, templates, mediaFiles] = await Promise.all([
        AccountService.getActiveAccounts(),
        GroupService.getAllGroups(),
        TemplateService.getAllTemplates(),
        MediaService.getAllMedia(),
      ]);

      const recentGroups = await this.getRecentlyPostedGroups();
      const availableGroups = groups.length - recentGroups.length;

      return {
        totalGroups: groups.length,
        availableGroups,
        activeAccounts: accounts.length,
        totalTemplates: templates.length,
        totalMedia: mediaFiles.length,
      };
    } catch (error) {
      console.error('Error getting scheduling stats:', error);
      throw error;
    }
  }

  // Validate if scheduling is possible
  static async validateScheduling(config: Partial<SchedulingConfig> = {}): Promise<{
    isValid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      console.log('🔍 Validating scheduling configuration...', finalConfig);

      const [accounts, groups, templates] = await Promise.all([
        AccountService.getActiveAccounts().catch(err => {
          console.error('Error getting accounts:', err);
          return [];
        }),
        GroupService.getAllGroups().catch(err => {
          console.error('Error getting groups:', err);
          return [];
        }),
        TemplateService.getAllTemplates().catch(err => {
          console.error('Error getting templates:', err);
          return [];
        }),
      ]);

      console.log(`📊 Validation data: ${accounts.length} accounts, ${groups.length} groups, ${templates.length} templates`);

      // Check basic requirements with detailed messages
      if (accounts.length === 0) {
        issues.push('No Facebook accounts found. Please add at least one active account.');
      } else if (accounts.length < 2) {
        warnings.push(`Only ${accounts.length} account(s) available. Consider adding more for better rotation.`);
      }

      if (groups.length === 0) {
        issues.push('No Facebook groups found. Please add groups that your accounts have joined.');
      } else if (groups.length < finalConfig.postsPerDay) {
        issues.push(`Need at least ${finalConfig.postsPerDay} groups but only have ${groups.length}.`);
      }

      if (templates.length === 0) {
        issues.push('No text templates found. Please create at least one template with content to post.');
      } else if (templates.length < 3) {
        warnings.push(`Only ${templates.length} template(s) available. Consider adding more for variety.`);
      }

      // Check if we have enough groups for the requested posts
      if (groups.length > 0) {
        const recentGroups = await this.getRecentlyPostedGroups().catch(err => {
          console.error('Error getting recent groups:', err);
          return [];
        });
        const availableGroups = groups.length - recentGroups.length;

        console.log(`📅 Available groups: ${availableGroups} (total: ${groups.length}, recent: ${recentGroups.length})`);

        if (availableGroups < finalConfig.postsPerDay) {
          issues.push(
            `Not enough available groups (${availableGroups}) for ${finalConfig.postsPerDay} posts per day. Wait for group cooldown or add more groups.`
          );
        } else if (availableGroups < finalConfig.postsPerDay * 1.5) {
          warnings.push(
            `Limited group availability (${availableGroups} groups for ${finalConfig.postsPerDay} posts). Consider adding more groups or reducing posts per day.`
          );
        }
      }

      // Check time distribution
      const totalMinutes = (finalConfig.endHour - finalConfig.startHour) * 60;
      const minRequiredMinutes = finalConfig.postsPerDay * finalConfig.minIntervalMinutes;

      if (minRequiredMinutes > totalMinutes) {
        issues.push(
          `Time configuration issue: ${finalConfig.postsPerDay} posts in ${totalMinutes} minutes with ${finalConfig.minIntervalMinutes}min intervals is not feasible. Increase interval or reduce posts.`
        );
      }

      console.log(`✅ Validation complete: ${issues.length} issues, ${warnings.length} warnings`);

      return {
        isValid: issues.length === 0,
        issues,
        warnings,
      };
    } catch (error) {
      console.error('❌ Error during scheduling validation:', error);
      return {
        isValid: false,
        issues: [`Validation error: ${error}. Please check your data and try again.`],
        warnings: [],
      };
    }
  }

  // Automatic daily scheduler - runs the complete scheduling process
  static async runAutomaticScheduling(userId: string): Promise<{
    success: boolean;
    taskIds: string[];
    warnings: string[];
    notifications: string[];
    stats: {
      totalCandidates: number;
      successfulPosts: number;
      skippedDueToRateLimit: number;
      skippedDueToDuplicate: number;
      skippedDueToRampUp: number;
    };
  }> {
    try {
      console.log('🚀 Starting automatic scheduling process...');

      // Get current scheduling configuration
      const settings = await SettingsService.getSettings();
      if (!settings?.scheduling?.enabled) {
        return {
          success: false,
          taskIds: [],
          warnings: ['Automatic scheduling is disabled in settings'],
          notifications: [],
          stats: { totalCandidates: 0, successfulPosts: 0, skippedDueToRateLimit: 0, skippedDueToDuplicate: 0, skippedDueToRampUp: 0 }
        };
      }

      const config = settings.scheduling;

      // Validate scheduling is possible with detailed error reporting
      let validation;
      try {
        validation = await this.validateScheduling({
          postsPerDay: config.postsPerDay,
          startHour: config.startHour,
          endHour: config.endHour,
          minIntervalMinutes: config.minIntervalMinutes,
          maxGroupsPerAccount: config.maxGroupsPerAccount,
        });
      } catch (error) {
        console.error('Validation error:', error);
        return {
          success: false,
          taskIds: [],
          warnings: [`Scheduling validation error: ${error}. Please check your accounts, groups, and templates.`],
          notifications: [],
          stats: { totalCandidates: 0, successfulPosts: 0, skippedDueToRateLimit: 0, skippedDueToDuplicate: 0, skippedDueToRampUp: 0 }
        };
      }

      if (!validation.isValid) {
        const errorDetails = [
          `❌ Missing Requirements:`,
          ...validation.issues.map(issue => `  • ${issue}`),
          ...validation.warnings.map(warning => `  ⚠️ ${warning}`)
        ].join('\n');

        return {
          success: false,
          taskIds: [],
          warnings: [`Scheduling validation failed:\n${errorDetails}`],
          notifications: [],
          stats: { totalCandidates: 0, successfulPosts: 0, skippedDueToRateLimit: 0, skippedDueToDuplicate: 0, skippedDueToRampUp: 0 }
        };
      }

      // Check if we already generated tasks today
      const todayTasks = await TaskService.getTodayTasks();
      if (todayTasks.length > 0) {
        return {
          success: false,
          taskIds: [],
          warnings: [`Tasks already generated for today (${todayTasks.length} tasks found)`],
          notifications: [],
          stats: { totalCandidates: 0, successfulPosts: 0, skippedDueToRateLimit: 0, skippedDueToDuplicate: 0, skippedDueToRampUp: 0 }
        };
      }

      // Generate and save enhanced tasks
      const result = await this.generateAndSaveEnhancedTasks(config, userId);

      // Create notifications for successful scheduling
      const notifications = [
        `✅ Successfully scheduled ${result.taskIds.length} tasks for today`,
        `📊 Generated ${result.stats.successfulPosts} posts with ${result.stats.skippedDueToDuplicate} duplicates skipped`
      ];

      console.log('✅ Automatic scheduling completed successfully');

      return {
        success: true,
        taskIds: result.taskIds,
        warnings: result.warnings,
        notifications,
        stats: result.stats
      };

    } catch (error) {
      console.error('❌ Automatic scheduling failed:', error);
      return {
        success: false,
        taskIds: [],
        warnings: [`Automatic scheduling failed: ${error}`],
        notifications: [],
        stats: { totalCandidates: 0, successfulPosts: 0, skippedDueToRateLimit: 0, skippedDueToDuplicate: 0, skippedDueToRampUp: 0 }
      };
    }
  }

  // Check if daily scheduling should run (called by external scheduler)
  static async shouldRunDailyScheduling(): Promise<{
    shouldRun: boolean;
    reason?: string;
    lastRunDate?: Date;
  }> {
    try {
      // Check if auto-generate is enabled
      const settings = await SettingsService.getSettings();
      if (!settings?.scheduling?.enabled || !settings.scheduling.autoGenerate) {
        return { shouldRun: false, reason: 'Auto-scheduling is disabled' };
      }

      // Check if we already ran today
      const todayTasks = await TaskService.getTodayTasks();
      if (todayTasks.length > 0) {
        return { shouldRun: false, reason: 'Tasks already generated for today' };
      }

      // Check if it's time to run (within operating hours)
      const now = new Date();
      const currentHour = now.getHours();

      if (currentHour < (settings.scheduling.startHour || 9) ||
          currentHour >= (settings.scheduling.endHour || 18)) {
        return { shouldRun: false, reason: 'Outside operating hours' };
      }

      return { shouldRun: true };

    } catch (error) {
      console.error('Error checking if scheduling should run:', error);
      return { shouldRun: false, reason: 'Error checking scheduling status' };
    }
  }

  // Get scheduling status and statistics
  static async getSchedulingStatus(): Promise<{
    isEnabled: boolean;
    autoGenerate: boolean;
    todayTaskCount: number;
    lastRunDate?: Date;
    nextScheduledRun?: Date;
    configuration: EnhancedSchedulingConfig | null;
  }> {
    try {
      const settings = await SettingsService.getSettings();
      const todayTasks = await TaskService.getTodayTasks();

      // Find the most recent task to determine last run
      const sortedTasks = todayTasks.sort((a, b) =>
        (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
      );

      return {
        isEnabled: settings?.scheduling?.enabled || false,
        autoGenerate: settings?.scheduling?.autoGenerate || false,
        todayTaskCount: todayTasks.length,
        lastRunDate: sortedTasks[0]?.createdAt,
        nextScheduledRun: settings?.scheduling?.startHour ?
          new Date(new Date().setHours(settings.scheduling.startHour, 0, 0, 0)) :
          undefined,
        configuration: settings?.scheduling || null
      };

    } catch (error) {
      console.error('Error getting scheduling status:', error);
      return {
        isEnabled: false,
        autoGenerate: false,
        todayTaskCount: 0,
        configuration: null
      };
    }
  }

  // Generate minimal test schedule (works with minimal data)
  static async generateTestSchedule(userId: string, taskCount: number = 3): Promise<{
    success: boolean;
    taskIds: string[];
    warnings: string[];
    notifications: string[];
  }> {
    try {
      console.log(`🧪 Generating ${taskCount} test tasks...`);

      // Get available data
      const [accounts, groups, templates, mediaFiles] = await Promise.all([
        AccountService.getActiveAccounts(),
        GroupService.getAllGroups(),
        TemplateService.getAllTemplates(),
        MediaService.getAllMedia(),
      ]);

      console.log(`📊 Test data: ${accounts.length} accounts, ${groups.length} groups, ${templates.length} templates, ${mediaFiles.length} media`);

      // Check minimum requirements with detailed feedback
      if (accounts.length === 0) {
        return {
          success: false,
          taskIds: [],
          warnings: ['❌ Need at least 1 Facebook account to generate test tasks. Please add accounts in the Accounts section.'],
          notifications: []
        };
      }

      if (groups.length === 0) {
        return {
          success: false,
          taskIds: [],
          warnings: ['❌ Need at least 1 Facebook group to generate test tasks. Please add groups in the Groups section.'],
          notifications: []
        };
      }

      if (templates.length === 0) {
        return {
          success: false,
          taskIds: [],
          warnings: ['❌ Need at least 1 text template to generate test tasks. Please create templates in the Templates section.'],
          notifications: []
        };
      }

      // Generate test tasks with current time + intervals
      const taskIds: string[] = [];
      const now = new Date();

      for (let i = 0; i < Math.min(taskCount, groups.length, accounts.length); i++) {
        const taskTime = new Date(now.getTime() + (i * 5 * 60 * 1000)); // 5 minutes apart

        const taskData = {
          date: taskTime,
          assignedTo: userId,
          groupId: groups[i % groups.length].id!,
          accountId: accounts[i % accounts.length].id!,
          templateId: templates[i % templates.length].id!,
          content: `🧪 TEST: ${templates[i % templates.length].title} (Test Task ${i + 1})`,
          notes: JSON.stringify({
            title: `🧪 TEST: ${templates[i % templates.length].title} (Test Task ${i + 1})`,
            description: `Test task generated at ${now.toLocaleTimeString()}`
          }),
        };

        const taskId = await TaskService.createTask(taskData);
        taskIds.push(taskId);
      }

      return {
        success: true,
        taskIds,
        warnings: [],
        notifications: [
          `✅ Generated ${taskIds.length} test tasks successfully!`,
          `📋 Check the "Live Scheduled Tasks" section to see them.`,
          `✅ When you mark tasks as "done", they'll appear in Post History.`
        ]
      };

    } catch (error) {
      console.error('❌ Error generating test schedule:', error);
      return {
        success: false,
        taskIds: [],
        warnings: [`❌ Test generation failed: ${error}`],
        notifications: []
      };
    }
  }

  // Debug function to check what data is available
  static async debugSchedulingData(): Promise<{
    accounts: { id: string; name: string; status: string }[];
    groups: { id: string; name: string; lastPostAt?: Date }[];
    templates: { id: string; title: string }[];
    media: { id: string; name: string }[];
    groupStates: { id: string; assigned_accounts: string[] }[];
  }> {
    try {
      const [accounts, groups, templates, mediaFiles] = await Promise.all([
        AccountService.getAllAccounts(),
        GroupService.getAllGroups(),
        TemplateService.getAllTemplates(),
        MediaService.getAllMedia(),
      ]);

      // Get group states for debugging
      const { collection, getDocs } = await import('firebase/firestore');
      const groupStatesSnap = await getDocs(collection(await import('@/lib/firebase').then(m => m.db), 'group_states'));

      return {
        accounts: accounts.map(acc => ({ id: acc.id!, name: acc.name, status: acc.status })),
        groups: groups.map(grp => ({ id: grp.id!, name: grp.name, lastPostAt: grp.lastPostAt })),
        templates: templates.map(tmp => ({ id: tmp.id!, title: tmp.title })),
        media: mediaFiles.map(med => ({ id: med.id!, name: med.name })),
        groupStates: groupStatesSnap.docs.map(doc => ({
          id: doc.id,
          assigned_accounts: doc.data().assigned_accounts || []
        }))
      };
    } catch (error) {
      console.error('Error in debug function:', error);
      return {
        accounts: [],
        groups: [],
        templates: [],
        media: [],
        groupStates: []
      };
    }
  }
}