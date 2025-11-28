'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Task, CreateTaskData, FacebookAccount, FacebookGroup, Template } from '@/lib/types';
import { TaskService } from '@/lib/services/task-service';
import { AccountService } from '@/lib/services/account-service';
import { GroupService } from '@/lib/services/group-service';
import { TemplateService } from '@/lib/services/template-service';
import { useAuth } from '@/lib/auth-context';

interface TaskFormProps {
  task?: Task;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TaskForm({ task, onSuccess, onCancel }: TaskFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateTaskData>({
    date: task?.date || new Date(),
    assignedTo: task?.assignedTo || user?.uid || '',
    groupId: task?.groupId || '',
    accountId: task?.accountId || '',
    templateId: task?.templateId || '',
    notes: task?.notes || '',
  });
  const [accounts, setAccounts] = useState<FacebookAccount[]>([]);
  const [groups, setGroups] = useState<FacebookGroup[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load related data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [accountsData, groupsData, templatesData] = await Promise.all([
          AccountService.getAllAccounts(),
          GroupService.getAllGroups(),
          TemplateService.getAllTemplates(),
        ]);
        setAccounts(accountsData);
        setGroups(groupsData);
        setTemplates(templatesData);
      } catch (error) {
        console.error('Failed to load form data:', error);
      }
    };

    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (task?.id) {
        // Update existing task
        await TaskService.updateTask(task.id, formData);
      } else {
        // Create new task
        const taskData = {
          ...formData,
          date: formData.date instanceof Date ? formData.date : new Date(formData.date),
        };
        await TaskService.createTask(taskData);
      }
      onSuccess();
    } catch (err: unknown) {
      console.error('Task save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateTaskData, value: string | Date) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{task ? 'Edit Task' : 'Create New Task'}</CardTitle>
        <CardDescription>
          {task ? 'Update the posting task' : 'Schedule a new posting task'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formatDateForInput(formData.date)}
                onChange={(e) => handleChange('date', new Date(e.target.value))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Input
                id="assignedTo"
                value={formData.assignedTo}
                onChange={(e) => handleChange('assignedTo', e.target.value)}
                placeholder="User ID"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="groupId">Facebook Group</Label>
              <Select value={formData.groupId} onValueChange={(value) => handleChange('groupId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id!}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountId">Facebook Account</Label>
              <Select value={formData.accountId} onValueChange={(value) => handleChange('accountId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id!}>
                      {account.name} ({account.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="templateId">Template</Label>
            <Select value={formData.templateId} onValueChange={(value) => handleChange('templateId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id!}>
                    {template.title} ({template.placeholders.length} placeholders)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes for this task"
              value={formData.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
