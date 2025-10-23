'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskService } from '@/lib/services/task-service';
import { AccountService } from '@/lib/services/account-service';
import { GroupService } from '@/lib/services/group-service';
import { TemplateService } from '@/lib/services/template-service';
import { useRealtimeTasks } from '@/lib/hooks/use-realtime-data';
import { Task, FacebookAccount, FacebookGroup, Template } from '@/lib/types';

interface LiveScheduledTasksProps {
  userId?: string;
  showHeader?: boolean;
  maxTasks?: number;
}

export function LiveScheduledTasks({
  userId,
  showHeader = true,
  maxTasks = 50
}: LiveScheduledTasksProps) {
  const [accounts, setAccounts] = useState<FacebookAccount[]>([]);
  const [groups, setGroups] = useState<FacebookGroup[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Use real-time tasks hook with client-side sorting to avoid composite index requirement
  const { data: rawTasks, loading: tasksLoading, error: tasksError } = useRealtimeTasks(userId);

  // Sort tasks client-side to avoid Firebase composite index requirement
  const tasks = useMemo(() => {
    if (!rawTasks) return [];
    return [...rawTasks].sort((a, b) => {
      const dateA = a.date?.getTime() || 0;
      const dateB = b.date?.getTime() || 0;
      return dateA - dateB;
    });
  }, [rawTasks]);

  // Load reference data (accounts, groups, templates)
  useEffect(() => {
    loadReferenceData();
  }, []);

  const loadReferenceData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadAccounts(),
        loadGroups(),
        loadTemplates(),
      ]);
    } catch (error) {
      console.error('Error loading reference data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const accountsData = await AccountService.getAllAccounts();
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const groupsData = await GroupService.getAllGroups();
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const templatesData = await TemplateService.getAllTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReferenceData();
    setRefreshing(false);
  };

  // Filter tasks based on current filters
  const filteredTasks = (tasks || []).filter(task => {
    // Status filter
    if (filterStatus !== 'all' && task.status !== filterStatus) {
      return false;
    }

    // Account filter
    if (filterAccount !== 'all' && task.accountId !== filterAccount) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const account = accounts.find(acc => acc.id === task.accountId);
      const group = groups.find(grp => grp.id === task.groupId);
      const template = templates.find(tmp => tmp.id === task.templateId);

      const searchLower = searchTerm.toLowerCase();
      return (
        account?.name.toLowerCase().includes(searchLower) ||
        group?.name.toLowerCase().includes(searchLower) ||
        template?.title.toLowerCase().includes(searchLower) ||
        task.notes?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  }).slice(0, maxTasks);

  const getAccountName = (accountId: string) => {
    return accounts.find(acc => acc.id === accountId)?.name || 'Unknown Account';
  };

  const getGroupName = (groupId: string) => {
    return groups.find(grp => grp.id === groupId)?.name || 'Unknown Group';
  };

  const getTemplateTitle = (templateId: string) => {
    return templates.find(tmp => tmp.id === templateId)?.title || 'Unknown Template';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const isLoading = loading || tasksLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <div className="text-muted-foreground">Loading scheduled tasks...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tasksError) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center text-red-600">
            <div className="text-lg mb-2">⚠️ Error Loading Tasks</div>
            <div className="text-sm">{tasksError}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Live Scheduled Tasks</CardTitle>
              <CardDescription>
                Real-time view of all scheduled posting tasks
              </CardDescription>
            </div>
            <Button onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? 'Refreshing...' : '🔄 Refresh'}
            </Button>
          </div>
        </CardHeader>
      )}

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Status Filter</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Account Filter</Label>
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id!}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Task Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl font-bold text-blue-600">
              {filteredTasks.filter(t => t.status === 'pending').length}
            </div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>

          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl font-bold text-yellow-600">
              {filteredTasks.filter(t => t.status === 'in_progress').length}
            </div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </div>

          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl font-bold text-green-600">
              {filteredTasks.filter(t => t.status === 'completed').length}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>

          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl font-bold text-gray-600">
              {filteredTasks.length}
            </div>
            <div className="text-sm text-muted-foreground">Showing</div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks found matching the current filters
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <div className="font-medium text-sm">
                        {task.date?.toLocaleDateString()} {task.date?.toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Scheduled Time
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-sm">
                        {getAccountName(task.accountId)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Account
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-sm">
                        {getGroupName(task.groupId)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Group
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-sm">
                        {getTemplateTitle(task.templateId)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Template
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(task.status)}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                    {task.notes && (
                      <div className="text-xs text-muted-foreground max-w-32 truncate">
                        {task.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}