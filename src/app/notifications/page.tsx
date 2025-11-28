'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { NotificationHistoryService, NotificationHistoryItem } from '@/lib/services/notification-history-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ModernTabsNavigation } from '@/components/ui/modern-tabs-navigation';
import { Building2, Bell, Calculator, Copy } from 'lucide-react';
import {
  Bell as BellIcon,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  Clock,
  Trash2,
  RefreshCw,
  Filter
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');
  const [activeTab, setActiveTab] = useState('notifications');
  const [currentTime, setCurrentTime] = useState(new Date());

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);

    // Navigate to appropriate routes based on tab
    switch (tab) {
      case 'dashboard':
        router.push('/');
        break;
      case 'call-centers':
      case 'prospection':
      case 'communication':
      case 'daily-calls':
      case 'daily-whatsapp':
      case 'integrity':
      case 'financial':
      case 'tasks':
      case 'calendar':
      case 'reports':
      case 'groups-posting':
        router.push('/external-crm');
        break;
      case 'simulator':
        router.push('/calculator');
        break;
      case 'duplicates':
        router.push('/external-crm');
        break;
      default:
        // Stay on notifications page
        break;
    }
  };

  const loadNotifications = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);
      const history = await NotificationHistoryService.getNotificationHistory(user.uid, 100);
      setNotifications(history);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [user?.uid]);

  const markAsRead = async (notificationId: string) => {
    try {
      await NotificationHistoryService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAsDismissed = async (notificationId: string) => {
    try {
      await NotificationHistoryService.markAsDismissed(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, dismissed: true } : n
        )
      );
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  const getIcon = (type: NotificationHistoryItem['type']) => {
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

  const getBadgeVariant = (type: NotificationHistoryItem['type']) => {
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

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    const matchesReadFilter = filter === 'all' ||
      (filter === 'read' && notification.read) ||
      (filter === 'unread' && !notification.read);

    const matchesTypeFilter = typeFilter === 'all' || notification.type === typeFilter;

    return matchesReadFilter && matchesTypeFilter;
  });

  const unreadCount = notifications.filter(n => !n.read && !n.dismissed).length;

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-gray-600">View your notification history</p>
          </div>
        </div>

        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <BellIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Notifications</h1>
              <p className="text-sm text-gray-600 hidden sm:block">View your notification history</p>
            </div>
          </div>

          {/* Real-time Date and Time Display - Centered */}
          <div className="flex-1 text-center mx-4">
            <div className="inline-flex items-center px-6 py-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center">
                <div className="flex items-baseline gap-3">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 font-mono tracking-wider">
                    {currentTime.toLocaleTimeString('en-US', {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                  <div className="text-sm sm:text-base text-gray-600 font-medium">
                    {currentTime.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-sm text-gray-600 truncate max-w-[120px] sm:max-w-none">
              Welcome, {user?.displayName || user?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/external-crm')}
              title="Price Simulator"
            >
              <Calculator className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/external-crm')}
              title="Duplicates Management"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/external-crm')}
              title="Back to CRM"
            >
              ← CRM
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/')}>
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">Exit</span>
            </Button>
          </div>
        </div>

        {/* Modern Tabs Navigation */}
        <ModernTabsNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Notification History</h2>
                <p className="text-gray-600">View and manage your notification history</p>
              </div>

              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-sm">
                    {unreadCount} unread
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadNotifications}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <label className="sr-only" htmlFor="filter-select">Filter notifications</label>
            <select
              id="filter-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>

            <label className="sr-only" htmlFor="type-filter-select">Filter by type</label>
            <select
              id="type-filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Types</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bell className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {notifications.length === 0 ? 'No notifications yet' : 'No notifications match your filters'}
            </h3>
            <p className="text-gray-600 text-center">
              {notifications.length === 0
                ? 'You\'ll see your task notifications and system alerts here'
                : 'Try adjusting your filters to see more notifications'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-all duration-200 ${
                !notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
              } ${notification.dismissed ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-gray-700 mb-3">
                          {notification.message}
                        </p>

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatDistanceToNow(notification.timestamp, { addSuffix: true })}</span>
                          </div>

                          <Badge variant={getBadgeVariant(notification.type)} className="text-xs">
                            {notification.type}
                          </Badge>

                          {notification.taskId && (
                            <Badge variant="outline" className="text-xs">
                              Task #{notification.taskId.slice(-6)}
                            </Badge>
                          )}

                          {!notification.read && (
                            <Badge variant="secondary" className="text-xs">
                              Unread
                            </Badge>
                          )}

                          {notification.dismissed && (
                            <Badge variant="outline" className="text-xs text-gray-400">
                              Dismissed
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.read && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsRead(notification.id!)}
                          >
                            Mark as Read
                          </Button>
                        )}

                        {!notification.dismissed && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsDismissed(notification.id!)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
          </div>
        </div>
      </div>
    </div>
  );
}