'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ModernTabsNavigation } from '@/components/ui/modern-tabs-navigation';
import { Building2, Plus, Circle, CheckCircle, Search, Download, CheckSquare, Users, Bell, Calculator, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { NotificationsTab } from '@/components/external-crm/notifications-tab';
import { DailyCallsDashboard } from '@/components/external-crm/daily-calls-dashboard';
import { DailyWhatsAppDashboard } from '@/components/external-crm/daily-whatsapp-dashboard';
import { CalendarDashboardModern as CalendarDashboard } from '@/components/external-crm/calendar-dashboard-modern';
import { TasksList } from '@/components/tasks/tasks-list';
import { LeadGenerationForm } from '@/components/external-crm/lead-generation-form';
import { CallCenterDetailModal } from '@/components/external-crm/call-center-detail-modal';
import GroupsPostingPage from '@/app/groups-posting/page';

import { CallCenter, Suggestion } from '@/lib/types/external-crm';
import { FacebookAccount } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { TaskService } from '@/lib/services/task-service';
import { TaskNotificationService } from '@/lib/services/task-notification-service';
import { useNotifications } from '@/lib/notification-context';

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
  firebaseTaskId?: string;
  summary?: string;
}

interface DailyTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
  source?: 'firebase' | 'calendar' | 'groups';
  calendarEvent?: CalendarEvent; // Calendar event reference
  groupId?: string; // Call center ID for Firebase tasks
  accountId?: string; // Call center ID for Firebase tasks
}

