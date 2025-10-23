'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Task } from '@/lib/types';
import { TaskService } from '@/lib/services/task-service';
import { TaskForm } from './task-form';
import { useAuth } from '@/lib/auth-context';
import { useRealtimeTasks } from '@/lib/hooks/use-realtime-data';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function TasksList() {
  const { user } = useAuth();
  const { data: tasks, loading } = useRealtimeTasks(user?.uid);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [viewMode, setViewMode] = useState<'all' | 'today' | 'upcoming'>('all');

  // Filter tasks based on view mode and user selection
  useEffect(() => {
    let filtered = tasks;

    // Apply view mode filters
    if (viewMode === 'today') {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      filtered = filtered.filter(task =>
        task.date >= startOfDay && task.date < endOfDay
      );
    } else if (viewMode === 'upcoming') {
      const today = new Date();
      const futureDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
      filtered = filtered.filter(task =>
        task.date >= today && task.date <= futureDate
      );
    }

    setFilteredTasks(filtered);
  }, [tasks, viewMode]);

  // Filter tasks based on search term and status
  useEffect(() => {
    let filtered = tasks;

    // Filter by search term (search in notes)
    if (searchTerm.trim()) {
      filtered = filtered.filter(task =>
        task.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      if (filterStatus === 'overdue') {
        const today = new Date();
        filtered = filtered.filter(task =>
          task.status !== 'completed' &&
          task.date &&
          task.date < today
        );
      } else {
        filtered = filtered.filter(task => task.status === filterStatus);
      }
    }

    setFilteredTasks(filtered);
  }, [searchTerm, filterStatus, tasks]);

  // Handle form success
  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTask(undefined);
    // Real-time updates will automatically refresh the data
  };

  // Handle form cancel
  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTask(undefined);
  };

  // Handle edit
  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  // Handle mark as done
  const handleMarkAsDone = async (task: Task) => {
    try {
      await TaskService.markTaskAsDone(task.id!, 'Completed via dashboard');
      // Real-time updates will automatically refresh the data
    } catch (error) {
      console.error('Failed to mark task as done:', error);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingTask?.id) return;

    try {
      await TaskService.deleteTask(deletingTask.id);
      setDeletingTask(null);
      // Real-time updates will automatically refresh the data
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string, isOverdue: boolean = false) => {
    if (isOverdue) return 'destructive';
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Check if task is overdue
  const isTaskOverdue = (task: Task) => {
    return task.status !== 'completed' &&
           task.date &&
           task.date < new Date();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (showForm) {
    return (
      <TaskForm
        task={editingTask}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Posting Tasks</h2>
          <p className="text-gray-600">Manage your scheduled posting tasks</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          Schedule New Task
        </Button>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('all')}
        >
          All Tasks
        </Button>
        <Button
          variant={viewMode === 'today' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('today')}
        >
          Today's Tasks
        </Button>
        <Button
          variant={viewMode === 'upcoming' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('upcoming')}
        >
          Upcoming (7 days)
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-semibold mb-2">
              {tasks.length === 0 ? 'No tasks yet' : 'No tasks found'}
            </h3>
            <p className="text-gray-600 text-center mb-4">
              {tasks.length === 0
                ? 'Schedule your first posting task to get started'
                : 'Try adjusting your filters or view mode'
              }
            </p>
            {tasks.length === 0 && (
              <Button onClick={() => setShowForm(true)}>
                Schedule Your First Task
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => {
            const overdue = isTaskOverdue(task);
            return (
              <Card key={task.id} className={`relative ${overdue ? 'border-red-200' : ''}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {task.date?.toLocaleDateString()}
                      </CardTitle>
                      <CardDescription>
                        {task.date?.toLocaleTimeString()}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant(task.status, overdue)}>
                      {overdue ? 'Overdue' : task.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Task #{task.id?.slice(-6)}
                    </p>
                    {task.notes && (
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {task.notes}
                      </p>
                    )}
                    <div className="text-xs text-gray-500">
                      Created: {task.createdAt?.toLocaleDateString()}
                    </div>

                    <div className="flex gap-2 mt-4">
                      {task.status !== 'completed' && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsDone(task)}
                          className="flex-1"
                        >
                          Mark Done
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(task)}
                        className="flex-1"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeletingTask(task)}
                        className="flex-1"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTask} onOpenChange={() => setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}