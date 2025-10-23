import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Settings, FacebookAccount, FacebookGroup, Template, Task, PostHistory, Media } from '@/lib/types';

// Import types from scheduling service
type PostCombination = {
  template: Template;
  media?: Media;
  group: FacebookGroup;
  account: FacebookAccount;
  scheduledTime: Date;
};

const SETTINGS_DOC_ID = 'main';

export class SettingsService {
  // Get default scheduling configuration
  private static getDefaultSchedulingConfig(): NonNullable<Settings['scheduling']> {
    return {
      enabled: false,
      postsPerDay: 20,
      startHour: 9,
      endHour: 18,
      minIntervalMinutes: 30,
      maxGroupsPerAccount: 5,
      autoGenerate: false,
      // New default configuration options
      global_group_cooldown_hours: 72,
      max_group_posts_per_24h: 1,
      cross_account_spacing_minutes: 180,
      duplicate_content_window_days: 7,
      baseline_min_interval: 30,
      interval_variation_pct: 20,
      group_usage_threshold: 2,
      usage_window_days: 7,
      global_usage_threshold: 5,
      global_window_days: 14,
      staleness_days: 21,
      initial_ramp_delay_hours: 48,
      ramp_week1_max_posts: 1,
      ramp_week2_max_posts: 1,
    };
  }

  // Get default browsers list
  private static getDefaultBrowsers(): string[] {
    return ['Chrome', 'Firefox', 'Edge', 'Safari', 'Opera', 'Other'];
  }

  // Get current settings
  static async getSettings(): Promise<Settings | null> {
    try {
      const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          maxPostsPerHour: data.maxPostsPerHour || 5,
          cooldownMinutes: data.cooldownMinutes || 60,
          backupLastRun: data.backupLastRun?.toDate(),
          updatedBy: data.updatedBy,
          updatedAt: data.updatedAt?.toDate(),
          scheduling: data.scheduling || this.getDefaultSchedulingConfig(),
          browsers: data.browsers && Array.isArray(data.browsers) && data.browsers.length > 0
            ? data.browsers
            : this.getDefaultBrowsers(),
        };
      }

