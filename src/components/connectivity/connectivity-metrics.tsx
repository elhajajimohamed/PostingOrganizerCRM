'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  Users, 
  MessageSquare, 
  Phone, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Globe
} from 'lucide-react';

interface ConnectivityMetricsProps {
  data: {
    overview: {
      totalConnections: number;
      activeConnections: number;
      dataTransfer: number;
      responseTime: number;
      uptime: number;
      lastUpdate: string;
    };
    sections: {
      crm: {
        totalRecords: number;
        activeLeads: number;
        conversionRate: number;
        recentActivity: number;
      };
      accounts: {
        totalAccounts: number;
        activeAccounts: number;
        connectionStatus: 'online' | 'offline' | 'warning';
        lastSync: string;
      };
      groups: {
        totalGroups: number;
        activeGroups: number;
        engagementRate: number;
        recentPosts: number;
      };
      tasks: {
        totalTasks: number;
        completedTasks: number;
        pendingTasks: number;
        overdueTasks: number;
      };
      whatsapp: {
        activeSessions: number;
        messagesSent: number;
        successRate: number;
        lastActivity: string;
      };
      calls: {
        totalCalls: number;
        successfulCalls: number;
        averageDuration: number;
        connectionQuality: number;
      };
    };
  };
  timeRange: string;
  detailed: boolean;
}

