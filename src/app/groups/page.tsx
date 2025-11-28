'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TaskCard } from '@/components/posting/task-card';
import { SafetyRulesConfig } from '@/components/posting/safety-rules-config';
import { TextForm } from '@/components/posting/text-form';
import { PostingTaskService } from '@/lib/services/posting-task-service';
import { AccountService } from '@/lib/services/account-service';
import { GroupService } from '@/lib/services/group-service';
import { MediaService } from '@/lib/services/media-service';
import { PostingTask, FacebookAccount, FacebookGroup, PostingText, Media, PostingHistory } from '@/lib/types';
import { Users, Plus, Settings, History, FileText, Image } from 'lucide-react';

export default function GroupsPage() {
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState<PostingTask[]>([]);
  const [accounts, setAccounts] = useState<FacebookAccount[]>([]);
  const [groups, setGroups] = useState<FacebookGroup[]>([]);
  const [texts, setTexts] = useState<PostingText[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [history, setHistory] = useState<PostingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showSafetyRules, setShowSafetyRules] = useState(false);
  const [showTextForm, setShowTextForm] = useState(false);

  // Load all data
  const loadData = async () => {
    try {
      setLoading(true);
      const [
        tasksData,
        accountsData,
        groupsData,
        textsData,
        mediaData,
        historyData
      ] = await Promise.all([
        PostingTaskService.getAllTasks().catch(() => []),
        AccountService.getAllAccounts().catch(() => []),
        GroupService.getAllGroups().catch(() => []),
        PostingTaskService.getAllTexts().catch(() => []),
        MediaService.getAllMedia().catch(() => []),
        PostingTaskService.getPostingHistory(100).catch(() => [])
      ]);

      setTasks(tasksData);
      setAccounts(accountsData);
      setGroups(groupsData);
      setTexts(textsData);
      setMedia(mediaData);
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Generate new tasks
  const handleGenerateTasks = async () => {
    setGenerating(true);
    try {
      await PostingTaskService.generateSmartTasks(20).catch(() => []);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to generate tasks:', error);
    } finally {
      setGenerating(false);
    }
  };

  // Get related data for a task
  const getTaskData = (task: PostingTask) => {
    return {
      account: accounts.find(a => a.id === task.accountId),
      group: groups.find(g => g.id === task.groupId),
      text: texts.find(t => t.id === task.textId),
      media: media.find(m => m.id === task.mediaId),
    };
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status !== 'pending');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Facebook Groups CRM</h1>
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
              disabled={generating}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {generating ? 'Generating...' : '🎯 Generate Daily Tasks'}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                📋 Tasks (0)
              </TabsTrigger>
              <TabsTrigger value="accounts" className="flex items-center gap-2">
                👤 Accounts (10)
              </TabsTrigger>
              <TabsTrigger value="groups" className="flex items-center gap-2">
                👥 Groups (563)
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-2">
                📝 Content (26)
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                📜 History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-6">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-lg font-semibold mb-2">No pending tasks</h3>
                  <p className="text-gray-600 text-center mb-4">
                    Generate daily tasks to start posting smartly across your groups
                  </p>
                  <Button onClick={handleGenerateTasks} disabled={generating}>
                    {generating ? 'Generating...' : 'Generate Tasks'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="accounts"></TabsContent>
            <TabsContent value="groups"></TabsContent>
            <TabsContent value="content"></TabsContent>
            <TabsContent value="history"></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
