import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Notification, NotificationRule, Template, Media, EnhancedSchedulingConfig } from '@/lib/types';
import { TemplateService } from './template-service';
import { MediaService } from './media-service';
import { GroupStateService } from './group-state-service';

const NOTIFICATIONS_COLLECTION = 'notifications';
const NOTIFICATION_RULES_COLLECTION = 'notification_rules';

export class NotificationService {
  // Create notification rule
  static async createNotificationRule(
    rule: Omit<NotificationRule, 'id' | 'created_at'>
  ): Promise<string> {
    try {
      const ruleData = {
        ...rule,
        created_at: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, NOTIFICATION_RULES_COLLECTION), ruleData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification rule:', error);
      throw new Error('Failed to create notification rule');
    }
  }

  // Get all notification rules
  static async getNotificationRules(): Promise<NotificationRule[]> {
    try {
      const q = query(
        collection(db, NOTIFICATION_RULES_COLLECTION),
        orderBy('created_at', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate(),
      })) as NotificationRule[];
    } catch (error) {
      console.error('Error getting notification rules:', error);
      throw new Error('Failed to fetch notification rules');
    }
  }

  // Update notification rule
  static async updateNotificationRule(
    ruleId: string,
    updates: Partial<Omit<NotificationRule, 'id' | 'created_at'>>
  ): Promise<void> {
    try {
      const ruleRef = doc(db, NOTIFICATION_RULES_COLLECTION, ruleId);
      await updateDoc(ruleRef, {
        ...updates,
        // Note: Firestore doesn't have updated_at in the rule interface
      });
    } catch (error) {
      console.error('Error updating notification rule:', error);
      throw new Error('Failed to update notification rule');
    }
  }

  // Delete notification rule
  static async deleteNotificationRule(ruleId: string): Promise<void> {
    try {
      const ruleRef = doc(db, NOTIFICATION_RULES_COLLECTION, ruleId);
      await deleteDoc(ruleRef);
    } catch (error) {
      console.error('Error deleting notification rule:', error);
      throw new Error('Failed to delete notification rule');
    }
  }

  // Create notification
  static async createNotification(
    type: 'warning' | 'info' | 'error',
    title: string,
    message: string,
    data?: Record<string, unknown>,
    expiresAt?: Date
  ): Promise<string> {
    try {
      const notificationData = {
        type,
        title,
        message,
        data,
        read: false,
        created_at: serverTimestamp(),
        expires_at: expiresAt ? serverTimestamp() : null,
      };

      const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notificationData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  // Get notifications for user
  static async getNotifications(
    limitCount: number = 50,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    try {
      let q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );

      if (unreadOnly) {
        q = query(
          collection(db, NOTIFICATIONS_COLLECTION),
          where('read', '==', false),
          orderBy('created_at', 'desc'),
          limit(limitCount)
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate(),
        expires_at: doc.data().expires_at?.toDate(),
      })) as Notification[];
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
  }

  // Mark notification as read
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
      await updateDoc(notificationRef, {
        read: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  // Check for stale templates and create notifications
  static async checkStaleTemplates(config: EnhancedSchedulingConfig): Promise<void> {
    try {
      const stalenessDays = config.staleness_days || 21;
      const staleTemplates = await TemplateService.getStaleTemplates(stalenessDays);

      for (const template of staleTemplates) {
        const lastModified = template.last_modified_at || template.updatedAt;
        const daysSinceUpdate = Math.floor((Date.now() - lastModified.getTime()) / (24 * 60 * 60 * 1000));

        await this.createNotification(
          'warning',
          'Template Needs Refresh',
          `Template "${template.title}" hasn't been updated in ${daysSinceUpdate} days. Consider creating new variants or updating content.`,
          {
            template_id: template.id,
            days_since_update: daysSinceUpdate,
            suggestion: 'create_variants',
          }
        );
      }
    } catch (error) {
      console.error('Error checking stale templates:', error);
    }
  }

  // Check for overuse of templates/media in groups
  static async checkUsageThresholds(config: EnhancedSchedulingConfig): Promise<void> {
    try {
      const groupThreshold = config.group_usage_threshold || 2;
      const usageWindowDays = config.usage_window_days || 7;
      const globalThreshold = config.global_usage_threshold || 5;
      const globalWindowDays = config.global_window_days || 14;

      // Check template usage in groups
      const templates = await TemplateService.getAllTemplates();

      for (const template of templates) {
        if (template.usage_history && template.usage_history.length > 0) {
          const windowStart = new Date(Date.now() - (usageWindowDays * 24 * 60 * 60 * 1000));

          // Group usage by group
          const groupUsage = new Map<string, number>();
          template.usage_history
            .filter(usage => usage.timestamp >= windowStart)
            .forEach(usage => {
              const count = groupUsage.get(usage.group_id) || 0;
              groupUsage.set(usage.group_id, count + 1);
            });

          // Check for overuse in specific groups
          for (const [groupId, count] of groupUsage.entries()) {
            if (count >= groupThreshold) {
              await this.createNotification(
                'warning',
                'Template Overuse Detected',
                `Template "${template.title}" has been used ${count} times in one group within ${usageWindowDays} days.`,
                {
                  template_id: template.id,
                  group_id: groupId,
                  usage_count: count,
                  suggestion: 'create_variants',
                }
              );
            }
          }

          // Check global usage
          const totalRecentUsage = template.usage_history.filter(
            usage => usage.timestamp >= new Date(Date.now() - (globalWindowDays * 24 * 60 * 60 * 1000))
          ).length;

          if (totalRecentUsage >= globalThreshold) {
            await this.createNotification(
              'warning',
              'High Template Usage',
              `Template "${template.title}" has been used ${totalRecentUsage} times across all groups within ${globalWindowDays} days.`,
              {
                template_id: template.id,
                total_usage: totalRecentUsage,
                suggestion: 'review_content',
              }
            );
          }
        }
      }
    } catch (error) {
      console.error('Error checking usage thresholds:', error);
    }
  }

  // Check for duplicate content reuse
  static async checkDuplicateContentReuse(
    fbGroupId: string,
    textVariantId: string,
    mediaIds: string[],
    config: EnhancedSchedulingConfig
  ): Promise<void> {
    try {
      const windowDays = config.duplicate_content_window_days || 7;

      // Check if this combination was recently used
      const isDuplicate = await GroupStateService.checkDuplicateContent(
        fbGroupId,
        textVariantId,
        mediaIds,
        windowDays
      );

      if (isDuplicate) {
        await this.createNotification(
          'info',
          'Duplicate Content Prevented',
          'Scheduler avoided reusing the same content combination in a group within the specified window.',
          {
            group_id: fbGroupId,
            text_variant_id: textVariantId,
            media_ids: mediaIds,
            reason: 'duplicate_prevention',
          }
        );
      }
    } catch (error) {
      console.error('Error checking duplicate content reuse:', error);
    }
  }

  // Run all notification checks
  static async runNotificationChecks(config: EnhancedSchedulingConfig): Promise<void> {
    try {
      await Promise.all([
        this.checkStaleTemplates(config),
        this.checkUsageThresholds(config),
      ]);
    } catch (error) {
      console.error('Error running notification checks:', error);
    }
  }

  // Get notification statistics
  static async getNotificationStats(): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    recent: Notification[];
  }> {
    try {
      const notifications = await this.getNotifications(100);

      const unread = notifications.filter(n => !n.read).length;
      const byType = notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const recent = notifications.slice(0, 10);

      return {
        total: notifications.length,
        unread,
        byType,
        recent,
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return {
        total: 0,
        unread: 0,
        byType: {},
        recent: [],
      };
    }
  }

  // Clean up expired notifications
  static async cleanupExpiredNotifications(): Promise<number> {
    try {
      const now = new Date();
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('expires_at', '<', now)
      );

      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));

      await Promise.all(deletePromises);
      return deletePromises.length;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      return 0;
    }
  }
}