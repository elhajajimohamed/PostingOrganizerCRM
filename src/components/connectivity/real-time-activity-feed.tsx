'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Bell,
  Clock,
  Database,
  Users,
  Phone,
  Globe
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: string;
  section: string;
  icon: any;
  color: string;
}

interface RealTimeActivityFeedProps {
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    timestamp: string;
    section: string;
  }>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  detailed: boolean;
}

// Mock real-time activity data
const generateMockActivities = (): ActivityItem[] => {
  const activities = [
    {
      id: '1',
      type: 'success' as const,
      message: 'WhatsApp session connected successfully',
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      section: 'WhatsApp',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      id: '2',
      type: 'info' as const,
      message: 'CRM data sync completed - 1,318 records processed',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      section: 'CRM',
      icon: Database,
      color: 'text-blue-600'
    },
    {
      id: '3',
      type: 'warning' as const,
      message: 'Account connectivity issue detected for 2 accounts',
      timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      section: 'Accounts',
      icon: AlertTriangle,
      color: 'text-yellow-600'
    },
    {
      id: '4',
      type: 'info' as const,
      message: 'New group engagement spike detected (+15%)',
      timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      section: 'Groups',
      icon: Globe,
      color: 'text-blue-600'
    },
    {
      id: '5',
      type: 'success' as const,
      message: 'Task automation completed - 24 tasks executed',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      section: 'Tasks',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      id: '6',
      type: 'error' as const,
      message: 'Call connection failed - 3 attempts made',
      timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      section: 'Calls',
      icon: XCircle,
      color: 'text-red-600'
    },
    {
      id: '7',
      type: 'info' as const,
      message: 'System health check completed - All systems operational',
      timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      section: 'System',
      icon: Activity,
      color: 'text-blue-600'
    },
    {
      id: '8',
      type: 'success' as const,
      message: 'Data backup completed successfully',
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      section: 'System',
      icon: CheckCircle,
      color: 'text-green-600'
    }
  ];

  return activities;
};

export function RealTimeActivityFeed({ alerts, searchTerm, onSearchChange, detailed }: RealTimeActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(generateMockActivities());
  const [filter, setFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh activities
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simulate new activities
      const activityTypes: Array<ActivityItem['type']> = ['info', 'success', 'warning', 'error'];
      const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const newActivity: ActivityItem = {
        id: Date.now().toString(),
        type,
        message: `Real-time activity update #${Date.now()}`,
        timestamp: new Date().toISOString(),
        section: ['CRM', 'WhatsApp', 'Accounts', 'Groups', 'Tasks', 'Calls'][Math.floor(Math.random() * 6)],
        icon: Activity,
        color: 'text-blue-600'
      };

      setActivities(prev => [newActivity, ...prev.slice(0, 19)]); // Keep last 20
    }, 10000); // Add new activity every 10 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const matchesFilter = filter === 'all' || activity.type === filter;
      const matchesSearch = !searchTerm || 
        activity.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.section.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesFilter && matchesSearch;
    });
  }, [activities, filter, searchTerm]);

  const getActivityIcon = (activity: ActivityItem) => {
    const Icon = activity.icon;
    return <Icon className={`w-5 h-5 ${activity.color}`} />;
  };

  const getActivityTypeBadge = (type: string) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      warning: 'secondary',
      info: 'outline'
    } as const;

    return (
      <Badge variant={variants[type as keyof typeof variants] || 'outline'}>
        {type}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Real-time Activity Feed
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={autoRefresh ? "default" : "outline"}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Live' : 'Paused'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warnings</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Activities</span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm text-gray-600">
                {filteredActivities.length} of {activities.length}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No activities found</p>
              </div>
            ) : (
              filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.message}
                      </p>
                      <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                        {getActivityTypeBadge(activity.type)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Badge variant="outline" className="text-xs">
                          {activity.section}
                        </Badge>
                        <span>•</span>
                        <Clock className="w-3 h-3" />
                        <span>{formatTimestamp(activity.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      {detailed && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {activities.filter(a => a.type === 'info').length}
              </div>
              <p className="text-sm text-gray-600">Info Messages</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {activities.filter(a => a.type === 'success').length}
              </div>
              <p className="text-sm text-gray-600">Success Events</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {activities.filter(a => a.type === 'warning').length}
              </div>
              <p className="text-sm text-gray-600">Warnings</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {activities.filter(a => a.type === 'error').length}
              </div>
              <p className="text-sm text-gray-600">Errors</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts Section */}
      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">{alert.message}</p>
                    <div className="flex items-center space-x-2 mt-1 text-xs text-red-700">
                      <Badge variant="outline" className="text-xs border-red-300">
                        {alert.section}
                      </Badge>
                      <span>•</span>
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
