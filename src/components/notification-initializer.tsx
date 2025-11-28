'use client';

import { useEffect } from 'react';
import { TaskNotificationService } from '@/lib/services/task-notification-service';
import { useNotifications } from '@/lib/notification-context';

export function NotificationInitializer() {
  const { addNotification } = useNotifications();

  useEffect(() => {
    // Set up the in-app notification callback
    TaskNotificationService.setInAppNotificationCallback(
      (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error', taskId: string) => {
        addNotification({
          title,
          message,
          type,
          taskId,
        });
      }
    );

    // Initialize the notification service
    TaskNotificationService.initialize();

    // Cleanup on unmount
    return () => {
      TaskNotificationService.cleanup();
    };
  }, [addNotification]);

  return null; // This component doesn't render anything
}