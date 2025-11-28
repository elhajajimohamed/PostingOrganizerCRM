interface TodayItem {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  completed: boolean;
  completedAt?: string;
  source: 'firebase' | 'calendar';
  type?: 'meeting' | 'call' | 'task' | 'reminder';
  location?: string;
  callCenterId?: string;
  callCenterName?: string;
  groupId?: string;
  accountId?: string;
  summary?: string;
}

class TaskNotificationService {
  private static notificationPermission: NotificationPermission = 'default';
  private static scheduledNotifications: Map<string, number> = new Map();
  private static audio: HTMLAudioElement | null = null;
  private static permissionCallback: ((permission: NotificationPermission) => void) | null = null;
  private static inAppNotificationCallback: ((title: string, message: string, type: 'info' | 'success' | 'warning' | 'error', taskId: string) => void) | null = null;

  // Set callback for permission updates
  static setPermissionCallback(callback: (permission: NotificationPermission) => void): void {
    this.permissionCallback = callback;
  }

  // Set callback for in-app notifications
  static setInAppNotificationCallback(callback: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error', taskId: string) => void): void {
    this.inAppNotificationCallback = callback;
  }

  // Update permission and notify callback
  private static updatePermission(permission: NotificationPermission): void {
    console.log('🔔 updatePermission called with:', permission);
    this.notificationPermission = permission;
    if (this.permissionCallback) {
      console.log('🔔 Calling permission callback with:', permission);
      this.permissionCallback(permission);
    } else {
      console.log('🔔 No permission callback set');
    }
  }

  // Initialize the notification service (only check current status, don't request)
  static async initialize(): Promise<void> {
    console.log('🔔 Initializing Task Notification Service...');

    try {
      // Check current permission
      if ('Notification' in window) {
        const currentPermission = Notification.permission;
        console.log('🔔 Current notification permission:', currentPermission);
        this.updatePermission(currentPermission);
      } else {
        console.log('🔔 Notifications not supported in this browser');
        this.updatePermission('denied');
      }

      // Initialize audio
      this.initializeAudio();
      console.log('🔔 Task Notification Service initialized successfully');
    } catch (error) {
      console.error('🔔 Error initializing Task Notification Service:', error);
      this.updatePermission('denied');
    }
  }

  // Initialize audio element for notification sound
  private static initializeAudio(): void {
    if (typeof window !== 'undefined') {
      this.audio = new Audio('/new-notification-022-370046.mp3');
      this.audio.volume = 0.7; // Set volume to 70%
    }
  }

  // Play notification sound
  private static async playNotificationSound(): Promise<void> {
    if (this.audio) {
      try {
        this.audio.currentTime = 0; // Reset to beginning
        await this.audio.play();
      } catch (error) {
        console.error('❌ Error playing notification sound:', error);
      }
    }
  }

  // Show browser notification and in-app notification
  private static showNotification(title: string, body: string, taskId: string): void {
    console.log('🔔 showNotification called with permission:', this.notificationPermission);
    console.log('🔔 Notification supported:', 'Notification' in window);

    // Always show in-app notification
    if (this.inAppNotificationCallback) {
      console.log('🔔 Triggering in-app notification:', title, body);
      this.inAppNotificationCallback(title, body, 'info', taskId);
    }

    if (this.notificationPermission === 'granted' && 'Notification' in window) {
      console.log('🔔 Creating browser notification:', title, body);
      try {
        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico', // Use app favicon
          tag: `task-${taskId}`, // Prevent duplicate notifications for same task
          requireInteraction: false, // Auto-dismiss after a few seconds
          silent: false, // Allow sound (we'll play our own)
        });

        console.log('🔔 Browser notification created successfully');

        // Play sound when notification is shown
        this.playNotificationSound();

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);