      // Return default settings if none exist
      return {
        maxPostsPerHour: 5,
        cooldownMinutes: 60,
        updatedBy: '',
        updatedAt: new Date(),
        scheduling: this.getDefaultSchedulingConfig(),
        browsers: this.getDefaultBrowsers(),
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      throw new Error('Failed to fetch settings');
    }
  }

  // Update settings
  static async updateSettings(
    updates: Partial<Pick<Settings, 'maxPostsPerHour' | 'cooldownMinutes' | 'browsers'>>,
    updatedBy: string
  ): Promise<void> {
    try {
      const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
      const updateData = {
        ...updates,
        updatedBy,
        updatedAt: serverTimestamp(),
      };

      await setDoc(settingsRef, updateData, { merge: true });
    } catch (error) {
      console.error('Error updating settings:', error);
      throw new Error('Failed to update settings');
    }
  }

  // Export all data as JSON
  static async exportAllData(): Promise<{
    accounts: FacebookAccount[];
    groups: FacebookGroup[];
    templates: Template[];
    tasks: Task[];
    postHistory: PostHistory[];
    media: Media[];
    settings: Settings;
    exportedAt: Date;
    exportedBy: string;
  }> {
    try {
      // This would typically be done through Firebase Cloud Functions for security
      // For now, we'll return a structure that shows what would be exported
      const exportData = {
        accounts: [], // Would fetch from accounts collection
        groups: [], // Would fetch from groups collection
        templates: [], // Would fetch from templates collection
        tasks: [], // Would fetch from tasks collection
        postHistory: [], // Would fetch from postHistory collection
        media: [], // Would fetch from media collection
        settings: (await this.getSettings())!,
        exportedAt: new Date(),
        exportedBy: 'system', // Would be the current user ID
      };

      return exportData;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Failed to export data');
    }
  }

  // Validate settings values
  static validateSettings(settings: Partial<Settings>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.maxPostsPerHour !== undefined) {
      if (settings.maxPostsPerHour < 1 || settings.maxPostsPerHour > 100) {
        errors.push('Max posts per hour must be between 1 and 100');
      }
    }

    if (settings.cooldownMinutes !== undefined) {
      if (settings.cooldownMinutes < 1 || settings.cooldownMinutes > 1440) {
        errors.push('Cooldown minutes must be between 1 and 1440 (24 hours)');
      }
    }

    if (settings.browsers !== undefined) {
      if (!Array.isArray(settings.browsers)) {
        errors.push('Browsers must be an array');
      } else if (settings.browsers.length === 0) {
        errors.push('At least one browser must be configured');
      } else if (settings.browsers.length > 20) {
        errors.push('Maximum 20 browsers can be configured');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Get posting rate limit status for an account
  static checkRateLimit(
    accountId: string,
    postHistory: PostHistory[],
    settings: Settings
  ): { canPost: boolean; waitTimeMinutes: number; reason: string } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));

    // Count posts in the last hour for this account
    const recentPosts = postHistory.filter(post =>
      post.accountId === accountId &&
      post.timestamp &&
      post.timestamp >= oneHourAgo
    );

    if (recentPosts.length >= settings.maxPostsPerHour) {
      const oldestRecentPost = Math.min(...recentPosts.map(p => p.timestamp.getTime()));
      const waitTimeMinutes = Math.ceil((oldestRecentPost + (60 * 60 * 1000) - now.getTime()) / (60 * 1000));

      return {
        canPost: false,
        waitTimeMinutes: Math.max(0, waitTimeMinutes),
        reason: `Rate limit exceeded. Maximum ${settings.maxPostsPerHour} posts per hour.`,
      };
    }

    return {
      canPost: true,
      waitTimeMinutes: 0,
      reason: 'Within rate limits',
    };
  }

  // Get cooldown status between posts
  static checkCooldown(
    lastPostTime: Date | undefined,
    settings: Settings
  ): { canPost: boolean; waitTimeMinutes: number; reason: string } {
    if (!lastPostTime) {
      return {
        canPost: true,
        waitTimeMinutes: 0,
        reason: 'No previous posts',
      };
    }

    const now = new Date();
    const timeSinceLastPost = now.getTime() - lastPostTime.getTime();
    const cooldownMs = settings.cooldownMinutes * 60 * 1000;

    if (timeSinceLastPost < cooldownMs) {
      const waitTimeMinutes = Math.ceil((cooldownMs - timeSinceLastPost) / (60 * 1000));

      return {
        canPost: false,
        waitTimeMinutes,
        reason: `Cooldown period. Wait ${settings.cooldownMinutes} minutes between posts.`,
      };
    }

    return {
      canPost: true,
      waitTimeMinutes: 0,
      reason: 'Cooldown period passed',
    };
  }

  // Update scheduling configuration
  static async updateSchedulingConfig(
    schedulingConfig: Partial<NonNullable<Settings['scheduling']>>,
    updatedBy: string
  ): Promise<void> {
    try {
      const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
      const updateData = {
        scheduling: schedulingConfig,
        updatedBy,
        updatedAt: serverTimestamp(),
      };

      await setDoc(settingsRef, updateData, { merge: true });
    } catch (error) {
      console.error('Error updating scheduling config:', error);
      throw new Error('Failed to update scheduling configuration');
    }
  }

  // Update specific enhanced scheduling settings
  static async updateEnhancedSchedulingSettings(
    updates: Partial<NonNullable<Settings['scheduling']>>,
    updatedBy: string
  ): Promise<void> {
    try {
      const currentConfig = await this.getSchedulingConfig() || this.getDefaultSchedulingConfig();
      const newConfig = { ...currentConfig, ...updates };

      await this.updateSchedulingConfig(newConfig, updatedBy);
    } catch (error) {
      console.error('Error updating enhanced scheduling settings:', error);
      throw new Error('Failed to update enhanced scheduling settings');
    }
  }

  // Update browser configuration
  static async updateBrowserSettings(browsers: string[], updatedBy: string): Promise<void> {
    try {
      console.log('Updating browser settings with:', browsers);
      const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
      const updateData = {
        browsers: browsers.filter(browser => browser.trim().length > 0), // Filter out empty strings
        updatedBy,
        updatedAt: serverTimestamp(),
      };

      console.log('Filtered browsers to save:', updateData.browsers);
      await setDoc(settingsRef, updateData, { merge: true });
      console.log('Browser settings saved successfully');
    } catch (error) {
      console.error('Error updating browser settings:', error);
      throw new Error('Failed to update browser configuration');
    }
  }

  // Get scheduling configuration
  static async getSchedulingConfig(): Promise<NonNullable<Settings['scheduling']> | null> {
    try {
      const settings = await this.getSettings();
      return settings?.scheduling || this.getDefaultSchedulingConfig();
    } catch (error) {
      console.error('Error getting scheduling config:', error);
      throw new Error('Failed to fetch scheduling configuration');
    }
  }

  // Validate scheduling configuration
  static validateSchedulingConfig(config: Settings['scheduling'] | undefined): { valid: boolean; errors: string[] } {
    if (!config) {
      return { valid: false, errors: ['Configuration is required'] };
    }

    const errors: string[] = [];

    if (config.postsPerDay < 1 || config.postsPerDay > 100) {
      errors.push('Posts per day must be between 1 and 100');
    }

    if (config.startHour < 0 || config.startHour > 23) {
      errors.push('Start hour must be between 0 and 23');
    }

    if (config.endHour < 0 || config.endHour > 23) {
      errors.push('End hour must be between 0 and 23');
    }

    if (config.startHour >= config.endHour) {
      errors.push('Start hour must be before end hour');
    }

    if (config.minIntervalMinutes < 5 || config.minIntervalMinutes > 240) {
      errors.push('Minimum interval must be between 5 and 240 minutes');
    }

    if (config.maxGroupsPerAccount < 1 || config.maxGroupsPerAccount > 50) {
      errors.push('Max groups per account must be between 1 and 50');
    }

    // Check if scheduling is feasible
    const totalMinutes = (config.endHour - config.startHour) * 60;
    const minRequiredMinutes = config.postsPerDay * config.minIntervalMinutes;

    if (minRequiredMinutes > totalMinutes) {
      errors.push(
        `Configuration not feasible: ${config.postsPerDay} posts in ${totalMinutes} minutes with ${config.minIntervalMinutes}min intervals`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Enable/disable automatic scheduling
  static async toggleScheduling(enabled: boolean, updatedBy: string): Promise<void> {
    await this.updateSchedulingConfig({ enabled }, updatedBy);
  }

  // Generate next schedule preview
  static async previewSchedule(
    schedulingConfig?: NonNullable<Settings['scheduling']>
  ): Promise<{
    combinations: PostCombination[];
    stats: {
      totalGroups: number;
      availableGroups: number;
      activeAccounts: number;
      totalTemplates: number;
      totalMedia: number;
      lastScheduleGeneration?: Date;
    };
    validation: { valid: boolean; errors: string[]; warnings: string[] };
  }> {
    try {
      const config = schedulingConfig || await this.getSchedulingConfig() || this.getDefaultSchedulingConfig();
      const { SchedulingService } = await import('./scheduling-service');

      const [combinations, stats, validationResult] = await Promise.all([
        SchedulingService.generateDailySchedule(config),
        SchedulingService.getSchedulingStats(),
        SchedulingService.validateScheduling(config),
      ]);

      return {
        combinations,
        stats,
        validation: {
          valid: validationResult.isValid,
          errors: validationResult.issues,
          warnings: validationResult.warnings,
        },
      };
    } catch (error) {
      console.error('Error generating schedule preview:', error);
      throw new Error('Failed to generate schedule preview');
    }
  }
}