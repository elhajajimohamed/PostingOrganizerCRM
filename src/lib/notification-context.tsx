'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { NotificationHistoryService } from '@/lib/services/notification-history-service';
import { useAuth } from '@/lib/auth-context';

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  taskId?: string;
  persistent?: boolean;
}

interface NotificationContextType {
  notifications: InAppNotification[];
  addNotification: (notification: Omit<InAppNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  const addNotification = useCallback(async (notification: Omit<InAppNotification, 'id' | 'timestamp'>) => {
    const newNotification: InAppNotification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show toast notification
    const toastFn = notification.type === 'error' ? toast.error :
                   notification.type === 'warning' ? toast.warning :
                   notification.type === 'success' ? toast.success :
                   toast.info;

    toastFn(notification.title, {
      description: notification.message,
      duration: notification.persistent ? Infinity : 5000,
      action: notification.taskId ? {
        label: 'View Task',
        onClick: () => {
          // Navigate to tasks page or specific task
          window.location.href = '/tasks';
        },
      } : undefined,
    });

    // Save to notification history if user is logged in
    if (user?.uid) {
      try {
        await NotificationHistoryService.saveNotification({
          userId: user.uid,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          taskId: notification.taskId,
        });
      } catch (error) {
        console.error('Failed to save notification to history:', error);
      }
    }

    // Auto-remove non-persistent notifications after 10 seconds
    if (!notification.persistent) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 10000);
    }
  }, [user?.uid]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAllNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}