'use client';

import React from 'react';
import { useNotifications, InAppNotification } from '@/lib/notification-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Bell, Clock, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationPanelProps {
  className?: string;
}

export function NotificationPanel({ className }: NotificationPanelProps) {
  const { notifications, removeNotification, clearAllNotifications } = useNotifications();

  const getIcon = (type: InAppNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBadgeVariant = (type: InAppNotification['type']) => {
    switch (type) {
      case 'success':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Card className={cn("fixed top-4 right-4 w-96 max-h-96 overflow-hidden z-50 shadow-lg border-2", className)}>
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5" />
          <h3 className="font-semibold">Notifications</h3>
          <Badge variant="secondary" className="text-xs">
            {notifications.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllNotifications}
          className="text-white hover:bg-white/20 h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <CardContent className="p-0 max-h-80 overflow-y-auto">
        <div className="space-y-1">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {notification.title}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNotification(notification.id)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 ml-2"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>

                  <p className="text-sm text-gray-600 mt-1">
                    {notification.message}
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant={getBadgeVariant(notification.type)} className="text-xs">
                        {notification.type}
                      </Badge>
                      {notification.taskId && (
                        <Badge variant="outline" className="text-xs">
                          Task #{notification.taskId.slice(-6)}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {notification.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}