export function ConnectivityMetrics({ data, timeRange, detailed }: ConnectivityMetricsProps) {
  // Calculate performance scores
  const getPerformanceScore = (value: number, max: number, reverse = false) => {
    const percentage = (value / max) * 100;
    return reverse ? Math.max(0, 100 - percentage) : percentage;
  };

  // System health indicators
  const systemHealth = {
    uptime: data.overview.uptime,
    responseTime: Math.max(0, 100 - (data.overview.responseTime - 100)),
    connectivity: (data.overview.activeConnections / data.overview.totalConnections) * 100,
    overall: 0
  };
  
  systemHealth.overall = (systemHealth.uptime + systemHealth.responseTime + systemHealth.connectivity) / 3;

  const getHealthColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBg = (score: number) => {
    if (score >= 95) return 'bg-green-100';
    if (score >= 85) return 'bg-blue-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (!detailed) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Database className="w-5 h-5 mr-2" />
              CRM Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{data.sections.crm.totalRecords}</div>
                <div className="text-sm text-gray-600">Total Records</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Conversion Rate</span>
                  <span>{data.sections.crm.conversionRate.toFixed(1)}%</span>
                </div>
                <Progress value={data.sections.crm.conversionRate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Users className="w-5 h-5 mr-2" />
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {data.sections.accounts.activeAccounts}/{data.sections.accounts.totalAccounts}
                </div>
                <div className="text-sm text-gray-600">Active Accounts</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Online Rate</span>
                  <span>{((data.sections.accounts.activeAccounts / data.sections.accounts.totalAccounts) * 100).toFixed(1)}%</span>
                </div>
                <Progress value={(data.sections.accounts.activeAccounts / data.sections.accounts.totalAccounts) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <MessageSquare className="w-5 h-5 mr-2" />
              WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-600">{data.sections.whatsapp.activeSessions}</div>
                <div className="text-sm text-gray-600">Active Sessions</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Success Rate</span>
                  <span>{data.sections.whatsapp.successRate.toFixed(1)}%</span>
                </div>
                <Progress value={data.sections.whatsapp.successRate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Activity className="w-5 h-5 mr-2" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getHealthColor(systemHealth.overall)}`}>
                  {systemHealth.overall.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Overall Score</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uptime</span>
                  <span>{data.overview.uptime.toFixed(1)}%</span>
                </div>
                <Progress value={data.overview.uptime} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                CRM Database
              </div>
              <Badge variant="outline">Live</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{data.sections.crm.totalRecords}</div>
                <div className="text-sm text-gray-600">Total Records</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{data.sections.crm.activeLeads}</div>
                <div className="text-sm text-gray-600">Active Leads</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Conversion Rate</span>
                <span className="font-medium">{data.sections.crm.conversionRate.toFixed(1)}%</span>
              </div>
              <Progress value={data.sections.crm.conversionRate} className="h-2" />
            </div>
            
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span>Recent Activity</span>
                <span className="font-medium">{data.sections.crm.recentActivity} items</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Facebook Accounts
              </div>
              <Badge variant={data.sections.accounts.connectionStatus === 'online' ? 'default' : 'destructive'}>
                {data.sections.accounts.connectionStatus}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{data.sections.accounts.activeAccounts}</div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{data.sections.accounts.totalAccounts - data.sections.accounts.activeAccounts}</div>
                <div className="text-sm text-gray-600">Offline</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Online Rate</span>
                <span className="font-medium">
                  {((data.sections.accounts.activeAccounts / data.sections.accounts.totalAccounts) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={(data.sections.accounts.activeAccounts / data.sections.accounts.totalAccounts) * 100} className="h-2" />
            </div>
            
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span>Last Sync</span>
                <span className="font-medium">
                  {new Date(data.sections.accounts.lastSync).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                WhatsApp Sessions
              </div>
              <Badge variant="outline">Live</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-cyan-50 rounded-lg">
                <div className="text-2xl font-bold text-cyan-600">{data.sections.whatsapp.activeSessions}</div>
                <div className="text-sm text-gray-600">Active Sessions</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{data.sections.whatsapp.messagesSent}</div>
                <div className="text-sm text-gray-600">Messages Sent</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Success Rate</span>
                <span className="font-medium">{data.sections.whatsapp.successRate.toFixed(1)}%</span>
              </div>
              <Progress value={data.sections.whatsapp.successRate} className="h-2" />
            </div>
            
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span>Last Activity</span>
                <span className="font-medium">
                  {new Date(data.sections.whatsapp.lastActivity).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Phone className="w-5 h-5 mr-2" />
                Call Center
              </div>
              <Badge variant="outline">Connected</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{data.sections.calls.successfulCalls}</div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{data.sections.calls.averageDuration}s</div>
                <div className="text-sm text-gray-600">Avg Duration</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Connection Quality</span>
                <span className="font-medium">{data.sections.calls.connectionQuality.toFixed(1)}%</span>
              </div>
              <Progress value={data.sections.calls.connectionQuality} className="h-2" />
            </div>
            
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span>Total Calls</span>
                <span className="font-medium">{data.sections.calls.totalCalls}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              System Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <div className={`text-4xl font-bold ${getHealthColor(systemHealth.overall)}`}>
                {systemHealth.overall.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Overall Performance</div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Uptime</span>
                <span className="text-sm font-medium">{data.overview.uptime.toFixed(1)}%</span>
              </div>
              <Progress value={data.overview.uptime} className="h-2" />
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Response Time</span>
                <span className="text-sm font-medium">
                  {data.overview.responseTime < 100 ? 'Excellent' : data.overview.responseTime < 200 ? 'Good' : 'Fair'}
                </span>
              </div>
              <Progress value={systemHealth.responseTime} className="h-2" />
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Connectivity</span>
                <span className="text-sm font-medium">{systemHealth.connectivity.toFixed(1)}%</span>
              </div>
              <Progress value={systemHealth.connectivity} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Data Transfer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-purple-600">
                {data.overview.dataTransfer}KB
              </div>
              <div className="text-sm text-gray-600">Current Transfer Rate</div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Peak Transfer</span>
                <span className="text-sm font-medium">~{Math.round(data.overview.dataTransfer * 1.5)}KB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Average</span>
                <span className="text-sm font-medium">{Math.round(data.overview.dataTransfer * 0.8)}KB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Status</span>
                <Badge variant="default" className="text-xs">Normal</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Tasks & Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-lg font-bold text-green-600">{data.sections.tasks.completedTasks}</div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded">
                <div className="text-lg font-bold text-yellow-600">{data.sections.tasks.pendingTasks}</div>
                <div className="text-xs text-gray-600">Pending</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completion Rate</span>
                <span className="font-medium">
                  {((data.sections.tasks.completedTasks / data.sections.tasks.totalTasks) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={(data.sections.tasks.completedTasks / data.sections.tasks.totalTasks) * 100} className="h-2" />
              
              {data.sections.tasks.overdueTasks > 0 && (
                <div className="flex items-center text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {data.sections.tasks.overdueTasks} overdue tasks
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
