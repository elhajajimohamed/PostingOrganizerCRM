'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Server, 
  Database, 
  Wifi, 
  Shield, 
  HardDrive,
  Cpu,
  Monitor,
  Network,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  Zap
} from 'lucide-react';

interface SystemStatusProps {
  data: {
    overview: {
      totalConnections: number;
      activeConnections: number;
      dataTransfer: number;
      responseTime: number;
      uptime: number;
      lastUpdate: string;
    };
    realTimeMetrics: {
      connectionsPerSecond: number;
      dataFlow: number;
      errorRate: number;
      throughput: number;
    };
    sections: {
      accounts: {
        totalAccounts: number;
        activeAccounts: number;
        connectionStatus: 'online' | 'offline' | 'warning';
        lastSync: string;
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
}

// Mock system metrics
const systemMetrics = {
  cpu: { usage: 45, status: 'healthy' as const },
  memory: { usage: 62, status: 'healthy' as const },
  storage: { usage: 38, status: 'healthy' as const },
  network: { usage: 23, status: 'excellent' as const },
  database: { status: 'healthy' as const, responseTime: 12, connections: 28 }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'excellent':
    case 'healthy':
      return 'text-green-600 bg-green-50';
    case 'warning':
      return 'text-yellow-600 bg-yellow-50';
    case 'critical':
    case 'offline':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'excellent':
    case 'healthy':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'critical':
    case 'offline':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-500" />;
  }
};

export function SystemStatus({ data }: SystemStatusProps) {
  const services = [
    {
      name: 'CRM Database',
      status: 'healthy' as const,
      description: 'Call center records and data',
      icon: Database,
      uptime: '99.9%',
      responseTime: '25ms',
      lastCheck: new Date(Date.now() - 2 * 60000).toISOString()
    },
    {
      name: 'WhatsApp API',
      status: 'healthy' as const,
      description: 'WhatsApp integration service',
      icon: Wifi,
      uptime: '99.7%',
      responseTime: '45ms',
      lastCheck: new Date(Date.now() - 1 * 60000).toISOString()
    },
    {
      name: 'Account Sync',
      status: 'warning' as const,
      description: 'Facebook account synchronization',
      icon: Network,
      uptime: '97.2%',
      responseTime: '180ms',
      lastCheck: new Date(Date.now() - 5 * 60000).toISOString()
    },
    {
      name: 'Call System',
      status: 'healthy' as const,
      description: 'Voice call management',
      icon: Activity,
      uptime: '99.8%',
      responseTime: '35ms',
      lastCheck: new Date(Date.now() - 3 * 60000).toISOString()
    },
    {
      name: 'Group Manager',
      status: 'healthy' as const,
      description: 'Facebook group operations',
      icon: Shield,
      uptime: '99.5%',
      responseTime: '55ms',
      lastCheck: new Date(Date.now() - 4 * 60000).toISOString()
    },
    {
      name: 'Task Scheduler',
      status: 'offline' as const,
      description: 'Automated task management',
      icon: Clock,
      uptime: '0%',
      responseTime: 'N/A',
      lastCheck: new Date(Date.now() - 15 * 60000).toISOString()
    }
  ];

  const formatLastCheck = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    return `${Math.floor(diffInMinutes / 60)}h ago`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="w-5 h-5 mr-2" />
            Service Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded ${getStatusColor(service.status)}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{service.name}</h4>
                    <p className="text-xs text-gray-600">{service.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(service.status)}
                    <span className="text-xs font-medium capitalize">{service.status}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {service.uptime} • {service.responseTime}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatLastCheck(service.lastCheck)}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* System Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <HardDrive className="w-5 h-5 mr-2" />
            System Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* CPU Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">CPU Usage</span>
              </div>
              <span className="text-sm text-gray-600">{systemMetrics.cpu.usage}%</span>
            </div>
            <Progress value={systemMetrics.cpu.usage} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Monitor className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Memory Usage</span>
              </div>
              <span className="text-sm text-gray-600">{systemMetrics.memory.usage}%</span>
            </div>
            <Progress value={systemMetrics.memory.usage} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Storage Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Storage Usage</span>
              </div>
              <span className="text-sm text-gray-600">{systemMetrics.storage.usage}%</span>
            </div>
            <Progress value={systemMetrics.storage.usage} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Network Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Network className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">Network Usage</span>
              </div>
              <span className="text-sm text-gray-600">{systemMetrics.network.usage}%</span>
            </div>
            <Progress value={systemMetrics.network.usage} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Database Status */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium">Database</span>
              </div>
              <Badge variant="outline" className="text-green-600">
                {systemMetrics.database.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
              <div>
                <span className="text-gray-500">Response Time:</span>
                <span className="ml-1 font-medium">{systemMetrics.database.responseTime}ms</span>
              </div>
              <div>
                <span className="text-gray-500">Connections:</span>
                <span className="ml-1 font-medium">{systemMetrics.database.connections}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {data.overview.uptime}%
              </div>
              <p className="text-sm text-gray-600">System Uptime</p>
              <div className="mt-2">
                <Badge variant="outline" className="text-green-600">
                  Excellent
                </Badge>
              </div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {data.overview.responseTime}ms
              </div>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              <div className="mt-2">
                <Badge variant="outline" className="text-blue-600">
                  Fast
                </Badge>
              </div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {data.realTimeMetrics.throughput.toFixed(0)}
              </div>
              <p className="text-sm text-gray-600">Requests/Second</p>
              <div className="mt-2">
                <Badge variant="outline" className="text-purple-600">
                  High
                </Badge>
              </div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {data.realTimeMetrics.errorRate.toFixed(2)}%
              </div>
              <p className="text-sm text-gray-600">Error Rate</p>
              <div className="mt-2">
                <Badge 
                  variant="outline" 
                  className={data.realTimeMetrics.errorRate < 1 ? 'text-green-600' : 'text-red-600'}
                >
                  {data.realTimeMetrics.errorRate < 1 ? 'Low' : 'High'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-3">Recent System Alerts</h4>
            <div className="space-y-2">
              {[
                { time: '10:45 AM', message: 'Database backup completed successfully', type: 'success' },
                { time: '09:30 AM', message: 'High memory usage detected', type: 'warning' },
                { time: '08:15 AM', message: 'Task scheduler service restarted', type: 'info' },
              ].map((alert, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 border rounded">
                  <div className={`w-2 h-2 rounded-full ${
                    alert.type === 'success' ? 'bg-green-500' :
                    alert.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <span className="text-xs text-gray-500 w-16">{alert.time}</span>
                  <span className="text-sm flex-1">{alert.message}</span>
                  <Badge variant="outline" className="text-xs">
                    {alert.type}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
