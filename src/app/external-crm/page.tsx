'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ModernTabsNavigation } from '@/components/ui/modern-tabs-navigation';
import { Building2, Plus, Circle, CheckCircle } from 'lucide-react';
import { CallCenterForm } from '@/components/external-crm/call-center-form';
import { CallCentersList } from '@/components/external-crm/call-centers-list';
import { CallCentersDashboard } from '@/components/external-crm/call-centers-dashboard';
import { FinancialAnalyticsDashboard } from '@/components/external-crm/financial-analytics-dashboard';
import { DataIntegrityDashboard } from '@/components/external-crm/data-integrity-dashboard';
import { SuggestionsList } from '@/components/external-crm/suggestions-list';
import { ScrapingControls } from '@/components/external-crm/scraping-controls';
import { BulkImport } from '@/components/external-crm/bulk-import';
import { EnhancedImport } from '@/components/external-crm/enhanced-import';
import { DemoDataLoader } from '@/components/external-crm/demo-data-loader';
import { Dashboard } from '@/components/dashboard/dashboard';
import { PriceSimulator } from '@/components/external-crm/price-simulator';
import { DuplicatesManagement } from '@/components/external-crm/duplicates-management';
import { DailyCallsDashboard } from '@/components/external-crm/daily-calls-dashboard';
import { CalendarDashboard } from '@/components/external-crm/calendar-dashboard';
import { TasksList } from '@/components/tasks/tasks-list';
import { CallCenter, Suggestion } from '@/lib/types/external-crm';
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

