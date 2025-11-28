'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConnectivityMetrics } from '@/components/connectivity/connectivity-metrics';
import { ConnectivityCharts } from '@/components/connectivity/connectivity-charts';
import { ConnectivityReports } from '@/components/connectivity/connectivity-reports';
import { RealTimeActivityFeed } from '@/components/connectivity/real-time-activity-feed';
import { 
  Activity, 
  BarChart3, 
  FileText, 
  Settings,
  Zap,
  Database,
  Users,
  Phone,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';

export default function ConnectivityPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('1h');
  const [detailed, setDetailed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Mock real-time data
  const [connectivityData, setConnectivityData] = useState({
    overview: {
      totalConnections: 1318,
      activeConnections: 1247,
      dataTransfer: 2457,
      responseTime: 142,
      uptime: 99.8,
      lastUpdate: new Date().toISOString()
    },
    sections: {
      crm: {
        totalRecords: 1318,
        activeLeads: 47,
        conversionRate: 12.5,
        recentActivity: 23
      },
      accounts: {
        totalAccounts: 12,
        activeAccounts: 11,
        connectionStatus: 'online' as const,
        lastSync: new Date(Date.now() - 2 * 60 * 1000).toISOString()
      },
      groups: {
        totalGroups: 156,
        activeGroups: 142,
        engagementRate: 78.3,
        recentPosts: 89
      },
      tasks: {
        totalTasks: 245,
        completedTasks: 198,
        pendingTasks: 23,
        overdueTasks: 2
      },
      whatsapp: {
        activeSessions: 8,
        messagesSent: 156,
        successRate: 94.2,
        lastActivity: new Date(Date.now() - 30 * 1000).toISOString()
      },
      calls: {
        totalCalls: 89,
        successfulCalls: 76,
        averageDuration: 180,
        connectionQuality: 92.1
      }
    }
  });

  // Mock alerts
  const [alerts] = useState([
    {
      id: '1',
      type: 'warning' as const,
      message: 'High response time detected on WhatsApp service',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      section: 'WhatsApp'
    },
    {
      id: '2',
      type: 'error' as const,
      message: 'Account synchronization failed for 2 accounts',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      section: 'Accounts'
    },
    {
      id: '3',
      type: 'info' as const,
      message: 'System maintenance scheduled for tonight',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      section: 'System'
    }
  ]);

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      if (!refreshing) {
        setConnectivityData(prev => ({
          ...prev,
          overview: {
            ...prev.overview,
            activeConnections: prev.overview.activeConnections + Math.floor(Math.random() * 10) - 5,
            dataTransfer: prev.overview.dataTransfer + Math.floor(Math.random() * 100) - 50,
            responseTime: Math.max(50, prev.overview.responseTime + Math.floor(Math.random() * 20) - 10),
            lastUpdate: new Date().toISOString()
          }
        }));
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [refreshing]);

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  // Calculate system status
  const getSystemStatus = () => {
    const { overview, sections } = connectivityData;
    const uptimeScore = overview.uptime;
    const responseScore = Math.max(0, 100 - (overview.responseTime - 100) * 2);
    const connectionScore = (overview.activeConnections / overview.totalConnections) * 100;
    
    const overallScore = (uptimeScore + responseScore + connectionScore) / 3;
    
    if (overallScore >= 95) return { status: 'excellent', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (overallScore >= 85) return { status: 'good', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (overallScore >= 70) return { status: 'warning', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { status: 'critical', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const systemStatus = getSystemStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                Real-time Connectivity Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Monitor system health, performance, and connectivity across all CRM sections</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${systemStatus.bgColor}`}>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className={`text-sm font-medium ${systemStatus.color}`}>
                  System {systemStatus.status}
                </span>
              </div>
              
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">15 minutes</SelectItem>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="6h">6 hours</SelectItem>
                  <SelectItem value="24h">24 hours</SelectItem>
                  <SelectItem value="7d">7 days</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <Activity className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Connections</p>
                  <p className="text-2xl font-bold text-blue-600">{connectivityData.overview.totalConnections}</p>
                </div>
                <Database className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Now</p>
                  <p className="text-2xl font-bold text-green-600">{connectivityData.overview.activeConnections}</p>
                  <p className="text-xs text-gray-500">
                    {((connectivityData.overview.activeConnections / connectivityData.overview.totalConnections) * 100).toFixed(1)}%
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Data Transfer</p>
                  <p className="text-2xl font-bold text-purple-600">{connectivityData.overview.dataTransfer}KB</p>
                </div>
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Response Time</p>
                  <p className="text-2xl font-bold text-orange-600">{connectivityData.overview.responseTime}ms</p>
                </div>
                <Activity className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">System Uptime</p>
                  <p className="text-2xl font-bold text-green-600">{connectivityData.overview.uptime}%</p>
                </div>
                <Clock className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Sessions</p>
                  <p className="text-2xl font-bold text-cyan-600">
                    {connectivityData.sections.whatsapp.activeSessions}
                  </p>
                </div>
                <MessageSquare className="w-8 h-8 text-cyan-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-semibold">CRM</div>
              <div className="text-sm text-gray-600">{connectivityData.sections.crm.totalRecords} records</div>
              <Badge variant="outline" className="mt-1 text-xs">Active</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">📱</div>
              <div className="font-semibold">Accounts</div>
              <div className="text-sm text-gray-600">{connectivityData.sections.accounts.activeAccounts}/{connectivityData.sections.accounts.totalAccounts} online</div>
              <Badge variant="outline" className="mt-1 text-xs">Connected</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">👥</div>
              <div className="font-semibold">Groups</div>
              <div className="text-sm text-gray-600">{connectivityData.sections.groups.activeGroups} active</div>
              <Badge variant="outline" className="mt-1 text-xs">Engaged</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">📋</div>
              <div className="font-semibold">Tasks</div>
              <div className="text-sm text-gray-600">{connectivityData.sections.tasks.pendingTasks} pending</div>
              <Badge variant="outline" className="mt-1 text-xs">Running</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">💬</div>
              <div className="font-semibold">WhatsApp</div>
              <div className="text-sm text-gray-600">{connectivityData.sections.whatsapp.activeSessions} sessions</div>
              <Badge variant="outline" className="mt-1 text-xs">Live</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">📞</div>
              <div className="font-semibold">Calls</div>
              <div className="text-sm text-gray-600">{connectivityData.sections.calls.totalCalls} total</div>
              <Badge variant="outline" className="mt-1 text-xs">Connected</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <TabsList className="grid w-full lg:w-auto grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="charts">Charts & Analytics</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="activity">Live Activity</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailed(!detailed)}
              >
                <Settings className="w-4 h-4 mr-2" />
                {detailed ? 'Simple' : 'Detailed'}
              </Button>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <ConnectivityMetrics 
              data={connectivityData} 
              detailed={detailed}
              timeRange={timeRange}
            />
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <ConnectivityCharts 
              data={connectivityData} 
              timeRange={timeRange} 
              detailed={detailed} 
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <ConnectivityReports data={connectivityData} />
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <RealTimeActivityFeed 
              alerts={alerts}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              detailed={detailed}
            />
          </TabsContent>
        </Tabs>

        {/* Last Update Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Last updated: {new Date(connectivityData.overview.lastUpdate).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
