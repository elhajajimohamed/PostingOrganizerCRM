'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Zap
} from 'lucide-react';

interface ConnectivityChartsProps {
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

// Generate mock data for charts
const generateMockData = (timeRange: string) => {
  const intervals = {
    '15m': 15,
    '1h': 12,
    '6h': 24,
    '24h': 48,
    '7d': 28
  };
  
  const count = intervals[timeRange as keyof typeof intervals] || 12;
  const data = [];
  
  for (let i = count - 1; i >= 0; i--) {
    const baseTime = new Date();
    baseTime.setMinutes(baseTime.getMinutes() - i * (timeRange === '15m' ? 15 : timeRange === '1h' ? 60 : timeRange === '6h' ? 360 : timeRange === '24h' ? 1440 : 10080));
    
    data.push({
      time: baseTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      connections: Math.floor(Math.random() * 100) + 50,
      dataTransfer: Math.floor(Math.random() * 1000) + 200,
      responseTime: Math.floor(Math.random() * 50) + 30,
      errorRate: Math.random() * 2,
      throughput: Math.floor(Math.random() * 200) + 100
    });
  }
  
  return data;
};

// Simple SVG Bar Chart Component
const SimpleBarChart = ({ data, color = '#3B82F6' }: { data: number[]; color?: string }) => {
  const max = Math.max(...data);
  return (
    <div className="flex items-end space-x-1 h-32">
      {data.map((value, index) => (
        <div
          key={index}
          className="bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-sm transition-all duration-300 hover:from-blue-600 hover:to-blue-400"
          style={{
            height: `${(value / max) * 100}%`,
            width: '100%'
          }}
          title={`Value: ${value}`}
        />
      ))}
    </div>
  );
};

// Simple SVG Line Chart Component
const SimpleLineChart = ({ data, color = '#10B981' }: { data: number[]; color?: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  
  return (
    <div className="relative h-32">
      <svg width="100%" height="100%" viewBox="0 0 400 100" className="absolute inset-0">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={data.map((value, index) => {
            const x = (index / (data.length - 1)) * 400;
            const y = 100 - ((value - min) / (range || 1)) * 100;
            return `${x},${y}`;
          }).join(' ')}
        />
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon
          fill={`url(#gradient-${color})`}
          points={data.map((value, index) => {
            const x = (index / (data.length - 1)) * 400;
            const y = 100 - ((value - min) / (range || 1)) * 100;
            return `${x},${y}`;
          }).join(' ') + `,400,100 0,100`}
        />
      </svg>
    </div>
  );
};

export function ConnectivityCharts({ data, timeRange, detailed }: ConnectivityChartsProps) {
  const chartData = generateMockData(timeRange);
  
  // Extract data for charts
  const connectionsData = chartData.map(d => d.connections);
  const dataTransferData = chartData.map(d => d.dataTransfer);
  const responseTimeData = chartData.map(d => d.responseTime);
  const errorRateData = chartData.map(d => d.errorRate);
  
  // Section performance data
  const sectionData = [
    {
      name: 'CRM',
      value: data.sections.crm.totalRecords,
      performance: data.sections.crm.conversionRate,
      status: 'active',
      color: 'bg-blue-500'
    },
    {
      name: 'Accounts',
      value: data.sections.accounts.activeAccounts,
      performance: (data.sections.accounts.activeAccounts / Math.max(data.sections.accounts.totalAccounts, 1)) * 100,
      status: data.sections.accounts.connectionStatus,
      color: 'bg-green-500'
    },
    {
      name: 'Groups',
      value: data.sections.groups.activeGroups,
      performance: data.sections.groups.engagementRate,
      status: 'active',
      color: 'bg-purple-500'
    },
    {
      name: 'WhatsApp',
      value: data.sections.whatsapp.activeSessions,
      performance: data.sections.whatsapp.successRate,
      status: 'active',
      color: 'bg-orange-500'
    },
    {
      name: 'Tasks',
      value: data.sections.tasks.completedTasks,
      performance: (data.sections.tasks.completedTasks / Math.max(data.sections.tasks.totalTasks, 1)) * 100,
      status: 'active',
      color: 'bg-indigo-500'
    },
    {
      name: 'Calls',
      value: data.sections.calls.successfulCalls,
      performance: data.sections.calls.connectionQuality,
      status: 'active',
      color: 'bg-pink-500'
    }
  ];

  // System health data
  const systemHealthData = [
    { label: 'Uptime', value: data.overview.uptime, color: 'bg-green-500' },
    { label: 'Speed', value: Math.max(0, 100 - data.overview.responseTime), color: 'bg-blue-500' },
    { label: 'Reliability', value: 100 - Math.random() * 2, color: 'bg-yellow-500' },
    { label: 'Activity', value: (data.sections.crm.activeLeads / Math.max(data.sections.crm.totalRecords, 1)) * 100, color: 'bg-purple-500' },
    { label: 'Engagement', value: data.sections.groups.engagementRate, color: 'bg-orange-500' },
    { label: 'Success Rate', value: data.sections.whatsapp.successRate, color: 'bg-pink-500' }
  ];

  if (!detailed) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LineChartIcon className="w-5 h-5 mr-2" />
              Connection Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <SimpleLineChart data={connectionsData} color="#3B82F6" />
              <div className="text-center text-sm text-gray-600">
                Peak: {Math.max(...connectionsData)} | Average: {Math.round(connectionsData.reduce((a, b) => a + b, 0) / connectionsData.length)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              System Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sectionData.slice(0, 4).map((section, index) => (
                <div key={section.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{section.name}</span>
                    <span>{section.value}</span>
                  </div>
                  <Progress value={section.performance} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Connection Activity
              </div>
              <Badge variant="outline">{timeRange}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <SimpleLineChart data={connectionsData} color="#3B82F6" />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-600">{Math.max(...connectionsData)}</div>
                  <div className="text-xs text-gray-600">Peak</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{Math.round(connectionsData.reduce((a, b) => a + b, 0) / connectionsData.length)}</div>
                  <div className="text-xs text-gray-600">Average</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-600">{Math.min(...connectionsData)}</div>
                  <div className="text-xs text-gray-600">Min</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Flow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Data Flow
              </div>
              <Badge variant="outline">KB/s</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <SimpleBarChart data={dataTransferData} color="#10B981" />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-green-600">{Math.max(...dataTransferData)}</div>
                  <div className="text-xs text-gray-600">Peak</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">{Math.round(dataTransferData.reduce((a, b) => a + b, 0) / dataTransferData.length)}</div>
                  <div className="text-xs text-gray-600">Average</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-orange-600">{Math.min(...dataTransferData)}</div>
                  <div className="text-xs text-gray-600">Min</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Response Time
              </div>
              <Badge variant="outline">ms</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <SimpleLineChart data={responseTimeData} color="#F59E0B" />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-red-600">{Math.max(...responseTimeData)}</div>
                  <div className="text-xs text-gray-600">Max</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">{Math.round(responseTimeData.reduce((a, b) => a + b, 0) / responseTimeData.length)}</div>
                  <div className="text-xs text-gray-600">Average</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{Math.min(...responseTimeData)}</div>
                  <div className="text-xs text-gray-600">Min</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingDown className="w-5 h-5 mr-2" />
                Error Rate
              </div>
              <Badge variant="outline">%</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <SimpleBarChart data={errorRateData.map(val => val * 50)} color="#EF4444" />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-red-600">{(Math.max(...errorRateData) * 100).toFixed(1)}%</div>
                  <div className="text-xs text-gray-600">Max</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">{(errorRateData.reduce((a, b) => a + b, 0) / errorRateData.length * 100).toFixed(1)}%</div>
                  <div className="text-xs text-gray-600">Average</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{(Math.min(...errorRateData) * 100).toFixed(1)}%</div>
                  <div className="text-xs text-gray-600">Min</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Overview & Section Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>System Health Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemHealthData.map((metric, index) => (
                <div key={metric.label} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{metric.label}</span>
                    <span className="font-bold">{metric.value.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${metric.color} transition-all duration-500`}
                      style={{ width: `${Math.min(metric.value, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Section Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sectionData.map((section) => (
                <div key={section.name} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${section.color}`} />
                      <span className="font-medium">{section.name}</span>
                    </div>
                    <span className="text-lg font-bold">{section.value}</span>
                  </div>
                  <Progress value={section.performance} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Section Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sectionData.map((section, index) => (
          <Card key={section.name}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{section.name}</span>
                <Badge variant={section.status === 'active' ? 'default' : 'secondary'}>
                  {section.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{section.value}</div>
                <p className="text-sm text-gray-600">Active Items</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Performance</span>
                  <span className="font-medium">{section.performance.toFixed(1)}%</span>
                </div>
                <Progress value={section.performance} className="h-2" />
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Status</span>
                  <span className="capitalize">{section.status}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