export default function ExternalCRMPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [callCenters, setCallCenters] = useState<CallCenter[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCallCenter, setEditingCallCenter] = useState<CallCenter | undefined>();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Daily tasks state
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskCallCenter, setNewTaskCallCenter] = useState('');

  useEffect(() => {
    console.log('🚀 Initializing External CRM Page...');
    console.log('👤 Current user:', user);
    console.log('🔐 User authenticated:', !!user?.uid);

    loadCallCenters(true);
    loadSuggestions();

    if (user?.uid) {
      console.log('✅ User authenticated, loading daily tasks...');
      loadDailyTasks();
    } else {
      console.log('❌ No authenticated user, skipping daily tasks load');
    }
  }, [user?.uid]);

  // Daily tasks functions
  const loadDailyTasks = async () => {
    if (!user?.uid) return;

    try {
      console.log('🔄 Loading daily tasks from Firebase for user:', user.uid);

      // Load Firebase tasks
      const todayTasks = await TaskService.getTodayTasks();
      console.log('📋 Today tasks from Firebase:', todayTasks.length, todayTasks);

      // Load calendar events for today
      const todayCalendarEvents = await getTodayCalendarEvents();
      console.log('📅 Today calendar events:', todayCalendarEvents.length, todayCalendarEvents);

      // Convert Firebase tasks to DailyTask format
      const convertedTasks = todayTasks.map(task => {
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

      // Convert calendar events to DailyTask format
      const convertedCalendarEvents = todayCalendarEvents.map((event: any) => ({
        id: `calendar-${event.id}`,
        title: event.title,
        description: event.description || '',
        completed: event.status === 'completed', // Check if calendar event is completed
        createdAt: new Date(event.date),
        completedAt: event.completedAt ? new Date(event.completedAt) : undefined,
        source: 'calendar' as const,
        calendarEvent: {
          ...event,
          status: event.status || 'pending', // Ensure status is set
          completedAt: event.completedAt || null
        }, // Keep reference to original event with status
      }));

      // Merge both types of tasks
      const allTasks = [...convertedTasks, ...convertedCalendarEvents];
      console.log('✅ All daily tasks (Firebase + Calendar):', allTasks.length, allTasks);

      setDailyTasks(allTasks);
    } catch (error) {
      console.error('❌ Error loading daily tasks:', error);
    }
  };

  // Helper function to get today's calendar events
  const getTodayCalendarEvents = async () => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Add cache-busting parameter to ensure fresh data
      const response = await fetch(`/api/external-crm/calendar?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        const allEvents = data.events || [];

        console.log('📅 Raw calendar events from API:', allEvents);

        // Filter events for today
        const todayEvents = allEvents.filter((event: CalendarEvent) =>
          event.date === todayStr || event.date.startsWith(todayStr)
        );

        console.log('📅 Today calendar events after filtering:', todayEvents);
        console.log('📅 Status of today events:', todayEvents.map((e: CalendarEvent) => ({ id: e.id, status: e.status, completedAt: e.completedAt })));

        return todayEvents;
      }
      return [];
    } catch (error) {
      console.error('❌ Error loading calendar events:', error);
      return [];
    }
  };

  const handleTaskSubmit = async () => {
    console.log('🔄 handleTaskSubmit called');
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

  const addDailyTask = async () => {
    if (!newTaskTitle.trim() || !user?.uid || !newTaskDate) return;

    try {
      console.log('🔄 Creating daily task in Firebase...');
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
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        taskData: {
          date: newTaskTime ? new Date(`${newTaskDate}T${newTaskTime}`) : new Date(`${newTaskDate}T00:00:00`),
          assignedTo: user?.uid || 'no-user',
          groupId: newTaskCallCenter || 'daily-task',
          accountId: newTaskCallCenter || 'daily-task',
          templateId: 'daily-task',
          notes: JSON.stringify({
            title: newTaskTitle.trim(),
            description: newTaskDescription.trim() || newTaskTitle.trim()
          }),
        },
        userId: user?.uid,
        authenticated: !!user
      });
    }
  };

  const toggleTaskCompletion = async (taskId: string) => {
    try {
      const task = dailyTasks.find(t => t.id === taskId);
      if (!task) return;

      const newStatus = task.completed ? 'pending' : 'completed';

      // Optimistically update the UI first
      setDailyTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === taskId
            ? {
                ...t,
                completed: !t.completed,
                completedAt: newStatus === 'completed' ? new Date() : undefined,
                calendarEvent: t.calendarEvent ? {
                  ...t.calendarEvent,
                  status: newStatus,
                  completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined
                } : undefined
              }
            : t
        )
      );

      // Then update the backend
      if (task.source === 'firebase') {
        if (newStatus === 'completed') {
          await TaskService.markTaskAsDone(taskId);
        } else {
          await TaskService.updateTask(taskId, { status: 'pending' });
        }
      } else if (task.source === 'calendar' && task.calendarEvent) {
        await updateCalendarEventStatus(task.calendarEvent.id, newStatus);
      }

      // Reload tasks in background to ensure consistency
      setTimeout(() => loadDailyTasks(), 100);
    } catch (error) {
      console.error('❌ Error toggling task completion:', error);
      // Revert optimistic update on error
      setDailyTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === taskId
            ? {
                ...t,
                completed: task.completed,
                completedAt: task.completedAt,
                calendarEvent: task.calendarEvent
              }
            : t
        )
      );
    }
  };

  // Helper function to update calendar event status
  const updateCalendarEventStatus = async (eventId: string, status: 'completed' | 'pending') => {
    try {
      // First get the current event data
      const currentEvent = dailyTasks.find(t => t.id === `calendar-${eventId}`)?.calendarEvent;
      console.log('🔍 Current event for update:', currentEvent);
      console.log('🔍 Event ID:', eventId);
      console.log('🔍 Task ID being searched:', `calendar-${eventId}`);

      if (!currentEvent) {
        console.error('❌ Event not found for status update');
        console.log('❌ Available task IDs:', dailyTasks.map(t => t.id));
        return;
      }

      if (!currentEvent.title || !currentEvent.date) {
        console.error('❌ Event missing required fields:', { title: currentEvent.title, date: currentEvent.date });
        return;
      }

      const updatePayload = {
        title: currentEvent.title,
        description: currentEvent.description || '',
        date: currentEvent.date,
        time: currentEvent.time || '',
        location: currentEvent.location || '',
        type: currentEvent.type,
        status: status,
        completedAt: status === 'completed' ? new Date().toISOString() : null,
        callCenterId: currentEvent.callCenterId || ''
      };

      console.log('📤 Update payload:', updatePayload);

      const response = await fetch(`/api/external-crm/calendar/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (response.ok) {
        console.log(`✅ Calendar event ${status}:`, eventId);
      } else {
        const errorData = await response.json();
        console.error('❌ Calendar API error:', errorData);
        console.error('❌ Response status:', response.status);
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
      console.error('❌ Error deleting daily task:', error);
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
        // Set call center for Firebase tasks (placeholder for now)
        setNewTaskCallCenter('');
      } catch (error) {
        setNewTaskTitle(task.title);
        setNewTaskDescription(task.description || '');
        // Set date and time for Firebase tasks
        setNewTaskDate(task.createdAt.toISOString().split('T')[0]);
        setNewTaskTime(task.createdAt.toTimeString().split(' ')[0].substring(0, 5));
        // Set call center for Firebase tasks (placeholder for now)
        setNewTaskCallCenter('');
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

  const completedTasks = dailyTasks.filter(task => task.completed).length;
  const totalTasks = dailyTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const loadCallCenters = async (reset: boolean = false, page: number = 1) => {
    try {
      if (reset) {
        setLoading(true);
        setCallCenters([]);
        setCurrentPage(1);
        setHasMore(true);
      }

      // Load call centers with pagination
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString()
      });

      console.log(`🔍 Loading call centers - Page: ${page}, Limit: ${itemsPerPage}, Reset: ${reset}`);

      const response = await fetch(`/api/external-crm?${params}`);
      if (response.ok) {
        const data = await response.json();
        const newCallCenters = data.data || [];
        const total = data.total || 0;

        console.log(`✅ Loaded ${newCallCenters.length} call centers. Total in database: ${total}`);
        console.log(`📊 Current page: ${page}, Has more pages: ${(newCallCenters.length + callCenters.length) < total}`);

        setTotalCount(total);

        if (reset || page === 1) {
          setCallCenters(newCallCenters);
          console.log(`🔄 Reset: Now showing ${newCallCenters.length} of ${total} total call centers`);
        } else {
          setCallCenters(prev => [...prev, ...newCallCenters]);
          console.log(`➕ Appended: Now showing ${callCenters.length + newCallCenters.length} of ${total} total call centers`);
        }

        // Check if there are more pages
        const hasMorePages = (callCenters.length + newCallCenters.length) < total;
        console.log(`🔍 DEBUG: callCenters.length=${callCenters.length}, newCallCenters.length=${newCallCenters.length}, total=${total}, hasMorePages=${hasMorePages}`);
        setHasMore(hasMorePages);

        if (hasMorePages) {
          console.log(`📋 More pages available! Next page would load ${Math.min(itemsPerPage, total - (callCenters.length + newCallCenters.length))} more records`);
        } else {
          console.log(`🎉 All ${total} call centers are now loaded!`);
        }
      } else {
        console.error(`❌ Failed to load call centers: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error loading call centers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreCallCenters = async () => {
    if (hasMore && !loading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      await loadCallCenters(false, nextPage);
    }
  };



  const loadSuggestions = async () => {
    try {
      const response = await fetch('/api/external-crm/suggestions');
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.data || []);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const handleCreateCallCenter = async (data: Omit<CallCenter, 'id' | 'createdAt'>) => {
    try {
      const response = await fetch('/api/external-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        // Add the new call center to the list
        const newCallCenter: CallCenter = {
          ...data,
          id: result.id,
          createdAt: new Date().toISOString(),
          contacts: data.contacts || [],
          steps: data.steps || [],
          callHistory: data.callHistory || [],
          recharges: data.recharges || [],
        };
        setCallCenters(prev => [...prev, newCallCenter]);
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error creating call center:', error);
    }
  };

  // Add demo call center data
  const addDemoCallCenter = async () => {
    const demoData: Omit<CallCenter, 'id' | 'createdAt'> = {
      name: 'A call test',
      country: 'Morocco',
      city: 'Casablanca',
      positions: 25,
      status: 'New',
      phones: ['+212 6 12 34 56 78'],
      emails: ['contact@calltest.ma'],
      website: 'www.calltest.ma',
      tags: ['telecom', 'outsourcing', 'b2b'],
      notes: 'Demo call center for testing purposes. Located in Casablanca with 25 positions available.',
      address: 'Technopark, Casablanca 20000',
      competitors: ['Orange', 'Inwi', 'Maroc Telecom'],
      socialMedia: ['https://facebook.com/calltest.ma'],
      value: 150000,
      currency: 'MAD',
      type: 'BPO',
      markets: ['Telecom', 'Banking', 'Insurance'],
      source: 'google',
      foundDate: '2024-01-15',
      lastContacted: null,
      archived: false,
      completed: false,
      updatedAt: new Date().toISOString(),
    };

    await handleCreateCallCenter(demoData);
  };

  const handleUpdateCallCenter = async (data: Omit<CallCenter, 'id' | 'createdAt'>) => {
    if (!editingCallCenter) return;

    try {
      const response = await fetch(`/api/external-crm/${editingCallCenter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // Update the call center in the list
        setCallCenters(prev => prev.map(cc =>
          cc.id === editingCallCenter.id
            ? { ...cc, ...data }
            : cc
        ));
        setEditingCallCenter(undefined);
      }
    } catch (error) {
      console.error('Error updating call center:', error);
    }
  };

  const handleDeleteCallCenter = async (id: number) => {
    if (!confirm('Are you sure you want to delete this call center?')) return;

    try {
      const response = await fetch(`/api/external-crm/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCallCenters(prev => prev.filter(cc => cc.id !== id.toString()));
      }
    } catch (error) {
      console.error('Error deleting call center:', error);
    }
  };

  const handleBatchDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} call centers?`)) return;

    try {
      const response = await fetch('/api/external-crm/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', callCenterIds: ids }),
      });

      if (response.ok) {
        setCallCenters(prev => prev.filter(cc => !ids.includes(parseInt(cc.id))));
      }
    } catch (error) {
      console.error('Error batch deleting call centers:', error);
    }
  };

  const handleBatchTag = async (ids: number[], tag: string) => {
    try {
      const response = await fetch('/api/external-crm/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tag', callCenterIds: ids, tag }),
      });

      if (response.ok) {
        // Update the call centers with the new tag
        setCallCenters(prev => prev.map(cc =>
          ids.includes(parseInt(cc.id))
            ? { ...cc, tags: [...(cc.tags || []), tag] }
            : cc
        ));
      }
    } catch (error) {
      console.error('Error batch tagging call centers:', error);
    }
  };


  const handleScrape = async (country: string, source: string) => {
    try {
      const response = await fetch('/api/external-crm/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, source }),
      });

      if (response.ok) {
        // Refresh suggestions after scraping
        loadSuggestions();
      }
    } catch (error) {
      console.error('Error triggering scraping:', error);
    }
  };

  const handleImportSuggestions = async (suggestionIds: string[]) => {
    try {
      const response = await fetch('/api/external-crm/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionIds }),
      });

      if (response.ok) {
        // Refresh both suggestions and call centers
        loadSuggestions();
        loadCallCenters(true); // Reset pagination when importing
      }
    } catch (error) {
      console.error('Error importing suggestions:', error);
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this suggestion?')) return;

    try {
      const response = await fetch(`/api/external-crm/suggestions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error('Error deleting suggestion:', error);
    }
  };

  const handleBulkImport = async (callCenters: any[]) => {
    try {
      const response = await fetch('/api/external-crm/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callCenters),
      });

      if (response.ok) {
        // Refresh call centers list
        loadCallCenters();
      } else {
        const error = await response.json();
        alert(`Import failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Error bulk importing:', error);
      alert('Failed to import call centers');
    }
  };

  const handleEdit = (callCenter: CallCenter) => {
    setEditingCallCenter(callCenter);
  };

  const handleFormSubmit = (data: Omit<CallCenter, 'id' | 'createdAt'>) => {
    if (editingCallCenter) {
      handleUpdateCallCenter(data);
    } else {
      handleCreateCallCenter(data);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingCallCenter(undefined);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <CallCentersDashboard callCenters={callCenters} loading={loading} totalCount={totalCount} />;

      case 'call-centers':
        return (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-2xl font-bold">Call Centers Management</h2>
              <div className="flex space-x-2">
                <BulkImport onImport={handleBulkImport} />
                <EnhancedImport onImport={handleBulkImport} />
                <Dialog open={showForm || !!editingCallCenter} onOpenChange={(open) => {
                  if (!open) handleFormCancel();
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setShowForm(true)}>
                      Add Call Center
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingCallCenter ? 'Edit Call Center' : 'Add Call Center'}
                      </DialogTitle>
                    </DialogHeader>
                    <CallCenterForm
                      callCenter={editingCallCenter}
                      onSubmit={handleFormSubmit}
                      onCancel={handleFormCancel}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="flex-1 overflow-hidden min-h-0">
              <CallCentersList
                callCenters={callCenters}
                onEdit={handleEdit}
                onDelete={handleDeleteCallCenter}
                onBatchDelete={handleBatchDelete}
                onBatchTag={handleBatchTag}
                loading={loading}
                hasMore={hasMore}
                onLoadMore={loadMoreCallCenters}
                totalCount={totalCount}
                onViewDuplicates={() => setActiveTab('duplicates')}
              />
            </div>
          </div>
        );

      case 'daily-calls':
        return <DailyCallsDashboard />;


      case 'integrity':
        return <DataIntegrityDashboard callCenters={callCenters} loading={loading} />;

      case 'financial':
        return <FinancialAnalyticsDashboard callCenters={callCenters} loading={loading} />;

      case 'calendar':
        return <CalendarDashboard />;

      case 'tasks':
        return (
          <div className="space-y-6">
            {/* Daily Tasks Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Today's Tasks</h2>
                  <p className="text-gray-600">Manage your daily tasks and track progress</p>
                </div>
                <Dialog open={showAddTask} onOpenChange={(open) => {
                  console.log('🔄 Dialog onOpenChange:', { open, currentShowAddTask: showAddTask });
                  if (!open) {
                    console.log('🔄 Closing dialog, resetting state');
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
                      console.log('🔘 Add Task button clicked in external-crm');
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
                            console.log('📝 Title changed:', e.target.value);
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
                            console.log('📝 Description changed:', e.target.value);
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
                              console.log('📝 Date changed:', e.target.value);
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
                              console.log('📝 Time changed:', e.target.value);
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
                            console.log('📝 Call center changed:', e.target.value);
                            setNewTaskCallCenter(e.target.value);
                          }}
                          placeholder="Enter call center name or ID"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => {
                          console.log('🔄 Cancel button clicked');
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
                          console.log('🔄 Submit button clicked');
                          handleTaskSubmit();
                        }}>
                          {editingTask ? 'Update Task' : 'Add Task'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

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
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-sm text-gray-600">
                      {completedTasks} of {totalTasks} tasks completed ({completionRate}% done)
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${completionRate}%` }}
                      ></div>
                    </div>
                  </div>

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
            </div>

            {/* Scheduled Posting Tasks Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold mb-4">Scheduled Posting Tasks</h3>
              <TasksList />
            </div>
          </div>
        );

      case 'simulator':
        return <PriceSimulator />;

      case 'duplicates':
        return (
          <DuplicatesManagement
            onRefresh={() => {
              loadCallCenters(true);
            }}
          />
        );

      case 'suggestions':
        return (
          <div className="space-y-4">
            <DemoDataLoader onDataLoaded={() => {
              loadCallCenters();
              loadSuggestions();
            }} />
            <ScrapingControls onScrape={handleScrape} />
            <SuggestionsList
              suggestions={suggestions}
              onImport={handleImportSuggestions}
              onDelete={handleDeleteSuggestion}
              loading={loading}
            />
          </div>
        );

      case 'posting-crm':
        return <Dashboard />;

      default:
        return <CallCentersDashboard callCenters={callCenters} loading={loading} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Call Center CRM</h1>
              <p className="text-sm text-gray-600">Manage your call center operations</p>
            </div>
          </div>
        </div>

        {/* Modern Tabs Navigation */}
        <ModernTabsNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}