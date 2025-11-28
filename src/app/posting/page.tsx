'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PostingHistoryItem {
  id: string;
  date: string;
  groupName: string;
  groupUrl: string;
  groupMemberCount: number;
  accountName: string;
  textTitle: string;
  textContent: string;
  imageUrl?: string;
  scheduledTime: string;
  completedAt?: string;
  status: 'completed' | 'failed' | 'pending';
  errorMessage?: string;
}

interface HistoryResponse {
  date: string;
  totalItems: number;
  returnedItems: number;
  items: PostingHistoryItem[];
  hasMore: boolean;
}

export default function PostingPage() {
  const [activeTab, setActiveTab] = useState('tasks');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyData, setHistoryData] = useState<HistoryResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleGenerateTasks = async () => {
    // TODO: Implement task generation
    console.log('Generating tasks...');
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'history') {
      fetchHistory();
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/posting/history?date=${selectedDate}&limit=100`);
      if (response.ok) {
        const data: HistoryResponse = await response.json();
        setHistoryData(data);
      } else {
        console.error('Failed to fetch history');
        setHistoryData(null);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistoryData(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [selectedDate, activeTab]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <path d="M16 3.128a4 4 0 0 1 0 7.744"></path>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <circle cx="9" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Posting Posting</h1>
              <p className="text-sm text-gray-600 hidden sm:block">Smart posting task management system</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">0</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">0</div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
            <Button
              onClick={handleGenerateTasks}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              🎯 Generate Daily Tasks
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                📋 Tasks
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">0</span>
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-2">
                📝 Content
                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">26</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                📜 History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-6">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-5xl mb-4">🎯</div>
                  <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
                  <p className="text-gray-600 text-center mb-6 max-w-md">
                    Generate daily tasks to start posting smartly across your groups
                  </p>
                  <Button onClick={handleGenerateTasks} size="lg">
                    Generate Tasks
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>


            <TabsContent value="content" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Content</h2>
                  <p className="text-sm text-gray-600">Manage your posting content</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Add Text
                  </Button>
                  <Button variant="outline" size="sm">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add Image
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Texts</CardTitle>
                        <CardDescription>26 reusable texts</CardDescription>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">26</div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                          <p className="text-sm text-gray-800 mb-1 line-clamp-2">
                            Sample posting text {i + 1}. This is a sample text that would be used for posting content to Facebook groups.
                          </p>
                          <div className="flex justify-between items-center">
                            <div className="flex gap-1">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">marketing</span>
                            </div>
                            <span className="text-xs text-gray-500">{Math.floor(Math.random() * 20)} uses</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Media</CardTitle>
                        <CardDescription>15 images and media files</CardDescription>
                      </div>
                      <div className="text-2xl font-bold text-green-600">15</div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                      {Array.from({ length: 9 }, (_, i) => (
                        <div key={i} className="aspect-square bg-gradient-to-br from-blue-200 to-purple-200 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Posting History</h2>
                  <p className="text-sm text-gray-600">View your posting activity by date</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="date-picker" className="text-sm font-medium">Select Date:</Label>
                    <Input
                      id="date-picker"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loadingHistory}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {loadingHistory ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {historyData ? historyData.items.filter(item => item.status === 'completed').length : 0}
                      </div>
                      <div className="text-sm text-gray-600">Success</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {historyData ? historyData.items.filter(item => item.status === 'failed').length : 0}
                      </div>
                      <div className="text-sm text-gray-600">Failed</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {historyData ? historyData.totalItems : 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Posts</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {historyData && historyData.totalItems > 0
                          ? Math.round((historyData.items.filter(item => item.status === 'completed').length / historyData.totalItems) * 100)
                          : 0}%
                      </div>
                      <div className="text-sm text-gray-600">Success Rate</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Posting Activity for {selectedDate}</CardTitle>
                  <CardDescription>
                    {historyData
                      ? `${historyData.returnedItems} posts found${historyData.hasMore ? ' (showing first 100)' : ''}`
                      : 'Select a date to view posting history'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingHistory ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">⏳</div>
                      <p className="text-sm text-gray-500">Loading posting history...</p>
                    </div>
                  ) : historyData && historyData.items.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {historyData.items.map((item) => (
                        <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  item.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : item.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {item.status === 'completed' ? '✅ Success' : item.status === 'failed' ? '❌ Failed' : '⏳ Pending'}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {new Date(item.scheduledTime).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {item.completedAt && (
                                  <span className="text-xs text-gray-400">
                                    Completed: {new Date(item.completedAt).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium text-sm text-gray-900 mb-1">Group</h4>
                                  <p className="text-sm text-gray-700">{item.groupName}</p>
                                  <p className="text-xs text-gray-500">{item.groupMemberCount.toLocaleString()} members</p>
                                </div>

                                <div>
                                  <h4 className="font-medium text-sm text-gray-900 mb-1">Account</h4>
                                  <p className="text-sm text-gray-700">{item.accountName}</p>
                                </div>
                              </div>

                              <div className="mt-3">
                                <h4 className="font-medium text-sm text-gray-900 mb-1">Content</h4>
                                <p className="text-sm text-gray-700 line-clamp-2">{item.textContent}</p>
                              </div>

                              {item.errorMessage && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                  <p className="text-xs text-red-700">
                                    <strong>Error:</strong> {item.errorMessage}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-4">📜</div>
                      <p className="text-sm">
                        {historyData
                          ? `No posting activity found for ${selectedDate}`
                          : 'Select a date to view posting history'
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