        // Handle click on notification
        notification.onclick = () => {
          // Focus the window/tab
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.error('🔔 Error creating browser notification:', error);
      }
    } else {
      console.log('🔔 Browser notification not available - permission not granted or not supported');
    }
  }

  // Schedule notification for a task
  private static scheduleNotification(task: TodayItem): void {
    console.log('🔔 scheduleNotification called for task:', task.title, task.id);
    console.log('🔔 Task data:', { date: task.date, time: task.time, completed: task.completed });

    if (!task.time || task.completed) {
      console.log('🔔 Skipping notification for task:', task.title, '- no time or completed');
      return;
    }

    const now = new Date();
    console.log('🔔 Current time:', now.toLocaleString(), 'ISO:', now.toISOString());

    // Parse task date and time
    let taskDateTime: Date;
    try {
      // Handle different time formats (HH:MM or HH:MM AM/PM)
      let timeStr = task.time.trim();

      // If time includes AM/PM, convert to 24-hour format
      if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);

        if (period.toLowerCase() === 'pm' && hours !== 12) {
          hours += 12;
        } else if (period.toLowerCase() === 'am' && hours === 12) {
          hours = 0;
        }

        timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      } else {
        // Ensure time is in HH:MM format
        timeStr = timeStr.length === 5 ? timeStr : timeStr.substring(0, 5);
      }

      const dateTimeStr = `${task.date}T${timeStr}:00`;
      console.log('🔔 DateTime string:', dateTimeStr);
      taskDateTime = new Date(dateTimeStr);
      console.log('🔔 Parsed task datetime:', taskDateTime.toLocaleString(), 'ISO:', taskDateTime.toISOString());
    } catch (error) {
      console.error('🔔 Error parsing task datetime:', error);
      return;
    }

    // Calculate notification time (10 minutes before task)
    const notificationTime = new Date(taskDateTime.getTime() - 10 * 60 * 1000);
    console.log('🔔 Notification time (10 min before):', notificationTime.toLocaleString(), 'ISO:', notificationTime.toISOString());

    // Don't schedule if notification time is in the past
    if (notificationTime <= now) {
      console.log('🔔 Notification time is in the past, skipping. Time diff (ms):', notificationTime.getTime() - now.getTime());
      return;
    }

    const timeUntilNotification = notificationTime.getTime() - now.getTime();
    console.log('🔔 Time until notification (minutes):', Math.round(timeUntilNotification / (60 * 1000)));

    // Clear any existing notification for this task
    this.clearScheduledNotification(task.id);

    // Schedule new notification
    const timeoutId = window.setTimeout(() => {
      console.log('🔔 ⏰ TRIGGERING NOTIFICATION for task:', task.title);
      const title = `Upcoming Task: ${task.title}`;
      const body = task.time
        ? `Scheduled for ${task.time}${task.location ? ` at ${task.location}` : ''}`
        : 'Task reminder';

      this.showNotification(title, body, task.id);

      // Remove from scheduled notifications
      this.scheduledNotifications.delete(task.id);
    }, timeUntilNotification);

    this.scheduledNotifications.set(task.id, timeoutId);
    console.log(`🔔 ✅ Scheduled notification for task "${task.title}" - will trigger in ${Math.round(timeUntilNotification / (60 * 1000))} minutes`);
  }

  // Clear scheduled notification for a task
  private static clearScheduledNotification(taskId: string): void {
    const timeoutId = this.scheduledNotifications.get(taskId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledNotifications.delete(taskId);
      console.log(`🔔 Cleared scheduled notification for task ${taskId}`);
    }
  }

  // Update notifications based on current tasks
  static updateNotifications(tasks: TodayItem[]): void {
    console.log('🔔 updateNotifications called with', tasks.length, 'tasks');
    console.log('🔔 All tasks:', tasks.map(t => ({ id: t.id, title: t.title, time: t.time, date: t.date, completed: t.completed, source: t.source })));

    // Clear all existing scheduled notifications
    console.log('🔔 Clearing existing notifications, count:', this.scheduledNotifications.size);
    this.scheduledNotifications.forEach((timeoutId, taskId) => {
      clearTimeout(timeoutId);
    });
    this.scheduledNotifications.clear();

    // Filter pending tasks with times
    const pendingTasksWithTime = tasks.filter(t => !t.completed && t.time);
    console.log('🔔 Found', pendingTasksWithTime.length, 'pending tasks with times');
    console.log('🔔 Pending tasks with times:', pendingTasksWithTime.map(t => ({ id: t.id, title: t.title, time: t.time, date: t.date })));

    // Check permission before scheduling
    console.log('🔔 Current permission status:', this.notificationPermission);

    if (this.notificationPermission !== 'granted') {
      console.log('🔔 Permission not granted, skipping notification scheduling');
      return;
    }

    // Schedule notifications for pending tasks with times
    pendingTasksWithTime.forEach(task => {
      this.scheduleNotification(task);
    });

    console.log(`🔔 ✅ Updated notifications - scheduled for ${pendingTasksWithTime.length} tasks`);
  }

  // Get notification permission status
  static getNotificationPermission(): NotificationPermission {
    return this.notificationPermission;
  }

  // Request permission again (useful if previously denied)
  static async requestPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.updatePermission(permission);
      return permission;
    }
    return 'denied';
  }

  // Test notification (for debugging)
  static testNotification(): void {
    console.log('🔔 Testing notification system...');
    console.log('🔔 Service permission status:', this.notificationPermission);

    // Check actual browser permission
    if ('Notification' in window) {
      const actualPermission = Notification.permission;
      console.log('🔔 Actual browser permission:', actualPermission);

      if (actualPermission !== this.notificationPermission) {
        console.log('🔔 Permission mismatch! Updating...');
        this.updatePermission(actualPermission);
      }
    }

    this.showNotification(
      'Test Notification',
      'This is a test of the task notification system',
      'test'
    );
  }

  // Get current scheduled notifications for debugging
  static getScheduledNotifications(): Map<string, number> {
    return this.scheduledNotifications;
  }

  // Cleanup on page unload
  static cleanup(): void {
    this.scheduledNotifications.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.scheduledNotifications.clear();
  }
}

// Export singleton instance
export { TaskNotificationService };