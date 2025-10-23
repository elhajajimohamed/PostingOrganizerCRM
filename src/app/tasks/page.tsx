'use client';

import { useState, useEffect } from 'react';
import { TasksList } from '@/components/tasks/tasks-list';
import { NavigationHeader } from '@/components/ui/navigation-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { TaskService } from '@/lib/services/task-service';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  type: 'meeting' | 'call' | 'task' | 'reminder';
  color?: string;
  callCenterId?: string;
  callCenterName?: string;
  relatedType?: 'step' | 'callLog';
  relatedId?: string;
  status?: 'completed' | 'pending';
  completedAt?: string;
}

interface DailyTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
  source?: 'firebase' | 'calendar';
  calendarEvent?: CalendarEvent; // Calendar event reference
  groupId?: string; // Call center ID for Firebase tasks
  accountId?: string; // Call center ID for Firebase tasks
}

export default function TasksPage() {
  const { user } = useAuth();
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskCallCenter, setNewTaskCallCenter] = useState('');

  // Load daily tasks on component mount
  useEffect(() => {
    console.log('🔄 Tasks page loaded');
    console.log('👤 Current user:', user);
    console.log('🔐 User authenticated:', !!user?.uid);

    if (user?.uid) {
      console.log('✅ User authenticated, loading tasks...');
      loadDailyTasks();
    } else {
      console.log('❌ No authenticated user');
    }
  }, [user?.uid]);

  const loadDailyTasks = async () => {
    if (!user?.uid) return;

    try {
      console.log('🔄 Loading daily tasks for user:', user.uid);

      // Load tasks from Firebase
      const firebaseTasks = await TaskService.getAllTasks();
      console.log('📋 All tasks loaded:', firebaseTasks.length, firebaseTasks);

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      console.log('📅 Date range:', { startOfDay, endOfDay });

      // Filter tasks for today and convert to DailyTask format
      const todayTasks = firebaseTasks
        .filter(task => {
          const taskDate = task.date;
          const isToday = taskDate >= startOfDay && taskDate < endOfDay;
          console.log('🔍 Task filter:', {
            taskId: task.id,
            taskDate: taskDate,
            isToday,
            startOfDay,
            endOfDay
          });
          return isToday;
        })
        .map(task => {
          let title = 'Task';
          let description = '';

          try {
            // Try to parse notes as JSON (new format)
            if (task.notes) {
              const parsedNotes = JSON.parse(task.notes);
              if (parsedNotes && typeof parsedNotes === 'object') {
                title = parsedNotes.title || parsedNotes.description || 'Task';
                description = parsedNotes.description || '';
              } else {
                // Fallback for old format (just string)
                title = task.notes;
                description = task.notes;
              }
            }
          } catch (error) {
            // Fallback if JSON parsing fails
            title = task.notes || 'Task';
            description = task.notes || '';
          }

          return {
            id: task.id!,
            title,
            description,
            completed: task.status === 'completed',
            createdAt: task.createdAt || new Date(),
            completedAt: task.doneAt,
            source: 'firebase' as const,
            groupId: task.groupId,
            accountId: task.accountId,
          };
        });

      // Load calendar events for today
      const todayCalendarEvents = await getTodayCalendarEvents();
      console.log('📅 Today calendar events:', todayCalendarEvents.length, todayCalendarEvents);

      // Convert calendar events to DailyTask format
      const convertedCalendarEvents = todayCalendarEvents.map((event: any) => ({
        id: `calendar-${event.id}`,
        title: event.title,
        description: event.description || '',
        completed: event.status === 'completed', // Check if calendar event is completed
        createdAt: new Date(event.date),
        completedAt: event.completedAt ? new Date(event.completedAt) : undefined,
        source: 'calendar' as const,
        calendarEvent: event, // Keep reference to original event
      }));

      // Merge both types of tasks
      const allDailyTasks = [...todayTasks, ...convertedCalendarEvents];
      console.log('✅ All daily tasks (Firebase + Calendar):', allDailyTasks.length, allDailyTasks);

      setDailyTasks(allDailyTasks);
    } catch (error) {
      console.error('❌ Error loading daily tasks:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        userId: user?.uid
      });
    }
  };

  // Helper function to get today's calendar events
  const getTodayCalendarEvents = async (): Promise<CalendarEvent[]> => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

      const response = await fetch('/api/external-crm/calendar');
      if (response.ok) {
        const data = await response.json();
        const allEvents = data.events || [];

        // Filter events for today
        const todayEvents = allEvents.filter((event: CalendarEvent) =>
          event.date === todayStr || event.date.startsWith(todayStr)
        );

        return todayEvents;
      }
      return [];
    } catch (error) {
      console.error('❌ Error loading calendar events:', error);
      return [];
    }
  };

  // Removed saveDailyTasks function as we now use Firebase

  const addDailyTask = async () => {
    console.log('🚀 addDailyTask function called!');
    console.log('📝 Task data:', { newTaskTitle, newTaskDescription, newTaskDate, newTaskTime, newTaskCallCenter });
    console.log('👤 User ID:', user?.uid);
    console.log('🔐 User authenticated:', !!user);

    if (!newTaskTitle.trim() || !user?.uid || !newTaskDate) {
      console.log('❌ Validation failed - no title, user, or date');
      return;
    }

    try {
      console.log('🔄 Creating daily task...');
      // Create task in Firebase - store title and description separately in notes as JSON
      const taskNotes = {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || newTaskTitle.trim()
      };

      // Create the specified date and time
      const taskDateTime = newTaskTime ?
        new Date(`${newTaskDate}T${newTaskTime}`) :
        new Date(`${newTaskDate}T00:00:00`);

      const taskData = {
        date: taskDateTime,
        assignedTo: user.uid,
        groupId: newTaskCallCenter || 'daily-task', // Use selected call center or placeholder
        accountId: newTaskCallCenter || 'daily-task', // Use selected call center or placeholder
        templateId: 'daily-task', // Use a placeholder for daily tasks
        notes: JSON.stringify(taskNotes),
      };

      console.log('📝 Task data:', taskData);
      const taskId = await TaskService.createTask(taskData);
      console.log('✅ Task created with ID:', taskId);

      // Reload tasks to get the updated list
      await loadDailyTasks();

      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDate('');
      setNewTaskTime('');
      setNewTaskCallCenter('');
      setShowAddTask(false);
    } catch (error) {
      console.error('❌ Error creating daily task:', error);
      // Add more detailed error logging
      const taskData = {
        date: newTaskTime ? new Date(`${newTaskDate}T${newTaskTime}`) : new Date(`${newTaskDate}T00:00:00`),
        assignedTo: user?.uid || 'no-user',
        groupId: newTaskCallCenter || 'daily-task',
        accountId: newTaskCallCenter || 'daily-task',
        templateId: 'daily-task',
        notes: JSON.stringify({
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim() || newTaskTitle.trim()
        }),
      };
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        taskData: taskData,
        userId: user?.uid,
        authenticated: !!user
      };
      console.error('❌ Error details:', errorDetails);
    }
  };

  const toggleTaskCompletion = async (taskId: string) => {
    try {
      const task = dailyTasks.find(t => t.id === taskId);
      if (!task) return;

      if (task.completed) {
        // Mark as pending
        if (task.source === 'firebase') {
          await TaskService.updateTask(taskId, { status: 'pending' });
        } else if (task.source === 'calendar' && task.calendarEvent) {
          // Update calendar event status (remove completion if it exists)
          await updateCalendarEventStatus(task.calendarEvent.id, 'pending');
        }
      } else {
        // Mark as completed
        if (task.source === 'firebase') {
          await TaskService.markTaskAsDone(taskId);
        } else if (task.source === 'calendar' && task.calendarEvent) {
          // Update calendar event status to completed
          await updateCalendarEventStatus(task.calendarEvent.id, 'completed');
        }
      }

      // Reload tasks to get updated status
      await loadDailyTasks();
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  // Helper function to update calendar event status
  const updateCalendarEventStatus = async (eventId: string, status: 'completed' | 'pending') => {
    try {
      const response = await fetch(`/api/external-crm/calendar/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: status,
          completedAt: status === 'completed' ? new Date().toISOString() : null
        }),
      });

      if (response.ok) {
        console.log(`✅ Calendar event ${status}:`, eventId);
      }
    } catch (error) {
      console.error('❌ Error updating calendar event status:', error);
    }
  };

  const deleteDailyTask = async (taskId: string) => {
    try {
      const task = dailyTasks.find(t => t.id === taskId);
      if (!task) return;

      if (task.source === 'firebase') {
        await TaskService.deleteTask(taskId);
      } else if (task.source === 'calendar' && task.calendarEvent) {
        // Delete calendar event
        const response = await fetch(`/api/external-crm/calendar/${task.calendarEvent.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          console.log('✅ Calendar event deleted:', task.calendarEvent.id);
        }
      }

      // Reload tasks to get updated list
      await loadDailyTasks();
    } catch (error) {
      console.error('Error deleting daily task:', error);
    }
  };

  const editDailyTask = (task: DailyTask) => {
    setEditingTask(task);
    if (task.source === 'firebase') {
      // For manual tasks, parse the JSON notes to get title and description
      try {
        if (task.description) {
          const parsedNotes = JSON.parse(task.description);
          if (parsedNotes && typeof parsedNotes === 'object') {
            setNewTaskTitle(parsedNotes.title || '');
            setNewTaskDescription(parsedNotes.description || '');
          } else {
            setNewTaskTitle(task.title);
            setNewTaskDescription(task.description);
          }
        } else {
          setNewTaskTitle(task.title);
          setNewTaskDescription('');
        }
        // Set date and time for Firebase tasks
        setNewTaskDate(task.createdAt.toISOString().split('T')[0]);
        setNewTaskTime(task.createdAt.toTimeString().split(' ')[0].substring(0, 5));
        // Set call center for Firebase tasks
        setNewTaskCallCenter(task.groupId || task.accountId || '');
      } catch (error) {
        setNewTaskTitle(task.title);
        setNewTaskDescription(task.description || '');
        // Set date and time for Firebase tasks
        setNewTaskDate(task.createdAt.toISOString().split('T')[0]);
        setNewTaskTime(task.createdAt.toTimeString().split(' ')[0].substring(0, 5));
        // Set call center for Firebase tasks
        setNewTaskCallCenter(task.groupId || task.accountId || '');
      }
    } else if (task.source === 'calendar' && task.calendarEvent) {
      // For calendar events, use the calendar event data
      setNewTaskTitle(task.calendarEvent.title);
      setNewTaskDescription(task.calendarEvent.description || '');
      // Set date and time for calendar events
      setNewTaskDate(task.calendarEvent.date);
      setNewTaskTime(task.calendarEvent.time || '');
      // Set call center for calendar events
      setNewTaskCallCenter(task.calendarEvent.callCenterId || '');
    }
    setShowAddTask(true); // Reuse the same dialog
  };

  const updateDailyTask = async () => {
    if (!editingTask || !newTaskTitle.trim() || !newTaskDate) return;

    try {
      if (editingTask.source === 'firebase') {
        // Update Firebase task
        const taskNotes = {
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim() || newTaskTitle.trim()
        };

        // Create the specified date and time
        const taskDateTime = newTaskTime ?
          new Date(`${newTaskDate}T${newTaskTime}`) :
          new Date(`${newTaskDate}T00:00:00`);

        await TaskService.updateTask(editingTask.id, {
          notes: JSON.stringify(taskNotes),
          date: taskDateTime,
          groupId: newTaskCallCenter || 'daily-task',
          accountId: newTaskCallCenter || 'daily-task'
        });

        console.log('✅ Firebase task updated:', editingTask.id);
      } else if (editingTask.source === 'calendar' && editingTask.calendarEvent) {
        // Update calendar event
        const response = await fetch(`/api/external-crm/calendar/${editingTask.calendarEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newTaskTitle.trim(),
            description: newTaskDescription.trim(),
            date: newTaskDate,
            time: newTaskTime,
            location: editingTask.calendarEvent.location,
            type: editingTask.calendarEvent.type,
            callCenterId: newTaskCallCenter
          }),
        });

        if (response.ok) {
          console.log('✅ Calendar event updated:', editingTask.calendarEvent.id);
        }
      }

      // Reload tasks to get updated list
      await loadDailyTasks();

      // Reset form and close dialog
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDate('');
      setNewTaskTime('');
      setNewTaskCallCenter('');
      setEditingTask(null);
      setShowAddTask(false);
    } catch (error) {
      console.error('❌ Error updating task:', error);
    }
  };

  const handleTaskSubmit = async () => {
    console.log('🔄 handleTaskSubmit called in tasks page');
    console.log('📝 Form data:', { newTaskTitle, newTaskDescription, newTaskDate, newTaskTime, newTaskCallCenter, editingTask: !!editingTask, userId: user?.uid });

    if (!newTaskTitle.trim()) {
      console.log('❌ Validation failed: no title');
      return;
    }

    if (!newTaskDate) {
      console.log('❌ Validation failed: no date');
      return;
    }

    if (!user?.uid) {
      console.log('❌ Validation failed: no user');
      return;
    }

    try {
      if (editingTask) {
        console.log('🔄 Updating existing task...');
        await updateDailyTask();
      } else {
        console.log('🔄 Creating new task...');
        await addDailyTask();
      }
    } catch (error) {
      console.error('❌ Error in handleTaskSubmit:', error);
    }
  };

  const completedTasks = dailyTasks.filter(task => task.completed).length;
  const totalTasks = dailyTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader
        title="Tasks"
        subtitle="Manage your scheduled posting tasks"
      />
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Daily Tasks Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Today's Tasks
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {completedTasks} of {totalTasks} tasks completed ({completionRate}% done)
                </p>
              </div>
              <Dialog open={showAddTask} onOpenChange={(open) => {
                console.log('🔄 Tasks page dialog onOpenChange:', { open, currentShowAddTask: showAddTask });
                if (!open) {
                  console.log('🔄 Closing tasks dialog, resetting state');
                  setShowAddTask(false);
                  setEditingTask(null);
                  setNewTaskTitle('');
                  setNewTaskDescription('');
                  setNewTaskDate('');
                  setNewTaskTime('');
                  setNewTaskCallCenter('');
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    console.log('🔘 Add Task button clicked in tasks page');
                    setEditingTask(null);
                    // Set default date to today
                    const today = new Date().toISOString().split('T')[0];
                    setNewTaskDate(today);
                    setNewTaskTime('');
                    setNewTaskCallCenter('');
                    setNewTaskTitle('');
                    setNewTaskDescription('');
                    setShowAddTask(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingTask ? 'Edit Task' : 'Add New Daily Task'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Task Title</label>
                      <Input
                        value={newTaskTitle}
                        onChange={(e) => {
                          console.log('📝 Tasks page title changed:', e.target.value);
                          setNewTaskTitle(e.target.value);
                        }}
                        placeholder="What needs to be done?"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                      <Textarea
                        value={newTaskDescription}
                        onChange={(e) => {
                          console.log('📝 Tasks page description changed:', e.target.value);
                          setNewTaskDescription(e.target.value);
                        }}
                        placeholder="Additional details..."
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Date</label>
                        <Input
                          type="date"
                          value={newTaskDate}
                          onChange={(e) => {
                            console.log('📝 Tasks page date changed:', e.target.value);
                            setNewTaskDate(e.target.value);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Time (Optional)</label>
                        <Input
                          type="time"
                          value={newTaskTime}
                          onChange={(e) => {
                            console.log('📝 Tasks page time changed:', e.target.value);
                            setNewTaskTime(e.target.value);
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Call Center (Optional)</label>
                      <Input
                        value={newTaskCallCenter}
                        onChange={(e) => {
                          console.log('📝 Tasks page call center changed:', e.target.value);
                          setNewTaskCallCenter(e.target.value);
                        }}
                        placeholder="Enter call center name or ID"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        console.log('🔄 Tasks page cancel button clicked');
                        setShowAddTask(false);
                        setEditingTask(null);
                        setNewTaskTitle('');
                        setNewTaskDescription('');
                        setNewTaskDate('');
                        setNewTaskTime('');
                        setNewTaskCallCenter('');
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={() => {
                        console.log('🔄 Tasks page submit button clicked');
                        handleTaskSubmit();
                      }}>
                        {editingTask ? 'Update Task' : 'Add Task'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {dailyTasks.length === 0 ? (
              <div className="text-center py-8">
                <Circle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">No tasks for today</h3>
                <p className="text-gray-600 mb-4">Add your first task to get started!</p>
                <Button onClick={() => setShowAddTask(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Task
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {dailyTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 p-4 border rounded-lg transition-colors ${
                      task.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                    } ${task.source === 'calendar' ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''}`}
                  >
                    <button
                      onClick={() => toggleTaskCompletion(task.id)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {task.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className={`w-5 h-5 ${task.source === 'calendar' ? 'text-blue-400 hover:text-blue-600' : 'text-gray-400 hover:text-gray-600'}`} />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                          {task.title}
                        </h4>
                        {task.source === 'calendar' && (
                          <Badge variant="secondary" className="text-xs">
                            📅 Calendar
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className={`text-sm mt-1 ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                          {task.description}
                        </p>
                      )}
                      {task.calendarEvent?.time && (
                        <p className="text-xs text-blue-600 mt-1">
                          🕐 {task.calendarEvent.time}
                        </p>
                      )}
                      {task.calendarEvent?.location && (
                        <p className="text-xs text-green-600 mt-1">
                          📍 {task.calendarEvent.location}
                        </p>
                      )}
                      {/* Show scheduled date and time for Firebase tasks */}
                      {task.source === 'firebase' && (
                        <div className="text-xs text-purple-600 mt-1">
                          📅 {task.createdAt.toLocaleDateString()}
                          {task.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) !== '00:00' &&
                            ` at ${task.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </div>
                      )}
                      {/* Show call center information */}
                      {(task.source === 'firebase' && (task.groupId !== 'daily-task' || task.accountId !== 'daily-task')) && (
                        <div className="text-xs text-orange-600 mt-1">
                          🏢 {task.groupId || task.accountId}
                        </div>
                      )}
                      {task.calendarEvent?.callCenterName && (
                        <div className="text-xs text-orange-600 mt-1">
                          🏢 {task.calendarEvent.callCenterName}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={task.completed ? 'default' : 'outline'} className="text-xs">
                          {task.completed ? 'Completed' : 'Pending'}
                        </Badge>
                        {task.completedAt && (
                          <span className="text-xs text-gray-500">
                            Done at {task.completedAt.toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editDailyTask(task)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Edit task"
                      >
                        ✏️
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDailyTask(task.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete task"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduled Posting Tasks Section */}
        <TasksList />
      </div>
    </div>
  );
}