export default function ExternalCRMPage() {
   const { user, logout, loading: authLoading } = useAuth();
   const router = useRouter();
   const { notifications } = useNotifications();
   const [activeTab, setActiveTab] = useState('dashboard');
  const [callCenters, setCallCenters] = useState<CallCenter[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Group edit modal state - moved to parent level
  const [showGroupEditModal, setShowGroupEditModal] = useState(false);
  const [editingGroupData, setEditingGroupData] = useState<any>(null);
  const [facebookAccounts, setFacebookAccounts] = useState<FacebookAccount[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingCallCenter, setEditingCallCenter] = useState<CallCenter | undefined>();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Cleanup notifications on unmount
  useEffect(() => {
    return () => {
      TaskNotificationService.cleanup();
    };
  }, []);

  // Check notification permission status
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    console.log('🔔 Setting up notification permission callback');
    // Set up callback for permission updates
    TaskNotificationService.setPermissionCallback((permission) => {
      console.log('🔔 Permission callback called with:', permission);
      setNotificationPermission(permission);
    });

    // Get initial permission status
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const initialPermission = Notification.permission;
      console.log('🔔 Initial permission from browser:', initialPermission);
      setNotificationPermission(initialPermission);
    } else {
      console.log('🔔 Notifications not supported');
    }
  }, []);

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
  const [newTaskLocation, setNewTaskLocation] = useState('');
  const [newTaskType, setNewTaskType] = useState<CalendarEvent['type']>('task');
  const [newTaskCallCenter, setNewTaskCallCenter] = useState('');
  const [newTaskSummary, setNewTaskSummary] = useState('');

  // Calendar refresh state
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState(0);

  // Task detail modal state
  const [showTaskCallCenterDetail, setShowTaskCallCenterDetail] = useState(false);
  const [selectedTaskCallCenter, setSelectedTaskCallCenter] = useState<CallCenter | null>(null);

  // Function to find call center by name or ID for tasks
  const findCallCenterByName = (nameOrId: string): CallCenter | null => {
    if (!nameOrId || !nameOrId.trim()) return null;

    // First try exact match by name
    let callCenter = callCenters.find(cc => cc.name === nameOrId.trim());
    if (callCenter) return callCenter;

    // Try exact match by ID
    callCenter = callCenters.find(cc => cc.id === nameOrId.trim());
    if (callCenter) return callCenter;

    // Try case-insensitive match by name
    callCenter = callCenters.find(cc => cc.name.toLowerCase() === nameOrId.trim().toLowerCase());
    if (callCenter) return callCenter;

    // Try partial match by name (contains)
    callCenter = callCenters.find(cc => cc.name.toLowerCase().includes(nameOrId.trim().toLowerCase()));
    if (callCenter) return callCenter;

    // Try partial match the other way
    callCenter = callCenters.find(cc => nameOrId.trim().toLowerCase().includes(cc.name.toLowerCase()));
    if (callCenter) return callCenter;

    console.log('❌ Could not find call center for name/ID:', nameOrId, 'Available names:', callCenters.map(cc => cc.name), 'Available IDs:', callCenters.map(cc => cc.id));
    return null;
  };

  // Function to handle clicking on call center name in tasks
  const handleTaskCallCenterClick = async (callCenterNameOrId: string, callCenterId?: string) => {
    console.log('🔍 [TASK-CLICK] Clicked on call center name/ID:', callCenterNameOrId, 'ID:', callCenterId);

    let callCenter = null;

    // First try to fetch by ID if provided
    if (callCenterId) {
      try {
        console.log('🔍 [TASK-CLICK] Trying to fetch by ID:', callCenterId);
        const response = await fetch(`/api/external-crm/${callCenterId}`);
        if (response.ok) {
          const data = await response.json();
          callCenter = data.data;
          console.log('✅ [TASK-CLICK] Found call center by ID:', callCenter?.name);
        } else {
          console.log('❌ [TASK-CLICK] Failed to fetch by ID, status:', response.status);
        }
      } catch (error) {
        console.error('❌ [TASK-CLICK] Error fetching by ID:', error);
      }
    }

    // If not found by ID, try searching via API (not limited to loaded call centers)
    if (!callCenter) {
      try {
        console.log('🔍 [TASK-CLICK] Searching via API for:', callCenterNameOrId);
        const response = await fetch(`/api/external-crm/search?q=${encodeURIComponent(callCenterNameOrId)}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.results && data.data.results.length > 0) {
            const results = data.data.results;
            // Find exact match first
            callCenter = results.find((cc: any) => cc.name === callCenterNameOrId);
            if (!callCenter) {
              // Then try case-insensitive match
              callCenter = results.find((cc: any) => cc.name.toLowerCase() === callCenterNameOrId.toLowerCase());
            }
            if (!callCenter && results.length === 1) {
              // If only one result, use it
              callCenter = results[0];
            }
            console.log('✅ [TASK-CLICK] Found call center via API:', callCenter?.name);
          }
        }
      } catch (error) {
        console.error('❌ [TASK-CLICK] Error searching via API:', error);
      }
    }

    // Last resort: search in loaded call centers
    if (!callCenter) {
      console.log('🔍 [TASK-CLICK] Searching by name in loaded call centers:', callCenterNameOrId);
      callCenter = findCallCenterByName(callCenterNameOrId);
    }

    console.log('🔍 [TASK-CLICK] Final call center result:', callCenter);
    if (callCenter) {
      setSelectedTaskCallCenter(callCenter);
      setShowTaskCallCenterDetail(true);
      console.log('✅ [TASK-CLICK] Modal should open for call center:', callCenter.name);
    } else {
      console.log('❌ [TASK-CLICK] No call center found for name/ID:', callCenterNameOrId);
      alert(`Call center "${callCenterNameOrId}" not found in database`);
    }
  };


  // Prevent multiple initializations
  const [initialized, setInitialized] = useState(false);


  // Load Facebook accounts
  const loadFacebookAccounts = async () => {
    try {
      const isDevelopment = process.env.NODE_ENV === 'development';
      const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

      if (!user?.uid && !(isDevelopment && bypassAuth)) {
        return;
      }

      const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      const q = query(collection(db, 'accountsVOIP'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const accountsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FacebookAccount[];

      setFacebookAccounts(accountsData);
      console.log('✅ Loaded Facebook accounts:', accountsData.length);
      console.log('📋 Facebook accounts data:', accountsData.map(acc => ({ id: acc.id, name: acc.name, accountId: acc.accountId, status: acc.status })));
    } catch (error) {
      console.error('❌ Error loading Facebook accounts:', error);
    }
  };

  // Main initialization effect - simplified to prevent infinite loops
  useEffect(() => {
    console.log('🚀 Initializing External CRM Page...');
    console.log('👤 Current user:', user);
    console.log('🔐 User authenticated:', !!user?.uid);
    console.log('🔄 Auth loading:', authLoading);

    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...');
      return;
    }

    // Check if we're bypassing authentication
    const isDevelopment = process.env.NODE_ENV === 'development';
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

    if (!user?.uid && !(isDevelopment && bypassAuth)) {
      console.log('❌ No authenticated user, redirecting to login');
      router.push('/');
      return;
    }

    console.log('✅ User authenticated or auth bypassed, loading data...');

    // Set loading to false since we have a user or we're bypassing auth
    setLoading(false);

    // Only load data if we haven't initialized yet
    if (!initialized) {
      console.log('🔄 First time initialization, loading all data...');
      setInitialized(true);

      // Load call centers and Facebook accounts initially
      loadCallCenters(true);
      loadFacebookAccounts();
    }
  }, [user?.uid, router, authLoading, initialized]);

  // Reload daily tasks when switching to tasks tab
  useEffect(() => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

    if (activeTab === 'tasks' && (user?.uid || (isDevelopment && bypassAuth))) {
      console.log('🔄 Tasks tab activated, reloading daily tasks...');
      loadDailyTasks();
    }
  }, [activeTab]);

  // Initialize notification service separately (non-blocking)
  useEffect(() => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

    console.log('🔔 useEffect for notification service initialization triggered, user:', !!user?.uid, 'bypass:', bypassAuth);

    if (user?.uid || (isDevelopment && bypassAuth)) {
      console.log('🔔 Initializing notification service...');
      // Initialize notification service asynchronously without blocking task loading
      TaskNotificationService.initialize().catch(error => {
        console.error('❌ Failed to initialize notification service:', error);
      });
    } else {
      console.log('🔔 Skipping notification service initialization - no user');
    }
  }, [user?.uid]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Daily tasks functions
  const loadDailyTasks = async () => {
    console.log('🔄 loadDailyTasks called');

    // Check if we're bypassing authentication (like other functions in this component)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

    if (!user?.uid && !(isDevelopment && bypassAuth)) {
      console.log('🔄 User not authenticated and not bypassing auth, skipping daily tasks load');
      return;
    }

    try {
      console.log('🔄 Loading daily tasks from /api/external-crm/today for user:', user?.uid || 'bypassed');

      // Use the dedicated /api/external-crm/today endpoint that properly combines
      // both Firebase tasks and calendar events for today
      const response = await fetch('/api/external-crm/today');
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Today API response:', data);
      
      // Convert the unified format from the API to DailyTask format
      const allTasks = data.items.map((item: any) => {
        console.log('🔔 Processing task item:', { id: item.id, title: item.title, time: item.time, date: item.date, source: item.source, completed: item.completed });
        return {
          id: item.id,
          title: item.title,
          description: item.description || '',
          completed: item.completed,
          createdAt: new Date(item.date + (item.time ? 'T' + item.time : 'T00:00:00')),
          completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
          source: item.source as 'firebase' | 'calendar' | 'groups',
          calendarEvent: item.source === 'calendar' ? {
            id: item.id.replace('calendar-', ''),
            title: item.title,
            description: item.description,
            date: item.date,
            time: item.time,
            location: item.location,
            type: item.type,
            callCenterId: item.callCenterId,
            callCenterName: item.callCenterName,
            status: item.completed ? 'completed' : 'pending',
            completedAt: item.completedAt,
            summary: item.summary || '',
          } : undefined,
          groupId: item.groupId,
          accountId: item.accountId,
        };
      });

      console.log('✅ All daily tasks (Firebase + Calendar):', allTasks.length, allTasks);
      setDailyTasks(allTasks);

      // Convert DailyTask format to TodayItem format for notifications
      const notificationTasks = allTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        date: task.createdAt.toISOString().split('T')[0],
        time: task.source === 'firebase'
          ? task.createdAt.toTimeString().split(' ')[0].substring(0, 5) // HH:MM format
          : task.calendarEvent?.time || '',
        completed: task.completed,
        completedAt: task.completedAt?.toISOString(),
        source: task.source || 'firebase',
        type: task.calendarEvent?.type,
        location: task.calendarEvent?.location,
        callCenterId: task.calendarEvent?.callCenterId,
        callCenterName: task.calendarEvent?.callCenterName,
        groupId: task.groupId,
        accountId: task.accountId,
        summary: task.calendarEvent?.summary,
      }));

      console.log('🔔 Converted tasks for notifications:', notificationTasks.map(t => ({ id: t.id, title: t.title, time: t.time, completed: t.completed })));

      // Update notifications for today's tasks
      TaskNotificationService.updateNotifications(notificationTasks);
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
    console.log('📝 Form data:', { newTaskTitle, newTaskDescription, newTaskDate, newTaskTime, newTaskLocation, newTaskType, newTaskCallCenter, editingTask: !!editingTask, userId: user?.uid });

    if (!newTaskTitle.trim()) {
      console.log('❌ Validation failed: no title');
      return;
    }

    if (!newTaskDate) {
      console.log('❌ Validation failed: no date');
      return;
    }

    // Check for user authentication, but allow development bypass
    const isDevelopment = process.env.NODE_ENV === 'development';
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
    
    if (!user?.uid && !(isDevelopment && bypassAuth)) {
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
    // Check for user authentication, but allow development bypass
    const isDevelopment = process.env.NODE_ENV === 'development';
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
    
    if (!newTaskTitle.trim() || !newTaskDate) {
      console.log('❌ Validation failed: missing title or date');
      return;
    }
    
    if (!user?.uid && !(isDevelopment && bypassAuth)) {
      console.log('❌ Validation failed: no user and not bypassing auth');
      return;
    }

    try {
      console.log('🔄 Creating daily task in Firebase...');
      console.log('📝 User ID:', user?.uid || 'bypassed');
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
        assignedTo: user?.uid || 'bypassed-user', // Use user ID or fallback for bypassed auth
        groupId: newTaskCallCenter || 'daily-task', // Use selected call center or placeholder
        accountId: newTaskCallCenter || 'daily-task', // Use selected call center or placeholder
        templateId: 'daily-task', // Use a placeholder for daily tasks
        notes: JSON.stringify(taskNotes),
      };

      console.log('📝 Task data:', taskData);
      const taskId = await TaskService.createTask(taskData);
      console.log('✅ Task created with ID:', taskId);

      // Also create a calendar event if date and time are provided
      if (newTaskDate && newTaskTime) {
        try {
          const calendarEvent = {
            title: newTaskTitle.trim(),
            description: newTaskDescription.trim() || newTaskTitle.trim(),
            date: newTaskDate,
            time: newTaskTime,
            location: newTaskLocation,
            type: newTaskType,
            callCenterId: newTaskCallCenter || '',
            status: 'pending',
            firebaseTaskId: taskId, // Link calendar event to Firebase task
            summary: newTaskSummary.trim() || '',
          };

          const response = await fetch('/api/external-crm/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(calendarEvent),
          });

          if (response.ok) {
            console.log('✅ Calendar event created successfully');
            // Trigger calendar refresh
            setCalendarRefreshTrigger(prev => prev + 1);
          } else {
            console.error('❌ Failed to create calendar event');
          }
        } catch (error) {
          console.error('❌ Error creating calendar event:', error);
        }
      }

      // Reload tasks to get the updated list (with a small delay to ensure calendar event is created)
      setTimeout(() => loadDailyTasks(), 500);

      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDate('');
      setNewTaskTime('');
      setNewTaskLocation('');
      setNewTaskType('task');
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

        // Also update linked calendar event if it exists
        const linkedCalendarEvent = dailyTasks.find(t =>
          t.source === 'calendar' && t.calendarEvent?.firebaseTaskId === taskId
        );
        if (linkedCalendarEvent && linkedCalendarEvent.calendarEvent) {
          await updateCalendarEventStatus(linkedCalendarEvent.calendarEvent.id, newStatus);
          // Trigger calendar refresh
          setCalendarRefreshTrigger(prev => prev + 1);
        }
      } else if (task.source === 'calendar' && task.calendarEvent) {
        await updateCalendarEventStatus(task.calendarEvent.id, newStatus);
        // Trigger calendar refresh
        setCalendarRefreshTrigger(prev => prev + 1);
      } else if (task.source === 'groups') {
        // Update group posting task status (only for completion, not uncompletion)
        if (newStatus === 'completed') {
          const { GroupsPostingGeneratorService } = await import('@/lib/services/groups-posting-generator-service');
          await GroupsPostingGeneratorService.updateTaskStatus(taskId.replace('group-', ''), 'completed');
        }
        // Note: Group tasks don't support uncompletion back to pending once started
      }

      // Reload tasks in background to ensure consistency
      setTimeout(() => {
        loadDailyTasks();
      }, 100);
    } catch (error) {
      console.error('❌ Error toggling task completion:', error);
      // Revert optimistic update on error
      const originalTask = dailyTasks.find(t => t.id === taskId);
      if (originalTask) {
        setDailyTasks(prevTasks =>
          prevTasks.map(t =>
            t.id === taskId
              ? {
                  ...t,
                  completed: originalTask.completed,
                  completedAt: originalTask.completedAt,
                  calendarEvent: originalTask.calendarEvent
                }
              : t
          )
        );
      }
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
        callCenterId: currentEvent.callCenterId || '',
        summary: currentEvent.summary || ''
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

        // Also delete linked calendar event if it exists
        const linkedCalendarEvent = dailyTasks.find(t =>
          t.source === 'calendar' && t.calendarEvent?.firebaseTaskId === taskId
        );
        if (linkedCalendarEvent && linkedCalendarEvent.calendarEvent) {
          const response = await fetch(`/api/external-crm/calendar/${linkedCalendarEvent.calendarEvent.id}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            console.log('✅ Calendar event deleted:', linkedCalendarEvent.calendarEvent.id);
            // Trigger calendar refresh
            setCalendarRefreshTrigger(prev => prev + 1);
          }
        }
      } else if (task.source === 'calendar' && task.calendarEvent) {
        // Delete calendar event
        const response = await fetch(`/api/external-crm/calendar/${task.calendarEvent.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          console.log('✅ Calendar event deleted:', task.calendarEvent.id);
          // Trigger calendar refresh
          setCalendarRefreshTrigger(prev => prev + 1);
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
        // Set other fields for Firebase tasks
        setNewTaskLocation('');
        setNewTaskType('task');
        setNewTaskCallCenter('');
      }
    } else if (task.source === 'calendar' && task.calendarEvent) {
      // For calendar events, use the calendar event data
      setNewTaskTitle(task.calendarEvent.title);
      setNewTaskDescription(task.calendarEvent.description || '');
      // Set date and time for calendar events
      setNewTaskDate(task.calendarEvent.date);
      setNewTaskTime(task.calendarEvent.time || '');
      // Set other fields for calendar events
      setNewTaskLocation(task.calendarEvent.location || '');
      setNewTaskType(task.calendarEvent.type);
      setNewTaskCallCenter(task.calendarEvent.callCenterId || '');
      setNewTaskSummary(task.calendarEvent.summary || '');
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

        // Update or create calendar event if date and time are provided
        if (newTaskDate && newTaskTime) {
          try {
            // Find existing linked calendar event
            const linkedCalendarEvent = dailyTasks.find(t =>
              t.source === 'calendar' && t.calendarEvent?.firebaseTaskId === editingTask.id
            );

            const calendarEventData = {
              title: newTaskTitle.trim(),
              description: newTaskDescription.trim() || newTaskTitle.trim(),
              date: newTaskDate,
              time: newTaskTime,
              location: newTaskLocation,
              type: newTaskType,
              callCenterId: newTaskCallCenter || '',
              status: 'pending',
              firebaseTaskId: editingTask.id, // Link calendar event to Firebase task
              summary: newTaskSummary.trim() || '',
            };

            let response;
            if (linkedCalendarEvent && linkedCalendarEvent.calendarEvent) {
              // Update existing calendar event
              console.log('🔄 Updating existing calendar event:', linkedCalendarEvent.calendarEvent.id);
              response = await fetch(`/api/external-crm/calendar/${linkedCalendarEvent.calendarEvent.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(calendarEventData),
              });
            } else {
              // Create new calendar event if none exists
              console.log('➕ Creating new calendar event for updated task');
              response = await fetch('/api/external-crm/calendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(calendarEventData),
              });
            }

            if (response.ok) {
              console.log('✅ Calendar event updated successfully');
              // Trigger calendar refresh
              setCalendarRefreshTrigger(prev => prev + 1);
            } else {
              console.error('❌ Failed to update calendar event');
            }
          } catch (error) {
            console.error('❌ Error updating calendar event:', error);
          }
        }
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
            callCenterId: newTaskCallCenter,
            summary: newTaskSummary.trim() || ''
          }),
        });

        if (response.ok) {
          console.log('✅ Calendar event updated:', editingTask.calendarEvent.id);
          // Trigger calendar refresh
          setCalendarRefreshTrigger(prev => prev + 1);
        }
      }

      // Reload tasks to get updated list (with a small delay to ensure calendar event is updated)
      setTimeout(() => loadDailyTasks(), 500);

      // Reset form and close dialog
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDate('');
      setNewTaskTime('');
      setNewTaskLocation('');
      setNewTaskType('task');
      setNewTaskCallCenter('');
      setNewTaskSummary('');
      setEditingTask(null);
      setShowAddTask(false);
    } catch (error) {
      console.error('❌ Error updating task:', error);
    }
  };




  const loadCallCenters = async (reset: boolean = false, page: number = 1, searchTerm?: string) => {
    try {
      if (reset) {
        setLoading(true);
        setCallCenters([]);
        setCurrentPage(1);
        setHasMore(true);
      }

      // Load call centers with pagination and search
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString()
      });

      // If there's a search term, load all records for client-side filtering
      if (searchTerm && searchTerm.trim()) {
        params.set('all', 'true');
        params.set('search', searchTerm.trim());
      }

      console.log(`🔍 Loading call centers - Page: ${page}, Limit: ${itemsPerPage}, Reset: ${reset}, Search: ${searchTerm || 'none'}`);

      const response = await fetch(`/api/external-crm?${params}`);
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 API Response:', data);
        const newCallCenters = data.data || [];
        const total = data.total || 0;

        console.log(`✅ Loaded ${newCallCenters.length} call centers. Total in database: ${total}`);
        console.log(`📊 Current page: ${page}, Has more pages: ${(newCallCenters.length + callCenters.length) < total}`);

        setTotalCount(total);

        if (reset || page === 1) {
          // Remove duplicates when resetting or loading first page
          const uniqueCallCenters = newCallCenters.filter((newCC: CallCenter, index: number, arr: CallCenter[]) =>
            arr.findIndex((cc: CallCenter) => cc.id === newCC.id) === index
          );
          setCallCenters(uniqueCallCenters);
          console.log(`🔄 Reset: Now showing ${uniqueCallCenters.length} of ${total} total call centers`);
        } else {
          // Remove duplicates when appending
          const existingIds = new Set(callCenters.map(cc => cc.id));
          const uniqueNewCallCenters = newCallCenters.filter((cc: CallCenter) => !existingIds.has(cc.id));
          setCallCenters(prev => [...prev, ...uniqueNewCallCenters]);
          console.log(`➕ Appended: Now showing ${callCenters.length + uniqueNewCallCenters.length} of ${total} total call centers`);
        }

        // Check if there are more pages (only if not searching)
        const hasMorePages = !searchTerm && (callCenters.length + newCallCenters.length) < total;
        console.log(`🔍 DEBUG: callCenters.length=${callCenters.length}, newCallCenters.length=${newCallCenters.length}, total=${total}, hasMorePages=${hasMorePages}, searching=${!!searchTerm}`);
        setHasMore(hasMorePages);

        if (hasMorePages) {
          console.log(`📋 More pages available! Next page would load ${Math.min(itemsPerPage, total - (callCenters.length + newCallCenters.length))} more records`);
        } else if (searchTerm) {
          console.log(`🎉 All ${total} call centers loaded for search results!`);
        } else {
          console.log(`🎉 All ${total} call centers are now loaded!`);
        }
      } else {
        console.error(`❌ Failed to load call centers: ${response.status} ${response.statusText}`);
        // If API fails, try to load from cache or show error
        if (reset) {
          setCallCenters([]);
          setTotalCount(0);
        }
      }
    } catch (error) {
      console.error('❌ Error loading call centers:', error);
      // If there's an error, ensure loading state is cleared
      if (reset) {
        setCallCenters([]);
        setTotalCount(0);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load all call centers initially (without search) - removed since we load in auth useEffect

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
      } else {
        console.error('Failed to load suggestions:', response.status, response.statusText);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestions([]);
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

   console.log('🔍 [PAGE] handleUpdateCallCenter called for ID:', editingCallCenter.id);
   console.log('🔍 [PAGE] Data being sent:', data);
   console.log('🔍 [PAGE] Destinations in data:', data.destinations);

   try {
     const response = await fetch(`/api/external-crm/${editingCallCenter.id}`, {
       method: 'PUT',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(data),
     });

     if (response.ok) {
       console.log('✅ [PAGE] Update API call successful');
       // Update the call center in the list
       setCallCenters(prev => prev.map(cc =>
         cc.id === editingCallCenter.id
           ? { ...cc, ...data }
           : cc
       ));
       setEditingCallCenter(undefined);
     } else {
       console.error('❌ [PAGE] Update API call failed with status:', response.status);
     }
   } catch (error) {
     console.error('❌ [PAGE] Error updating call center:', error);
   }
 };

  const handleDeleteCallCenter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this call center?')) return;

    try {
      const response = await fetch(`/api/external-crm/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCallCenters(prev => prev.filter(cc => cc.id !== id));
      }
    } catch (error) {
      console.error('Error deleting call center:', error);
    }
  };

  const handleBatchDelete = async (ids: string[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} call centers?`)) return;

    try {
      const response = await fetch('/api/external-crm/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', callCenterIds: ids }),
      });

      if (response.ok) {
        setCallCenters(prev => prev.filter(cc => !ids.includes(cc.id)));
      }
    } catch (error) {
      console.error('Error batch deleting call centers:', error);
    }
  };

  const handleBatchTag = async (ids: string[], tag: string) => {
    try {
      const response = await fetch('/api/external-crm/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tag', callCenterIds: ids, tag }),
      });

      if (response.ok) {
        // Update the call centers with the new tag
        setCallCenters(prev => prev.map(cc =>
          ids.includes(cc.id)
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


  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    // Fetch all call centers from database
    try {
      const response = await fetch('/api/external-crm?all=true');
      if (!response.ok) {
        alert('Failed to fetch all call centers for export');
        return;
      }
      const data = await response.json();
      const dataToExport = data.data || [];

      if (dataToExport.length === 0) {
        alert('No call centers to export');
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];

      if (format === 'csv') {
        // CSV Export
        const headers = ['Name', 'Country', 'City', 'Positions', 'Status', 'Phones', 'Emails', 'Website', 'Value', 'Currency'];
        const csvContent = [
          headers.join(','),
          ...dataToExport.map((cc: any) => [
            `"${cc.name.replace(/"/g, '""')}"`,
            cc.country,
            cc.city,
            cc.positions,
            cc.status,
            `"${cc.phones?.join('; ') || ''}"`,
            `"${cc.emails?.join('; ') || ''}"`,
            cc.website || '',
            cc.value || '',
            cc.currency || ''
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `call-centers-${timestamp}.csv`;
        link.click();

      } else if (format === 'json') {
        // JSON Export
        const jsonContent = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `call-centers-${timestamp}.json`;
        link.click();

      } else if (format === 'pdf') {
        // PDF Export (simple HTML to PDF)
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const htmlContent = `
            <html>
              <head>
                <title>Call Centers Export - ${timestamp}</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  h1 { color: #333; }
                  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                  th { background-color: #f2f2f2; }
                  .new-lead { background-color: #e8f5e8; }
                  .existing-lead { background-color: #ffe8e8; }
                </style>
              </head>
              <body>
                <h1>Call Centers Export</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
                <p>Total call centers: ${dataToExport.length}</p>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Country</th>
                      <th>City</th>
                      <th>Positions</th>
                      <th>Status</th>
                      <th>Phone</th>
                      <th>Website</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${dataToExport.map((cc: any) => `
                      <tr>
                        <td>${cc.name}</td>
                        <td>${cc.country}</td>
                        <td>${cc.city}</td>
                        <td>${cc.positions}</td>
                        <td>${cc.status}</td>
                        <td>${cc.phones?.[0] || 'N/A'}</td>
                        <td>${cc.website || 'N/A'}</td>
                        <td>${cc.value ? `${cc.value} ${cc.currency}` : 'N/A'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </body>
            </html>
          `;

          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.print();
        }
      }

      alert(`Exported ${dataToExport.length} call centers as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting call centers:', error);
      alert('Failed to export call centers');
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
        return <CallCentersDashboard callCenters={callCenters} loading={loading} totalCount={totalCount} user={user} />;

      case 'call-centers':
        return (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-2xl font-bold">Call Centers Management</h2>
              <div className="flex space-x-2">
                <BulkImport onImport={handleBulkImport} />
                <EnhancedImport onImport={handleBulkImport} />
                <Button
                  variant="outline"
                  onClick={() => handleExport('csv')}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport('json')}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport('pdf')}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </Button>
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
                hasMore={hasMore}
                onLoadMore={loadMoreCallCenters}
                totalCount={totalCount}
                onViewDuplicates={() => setActiveTab('duplicates')}
              />
            </div>
          </div>
        );

      case 'prospection':
        return (
          <iframe
            src="/prospection"
            className="w-full h-[800px] border-0 rounded-lg"
            title="Prospection"
          />
        );

      case 'daily-calls':
        return <DailyCallsDashboard />;

      case 'daily-whatsapp':
        return <DailyWhatsAppDashboard />;

      case 'integrity':
        return <DataIntegrityDashboard callCenters={callCenters} loading={loading} />;

      case 'financial':
        return <FinancialAnalyticsDashboard callCenters={callCenters} loading={loading} />;

      case 'calendar':
        return <CalendarDashboard refreshTrigger={calendarRefreshTrigger} onCallCenterClick={handleTaskCallCenterClick} />;

      case 'tasks':
        return (
          <div className="space-y-6">
            {/* Daily Tasks Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Today's Tasks</h2>
                  <p className="text-gray-600">Manage your daily tasks and track progress</p>
                  {/* Notification permission status */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-500">Notifications:</span>
                    <Badge variant={notificationPermission === 'granted' ? 'default' : notificationPermission === 'denied' ? 'destructive' : 'secondary'} className="text-xs">
                      {notificationPermission === 'granted' ? 'Enabled' : notificationPermission === 'denied' ? 'Blocked' : 'Not requested'}
                    </Badge>
                    {notificationPermission !== 'granted' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          console.log('🔔 Enable Notifications button clicked');
                          try {
                            const permission = await TaskNotificationService.requestPermission();
                            console.log('🔔 Permission result:', permission);
                            if (permission === 'granted') {
                              console.log('🔔 Permission granted, reloading tasks...');
                              // Reload tasks to schedule notifications
                              loadDailyTasks();
                            } else {
                              console.log('🔔 Permission not granted:', permission);
                            }
                          } catch (error) {
                            console.error('🔔 Error requesting permission:', error);
                          }
                        }}
                        className="text-xs"
                      >
                        Enable Notifications
                      </Button>
                    )}
                    {notificationPermission === 'granted' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('🔔 Test Notification button clicked');
                          TaskNotificationService.testNotification();
                        }}
                        className="text-xs ml-2"
                      >
                        Test Notification
                      </Button>
                    )}
                  </div>
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
                    setNewTaskLocation('');
                    setNewTaskType('task');
                    setNewTaskCallCenter('');
                    setNewTaskSummary('');
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
                      setNewTaskLocation('');
                      setNewTaskType('task');
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
                        <label className="block text-sm font-medium mb-2">Title</label>
                        <Input
                          value={newTaskTitle}
                          onChange={(e) => {
                            console.log('📝 Title changed:', e.target.value);
                            setNewTaskTitle(e.target.value);
                          }}
                          placeholder="Event title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <Textarea
                          value={newTaskDescription}
                          onChange={(e) => {
                            console.log('📝 Description changed:', e.target.value);
                            setNewTaskDescription(e.target.value);
                          }}
                          placeholder="Event description (optional)"
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
                          <label className="block text-sm font-medium mb-2">Time</label>
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
                        <label className="block text-sm font-medium mb-2">Location</label>
                        <Input
                          value={newTaskLocation}
                          onChange={(e) => {
                            console.log('📝 Location changed:', e.target.value);
                            setNewTaskLocation(e.target.value);
                          }}
                          placeholder="Event location (optional)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Type</label>
                        <Select value={newTaskType} onValueChange={(value: CalendarEvent['type']) =>
                          setNewTaskType(value)
                        }>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="call">Call</SelectItem>
                            <SelectItem value="task">Task</SelectItem>
                            <SelectItem value="reminder">Reminder</SelectItem>
                          </SelectContent>
                        </Select>
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
                      <div>
                        <label className="block text-sm font-medium mb-2">Summary</label>
                        <Textarea
                          value={newTaskSummary}
                          onChange={(e) => {
                            console.log('📝 Summary changed:', e.target.value);
                            setNewTaskSummary(e.target.value);
                          }}
                          placeholder="Enter summary of processes with this call center..."
                          rows={3}
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
                          setNewTaskLocation('');
                          setNewTaskType('task');
                          setNewTaskCallCenter('');
                          setNewTaskSummary('');
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
                      {dailyTasks.filter(task => task.completed).length} of {dailyTasks.length} tasks completed ({dailyTasks.length > 0 ? Math.round((dailyTasks.filter(task => task.completed).length / dailyTasks.length) * 100) : 0}% done)
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${dailyTasks.length > 0 ? Math.round((dailyTasks.filter(task => task.completed).length / dailyTasks.length) * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {dailyTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 p-4 border rounded-lg transition-colors ${
                        task.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                      } ${task.source === 'calendar' ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : task.source === 'groups' ? 'border-l-4 border-l-purple-500 bg-purple-50/30' : ''}`}
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
                          {task.source === 'groups' && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                              👥 Group Posting
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
                            🏢 <button
                              onClick={() => {
                                const nameOrId = task.groupId || task.accountId || '';
                                const isId = nameOrId && nameOrId !== 'daily-task' && nameOrId.length > 10; // Firebase IDs are long
                                handleTaskCallCenterClick(nameOrId, isId ? nameOrId : undefined);
                              }}
                              className="hover:underline hover:text-orange-800 transition-colors"
                            >
                              {task.groupId || task.accountId}
                            </button>
                          </div>
                        )}
                        {task.calendarEvent?.callCenterName && (
                          <div className="text-xs text-orange-600 mt-1">
                            🏢 <button
                              onClick={() => {
                                if (task.calendarEvent) {
                                  handleTaskCallCenterClick(task.calendarEvent.callCenterName!, task.calendarEvent.callCenterId);
                                }
                              }}
                              className="hover:underline hover:text-orange-800 transition-colors"
                            >
                              {task.calendarEvent.callCenterName}
                            </button>
                          </div>
                        )}
                        {task.calendarEvent?.summary && (
                          <div className="text-xs text-purple-600 mt-1 bg-purple-50 p-2 rounded border-l-2 border-purple-200">
                            📝 <strong>Summary:</strong> {task.calendarEvent.summary}
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

      case 'notifications':
        return <NotificationsTab />;

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



      case 'posting-posting':
        return (
          <iframe
            src="/posting"
            className="w-full h-[800px] border-0 rounded-lg"
            title="Posting Posting"
          />
        );

      case 'groups-posting':
        return <GroupsPostingPage onEditGroup={(groupData) => {
          setEditingGroupData(groupData);
          setShowGroupEditModal(true);
        }} />;

      case 'reports':
        return (
          <iframe
            src="/reports"
            className="w-full h-[800px] border-0 rounded-lg"
            title="Reports"
          />
        );

      default:
        return <CallCentersDashboard callCenters={callCenters} loading={loading} />;
    }
  };

  console.log('🔄 Rendering ExternalCRMPage component');
  console.log('👤 User state:', { user: !!user, userId: user?.uid, displayName: user?.displayName, email: user?.email });
  console.log('📊 Loading state:', loading);
  console.log('🏷️ Active tab:', activeTab);
  console.log('📋 Call centers count:', callCenters.length);
  console.log('📝 Suggestions count:', suggestions.length);

  // Show loading indicator if still loading OR if user is not authenticated (unless bypassing auth)
  const isDevelopment = process.env.NODE_ENV === 'development';
  const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
  const shouldBypassAuth = isDevelopment && bypassAuth;

  if (loading || (!user?.uid && !shouldBypassAuth)) {
    console.log('⏳ Showing loading indicator (loading:', loading, 'user:', !!user?.uid, 'bypass:', shouldBypassAuth, ')');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!user?.uid && !shouldBypassAuth ? 'Authenticating...' : 'Loading CRM...'}
          </p>
        </div>
      </div>
    );
  }

  console.log('✅ Rendering main content');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Group Edit Modal */}
      {showGroupEditModal && editingGroupData && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-50"
          style={{ zIndex: 99999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowGroupEditModal(false);
              setEditingGroupData(null);
            }
          }}
        >
          {(() => { console.log('Modal rendering with Facebook accounts:', facebookAccounts.length, facebookAccounts); return null; })()}
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-5 h-5 bg-green-600 rounded"></div>
              <h2 className="text-lg font-semibold">Edit Facebook Group</h2>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Group Name *</label>
                  <input
                    type="text"
                    value={editingGroupData.name || ''}
                    onChange={(e) => setEditingGroupData({...editingGroupData, name: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Group URL *</label>
                  <input
                    type="url"
                    value={editingGroupData.url || ''}
                    onChange={(e) => setEditingGroupData({...editingGroupData, url: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Member Count</label>
                  <input
                    type="number"
                    value={editingGroupData.memberCount || ''}
                    onChange={(e) => setEditingGroupData({...editingGroupData, memberCount: parseInt(e.target.value) || 0})}
                    className="w-full p-2 border rounded"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Language</label>
                  <select
                    value={editingGroupData.language || 'en'}
                    onChange={(e) => setEditingGroupData({...editingGroupData, language: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="en">English</option>
                    <option value="fr">French</option>
                    <option value="ar">Arabic</option>
                    <option value="es">Spanish</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ru">Russian</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Linked Facebook Account</label>
                  <select
                    value={editingGroupData.accountId || ''}
                    onChange={(e) => setEditingGroupData({...editingGroupData, accountId: e.target.value || undefined})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">No account linked</option>
                    {facebookAccounts.length === 0 ? (
                      <option disabled>No Facebook accounts available</option>
                    ) : (
                      facebookAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name || 'Unnamed'} ({account.accountId}) - {account.status} - {account.browser || 'No browser'}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select which Facebook account this group should be linked to for posting
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  onClick={() => {
                    setShowGroupEditModal(false);
                    setEditingGroupData(null);
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      // Update the group in Firestore
                      const { updateDoc, doc } = await import('firebase/firestore');
                      const { db } = await import('@/lib/firebase');
                      await updateDoc(doc(db, 'groupsVOIP', editingGroupData.id), {
                        name: editingGroupData.name,
                        url: editingGroupData.url,
                        memberCount: editingGroupData.memberCount,
                        language: editingGroupData.language,
                        updatedAt: new Date()
                      });
                      setShowGroupEditModal(false);
                      setEditingGroupData(null);
                      alert('Group updated successfully');
                      // Refresh would happen via the GroupsPostingPage component
                    } catch (error) {
                      console.error('Error updating group:', error);
                      alert('Failed to update group');
                    }
                  }}
                  disabled={!editingGroupData.name?.trim() || !editingGroupData.url?.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Update Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Call Center Detail Modal */}
      {console.log('🔍 [MODAL] Rendering modal - isOpen:', showTaskCallCenterDetail, 'callCenter:', selectedTaskCallCenter?.name)}
      <CallCenterDetailModal
        callCenter={selectedTaskCallCenter}
        isOpen={showTaskCallCenterDetail}
        onClose={() => {
          console.log('🔍 [MODAL] Closing modal');
          setShowTaskCallCenterDetail(false);
          setSelectedTaskCallCenter(null);
        }}
        onCallCenterUpdate={(updatedCallCenter) => {
          // Update the call center in the list
          setCallCenters(prev => prev.map(cc =>
            cc.id === updatedCallCenter.id ? updatedCallCenter : cc
          ));
          setShowTaskCallCenterDetail(false);
          setSelectedTaskCallCenter(null);
        }}
        onSummaryUpdate={async (callCenterId: string, summary: string) => {
          // Handle summary update separately - call API to update just the summary
          try {
            const response = await fetch(`/api/external-crm/call-centers/${callCenterId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                summary: summary.trim(),
                updatedAt: new Date().toISOString()
              })
            });

            if (response.ok) {
              // Update local state
              const updatedCallCenter = callCenters.find(cc => cc.id === callCenterId);
              if (updatedCallCenter) {
                const updated = { ...updatedCallCenter, summary: summary.trim() };
                setCallCenters(prev => prev.map(cc => cc.id === callCenterId ? updated : cc));
              }
              console.log('✅ [SUMMARY] Summary updated successfully');
            } else {
              console.error('❌ [SUMMARY] Failed to update summary');
              alert('Failed to save summary');
            }
          } catch (error) {
            console.error('❌ [SUMMARY] Error updating summary:', error);
            alert('Error saving summary');
          }
        }}
        onDelete={(id: string) => {
          // Remove the call center from the list
          setCallCenters(prev => prev.filter(cc => cc.id !== id));
          setShowTaskCallCenterDetail(false);
          setSelectedTaskCallCenter(null);
        }}
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Call Center CRM</h1>
              <p className="text-sm text-gray-600 hidden sm:block">Manage your call center operations</p>
            </div>
          </div>

          {/* Real-time Date and Time Display - Centered */}
          <div className="flex-1 text-center mx-4">
            <div className="inline-flex items-center px-6 py-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center">
                <div className="flex items-baseline gap-3">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 font-mono tracking-wider">
                    {currentTime.toLocaleTimeString('en-US', {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                  <div className="text-sm sm:text-base text-gray-600 font-medium">
                    {currentTime.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-sm text-gray-600 truncate max-w-[120px] sm:max-w-none">
              Welcome, {user?.displayName || user?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('simulator')}
              title="Price Simulator"
            >
              <Calculator className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('duplicates')}
              title="Duplicates Management"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/notifications')}
              className="relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {notifications.length > 9 ? '9+' : notifications.length}
                </Badge>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">Exit</span>
            </Button>
          </div>
        </div>

        {/* Modern Tabs Navigation */}
        <ModernTabsNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
