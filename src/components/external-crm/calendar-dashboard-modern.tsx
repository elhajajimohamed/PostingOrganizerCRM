'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, MapPin, Bell, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

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

interface CalendarDashboardProps {
  refreshTrigger?: number;
  onCallCenterClick?: (callCenterName: string) => void;
}

export function CalendarDashboardModern({ refreshTrigger, onCallCenterClick }: CalendarDashboardProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  // Form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    type: 'meeting' as CalendarEvent['type'],
    callCenterId: '',
    callCenterName: '',
    summary: ''
  });

  // Call center search state
  const [callCenterSearch, setCallCenterSearch] = useState('');
  const [allCallCenters, setAllCallCenters] = useState<any[]>([]);
  const [filteredCallCenters, setFilteredCallCenters] = useState<any[]>([]);
  const [showCallCenterSuggestions, setShowCallCenterSuggestions] = useState(false);
  const [autocompleteSuggestion, setAutocompleteSuggestion] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [callCentersLoading, setCallCentersLoading] = useState(false);

  // Function to find call center by name or ID for calendar events
  const findCallCenterByName = (nameOrId: string): any | null => {
    if (!nameOrId || !nameOrId.trim()) return null;

    // First try exact match by name
    let callCenter = allCallCenters.find((cc: any) => cc.name === nameOrId.trim());
    if (callCenter) return callCenter;

    // Try exact match by ID
    callCenter = allCallCenters.find((cc: any) => cc.id === nameOrId.trim());
    if (callCenter) return callCenter;

    // Try case-insensitive match by name
    callCenter = allCallCenters.find((cc: any) => cc.name.toLowerCase() === nameOrId.trim().toLowerCase());
    if (callCenter) return callCenter;

    // Try partial match by name (contains)
    callCenter = allCallCenters.find((cc: any) => cc.name.toLowerCase().includes(nameOrId.trim().toLowerCase()));
    if (callCenter) return callCenter;

    // Try partial match the other way
    callCenter = allCallCenters.find((cc: any) => nameOrId.trim().toLowerCase().includes(cc.name.toLowerCase()));
    if (callCenter) return callCenter;

    console.log('❌ Could not find call center for name/ID:', nameOrId, 'Available names:', allCallCenters.map((cc: any) => cc.name), 'Available IDs:', allCallCenters.map((cc: any) => cc.id));
    return null;
  };

  // Handle call center click in calendar events
  const handleCallCenterClick = (callCenterName: string) => {
    console.log('🔍 [CALENDAR-CLICK] Clicked on call center name:', callCenterName);
    if (onCallCenterClick) {
      onCallCenterClick(callCenterName);
    } else {
      // Fallback: find the call center and show alert
      const callCenter = findCallCenterByName(callCenterName);
      console.log('🔍 [CALENDAR-CLICK] Found call center:', callCenter);
      if (callCenter) {
        alert(`Call center: ${callCenter.name}\nCountry: ${callCenter.country}\nCity: ${callCenter.city}\nPositions: ${callCenter.positions || 'N/A'}`);
      } else {
        console.log('❌ [CALENDAR-CLICK] No call center found for name:', callCenterName);
        alert(`Call center "${callCenterName}" not found in database`);
      }
    }
  };

  useEffect(() => {
    loadEvents();
    loadAllCallCenters();
  }, [refreshTrigger]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/external-crm/calendar');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllCallCenters = async () => {
    try {
      setCallCentersLoading(true);
      // Load all call centers with a higher limit
      const response = await fetch('/api/external-crm?limit=500&loadAll=true');
      if (response.ok) {
        const data = await response.json();
        let callCenters = data.data || [];

        // Fetch prospects to filter out call centers that are still in prospection
        try {
          const prospectsResponse = await fetch('/api/prospection/all');
          if (prospectsResponse.ok) {
            const prospectsData = await prospectsResponse.json();
            const prospects = prospectsData.prospects || [];

            // Create a set of prospect names for quick lookup
            const prospectNames = new Set(prospects.map((p: any) => p.name.toLowerCase().trim()));

            // Filter out call centers that are still in prospection
            callCenters = callCenters.filter((center: any) =>
              !prospectNames.has(center.name.toLowerCase().trim())
            );

            console.log(`Filtered out ${data.data.length - callCenters.length} call centers that are still in prospection`);
          }
        } catch (prospectsError) {
          console.error('Error fetching prospects for filtering:', prospectsError);
          // Continue with unfiltered call centers if prospects fetch fails
        }

        setAllCallCenters(callCenters);
        setFilteredCallCenters(callCenters); // Show filtered list initially
      }
    } catch (error) {
      console.error('Error loading call centers:', error);
    } finally {
      setCallCentersLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    try {
      const response = await fetch('/api/external-crm/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventForm),
      });

      if (response.ok) {
        const newEvent = await response.json();
        setEvents(prev => [...prev, newEvent]);
        setShowEventDialog(false);
        resetForm();

        // If a call center is tagged, create a step for it
        if (eventForm.callCenterId && eventForm.callCenterName) {
          await createStepForCallCenter(newEvent);
        }
      }
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;

    try {
      const response = await fetch(`/api/external-crm/calendar/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventForm),
      });

      if (response.ok) {
        setEvents(prev => prev.map(event =>
          event.id === editingEvent.id ? { ...event, ...eventForm } : event
        ));
        setShowEventDialog(false);
        setEditingEvent(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`/api/external-crm/calendar/${eventId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setEvents(prev => prev.filter(event => event.id !== eventId));
        setSelectedEvents(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleBulkDeleteEvents = async () => {
    if (selectedEvents.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedEvents.size} selected events?`)) return;

    try {
      const deletePromises = Array.from(selectedEvents).map(eventId =>
        fetch(`/api/external-crm/calendar/${eventId}`, {
          method: 'DELETE',
        })
      );

      const results = await Promise.all(deletePromises);
      const successfulDeletes = results.filter(r => r.ok).length;

      if (successfulDeletes > 0) {
        setEvents(prev => prev.filter(event => !selectedEvents.has(event.id)));
        setSelectedEvents(new Set());
        setShowBulkDelete(false);
        alert(`Successfully deleted ${successfulDeletes} events`);
      }
    } catch (error) {
      console.error('Error bulk deleting events:', error);
      alert('Error deleting some events');
    }
  };

  const toggleEventSelection = (eventId: string) => {
    setSelectedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const selectAllEventsForDate = () => {
    if (!selectedDate) return;
    const dateEvents = getEventsForDate(selectedDate);
    const eventIds = dateEvents.map(event => event.id);
    setSelectedEvents(new Set(eventIds));
  };

  const clearSelection = () => {
    setSelectedEvents(new Set());
  };

  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      type: 'meeting',
      callCenterId: '',
      callCenterName: '',
      summary: ''
    });
    setCallCenterSearch('');
    setFilteredCallCenters(allCallCenters);
    setShowCallCenterSuggestions(false);
  };

  const openEventDialog = (date?: Date, event?: CalendarEvent) => {
    if (event) {
      setEditingEvent(event);
      setEventForm({
        title: event.title,
        description: event.description || '',
        date: event.date,
        time: event.time || '',
        location: event.location || '',
        type: event.type,
        callCenterId: event.callCenterId || '',
        callCenterName: event.callCenterName || '',
        summary: event.summary || ''
      });
      setCallCenterSearch(event.callCenterName || '');
    } else if (date) {
      setEventForm({
        ...eventForm,
        date: format(date, 'yyyy-MM-dd'),
        callCenterId: '',
        callCenterName: ''
      });
      setCallCenterSearch('');
    }
    setShowEventDialog(true);
  };

  // Search for call centers in the loaded list
  const searchCallCenters = (query: string) => {
    if (!query.trim()) {
      // If empty, show all call centers
      setFilteredCallCenters(allCallCenters);
      setShowCallCenterSuggestions(true);
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    const filtered = allCallCenters.filter(callCenter =>
      callCenter.name.toLowerCase().includes(searchTerm) ||
      (callCenter.city && callCenter.city.toLowerCase().includes(searchTerm)) ||
      (callCenter.country && callCenter.country.toLowerCase().includes(searchTerm))
    ).slice(0, 20); // Limit to 20 results for better UX

    setFilteredCallCenters(filtered);
    setShowCallCenterSuggestions(true);

    // Find auto-complete suggestion
    const exactMatch = allCallCenters.find(callCenter =>
      callCenter.name.toLowerCase().startsWith(searchTerm)
    );
    
    if (exactMatch && exactMatch.name.toLowerCase() !== searchTerm) {
      setAutocompleteSuggestion(exactMatch.name);
    } else {
      setAutocompleteSuggestion('');
    }
  };

  // Select a call center from suggestions
  const selectCallCenter = (callCenter: any) => {
    setEventForm(prev => ({
      ...prev,
      callCenterId: callCenter.id,
      callCenterName: callCenter.name
    }));
    setCallCenterSearch(callCenter.name);
    setShowCallCenterSuggestions(false);
  };

  // Handle input change with autocomplete
  const handleCallCenterInputChange = (value: string) => {
    setCallCenterSearch(value);
    setSelectedSuggestionIndex(-1);
    setShowCallCenterSuggestions(true); // Always show suggestions

    // Search in the loaded list
    searchCallCenters(value);
  };

  // Handle focus to show all call centers
  const handleInputFocus = () => {
    setShowCallCenterSuggestions(true);
    setFilteredCallCenters(allCallCenters);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showCallCenterSuggestions || filteredCallCenters.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < filteredCallCenters.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : filteredCallCenters.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          selectCallCenter(filteredCallCenters[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowCallCenterSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Clear call center selection
  const clearCallCenter = () => {
    setEventForm(prev => ({
      ...prev,
      callCenterId: '',
      callCenterName: ''
    }));
    setCallCenterSearch('');
    setShowCallCenterSuggestions(false);
  };

  // Create a step for the tagged call center
  const createStepForCallCenter = async (event: CalendarEvent) => {
    if (!event.callCenterId || !event.callCenterName) return;

    try {
      const stepData = {
        title: event.title,
        description: event.description || `Calendar event: ${event.title}`,
        date: event.date,
        completed: false,
        notes: `Created from calendar event on ${new Date().toLocaleDateString()}`,
        priority: 'medium' as const
      };

      const response = await fetch(`/api/external-crm/call-centers/${event.callCenterId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stepData),
      });

      if (response.ok) {
        console.log('✅ Step created for call center:', event.callCenterName);
      } else {
        console.error('❌ Failed to create step for call center');
      }
    } catch (error) {
      console.error('❌ Error creating step for call center:', error);
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(new Date(event.date), date));
  };

  const getEventColor = (event: CalendarEvent) => {
    // Show completed events with green color
    if (event.status === 'completed') {
      return 'bg-gradient-to-r from-green-500 to-emerald-500';
    }

    // If the event has a color field (from priority), use it directly
    if (event.color && event.color.startsWith('#')) {
      // Convert hex color to Tailwind class
      const hex = event.color;
      switch (hex) {
        case '#ef4444': return 'bg-gradient-to-r from-red-500 to-pink-500';
        case '#FFC107': return 'bg-gradient-to-r from-yellow-500 to-amber-500';
        case '#4CAF50': return 'bg-gradient-to-r from-green-500 to-emerald-500';
        default: return 'bg-gradient-to-r from-gray-500 to-slate-500';
      }
    }

    // Otherwise use default colors based on type
    switch (event.type) {
      case 'meeting': return 'bg-gradient-to-r from-blue-500 to-indigo-500';
      case 'call': return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case 'task': return 'bg-gradient-to-r from-orange-500 to-amber-500';
      case 'reminder': return 'bg-gradient-to-r from-purple-500 to-violet-500';
      default: return 'bg-gradient-to-r from-gray-500 to-slate-500';
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#callCenter-search-container')) {
        setShowCallCenterSuggestions(false);
      }
    };

    if (showCallCenterSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCallCenterSuggestions]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="text-slate-600 mt-4 text-center font-medium">Loading your calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                  Calendar
                </h1>
                <p className="text-slate-600 mt-1 text-sm sm:text-base">Organize your schedule with elegance</p>
              </div>
            </div>
            <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => openEventDialog()}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-4 sm:px-6 py-2.5 sm:py-3 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="hidden sm:inline">Add Event</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl mx-4 sm:mx-auto">
                <DialogHeader className="pb-4">
                  <DialogTitle className="text-xl font-semibold text-slate-800">
                    {editingEvent ? 'Edit Event' : 'Create New Event'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 max-h-[80vh] overflow-y-auto">
                  <div>
                    <Label htmlFor="title" className="text-sm font-medium text-slate-700 mb-2 block">Title</Label>
                    <Input
                      id="title"
                      value={eventForm.title}
                      onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Event title"
                      className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-sm font-medium text-slate-700 mb-2 block">Description</Label>
                    <Textarea
                      id="description"
                      value={eventForm.description}
                      onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Event description (optional)"
                      rows={3}
                      className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="summary" className="text-sm font-medium text-slate-700 mb-2 block">Summary</Label>
                    <Textarea
                      id="summary"
                      value={eventForm.summary}
                      onChange={(e) => setEventForm(prev => ({ ...prev, summary: e.target.value }))}
                      placeholder="Summary of all processes with this call center (optional)"
                      rows={4}
                      className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date" className="text-sm font-medium text-slate-700 mb-2 block">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={eventForm.date}
                        onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                        className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="time" className="text-sm font-medium text-slate-700 mb-2 block">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={eventForm.time}
                        onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                        className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="location" className="text-sm font-medium text-slate-700 mb-2 block">Location</Label>
                    <Input
                      id="location"
                      value={eventForm.location}
                      onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Event location (optional)"
                      className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type" className="text-sm font-medium text-slate-700 mb-2 block">Type</Label>
                    <Select value={eventForm.type} onValueChange={(value: CalendarEvent['type']) =>
                      setEventForm(prev => ({ ...prev, type: value }))
                    }>
                      <SelectTrigger className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-0 shadow-2xl">
                        <SelectItem value="meeting" className="focus:bg-blue-50">💼 Meeting</SelectItem>
                        <SelectItem value="call" className="focus:bg-blue-50">📞 Call</SelectItem>
                        <SelectItem value="task" className="focus:bg-blue-50">📋 Task</SelectItem>
                        <SelectItem value="reminder" className="focus:bg-blue-50">🔔 Reminder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Enhanced Call Center Search */}
                  <div>
                    <Label htmlFor="callCenter" className="text-sm font-medium text-slate-700 mb-2 block">Tag Call Center (Optional)</Label>
                    <div className="relative">
                      <div className="relative">
                        <Input
                          id="callCenter"
                          value={callCenterSearch}
                          onChange={(e) => handleCallCenterInputChange(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onFocus={handleInputFocus}
                          placeholder="Search or browse call centers..."
                          className="rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200 pr-8"
                        />
                        {autocompleteSuggestion && callCenterSearch && (
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <span className="text-slate-400 text-sm">
                              {autocompleteSuggestion.slice(callCenterSearch.length)}
                            </span>
                          </div>
                        )}
                        {callCentersLoading && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      {eventForm.callCenterName && (
                        <button
                          type="button"
                          onClick={clearCallCenter}
                          className="absolute right-8 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Clear call center selection"
                        >
                          ✕
                        </button>
                      )}
                      {showCallCenterSuggestions && (
                        <div className="absolute z-10 w-full mt-2 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                          {callCentersLoading ? (
                            <div className="px-4 py-6 text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600 mx-auto mb-2"></div>
                              <p className="text-slate-600 text-sm">Loading call centers...</p>
                            </div>
                          ) : filteredCallCenters.length > 0 ? (
                            <>
                              {callCenterSearch && (
                                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                                  <p className="text-xs text-slate-500 font-medium">
                                    {filteredCallCenters.length} result{filteredCallCenters.length !== 1 ? 's' : ''} for "{callCenterSearch}"
                                  </p>
                                </div>
                              )}
                              {filteredCallCenters.map((callCenter: any, index: number) => (
                                <div
                                  key={callCenter.id}
                                  className={`px-4 py-3 cursor-pointer transition-colors ${
                                    index === selectedSuggestionIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
                                  }`}
                                  onClick={() => selectCallCenter(callCenter)}
                                >
                                  <div className="font-medium text-slate-800">{callCenter.name}</div>
                                  <div className="text-sm text-slate-500 flex items-center gap-2">
                                    <span>{callCenter.city}, {callCenter.country}</span>
                                    {callCenter.positions && (
                                      <span>• {callCenter.positions} positions</span>
                                    )}
                                    {callCenter.businessType && (
                                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                                        {callCenter.businessType}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {callCenterSearch && filteredCallCenters.length === 0 && (
                                <div className="px-4 py-6 text-center">
                                  <p className="text-slate-500 text-sm">No call centers found matching "{callCenterSearch}"</p>
                                  <p className="text-slate-400 text-xs mt-1">Try a different search term</p>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="px-4 py-6 text-center">
                              <p className="text-slate-500 text-sm">No call centers available</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {eventForm.callCenterName && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-blue-800 font-medium">
                            📞 Tagged: {eventForm.callCenterName}
                          </span>
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                          This event will be added as a step to this call center
                        </p>
                      </div>
                    )}
                    {!eventForm.callCenterName && allCallCenters.length > 0 && (
                      <div className="mt-2 text-xs text-slate-500">
                        💡 {allCallCenters.length} call centers available • Type to search or click to browse
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowEventDialog(false);
                        setEditingEvent(null);
                        resetForm();
                      }}
                      className="rounded-xl border-slate-200 hover:bg-slate-50 transition-all duration-200 w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={editingEvent ? handleUpdateEvent : handleCreateEvent}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-6 transition-all duration-200 shadow-lg hover:shadow-xl w-full sm:w-auto"
                    >
                      {editingEvent ? 'Update' : 'Create'} Event
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Modern Calendar */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          {/* Enhanced Calendar Header */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200/50 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={previousMonth}
                className="rounded-xl border-slate-200 hover:bg-white hover:shadow-md transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="text-lg sm:text-2xl font-semibold text-slate-800 text-center">
                {format(currentDate, 'MMMM yyyy')}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={nextMonth}
                className="rounded-xl border-slate-200 hover:bg-white hover:shadow-md transition-all duration-200"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Enhanced Days of Week - Hide on mobile */}
          <div className="hidden sm:grid grid-cols-7 bg-gradient-to-r from-slate-50 to-blue-50/30">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
              <div
                key={day}
                className={cn(
                  "p-4 text-center text-sm font-semibold",
                  index === 0 || index === 6 ? "text-slate-500" : "text-slate-700",
                  "border-r border-slate-200/50 last:border-r-0"
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Enhanced Calendar Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day: Date, index: number) => {
              const dayEvents = getEventsForDate(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6; // Sunday or Saturday

              return (
                <div
                  key={index}
                  className={cn(
                    "min-h-[100px] sm:min-h-[140px] p-2 sm:p-3 border-r border-b border-slate-100 cursor-pointer transition-all duration-200 hover:bg-slate-50/50",
                    !isCurrentMonth && "bg-slate-50/30 text-slate-400",
                    isToday && "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-inner",
                    isWeekend && isCurrentMonth && "bg-gradient-to-br from-amber-50 to-orange-50"
                  )}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className={cn(
                    "text-xs sm:text-sm font-semibold mb-1 sm:mb-2",
                    isToday ? "text-blue-700" : isCurrentMonth ? "text-slate-700" : "text-slate-400"
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, window.innerWidth < 640 ? 1 : 2).map(event => (
                      <div
                        key={event.id}
                        className={cn(
                          "text-xs p-1.5 sm:p-2 rounded-lg text-white font-medium truncate shadow-sm",
                          getEventColor(event)
                        )}
                        title={event.title}
                      >
                        <div className="flex items-center gap-1">
                          {event.time && <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                          <span className="truncate">{event.title}</span>
                        </div>
                      </div>
                    ))}
                    {dayEvents.length > (window.innerWidth < 640 ? 1 : 2) && (
                      <div className="text-xs text-slate-500 font-medium pl-1.5 sm:pl-2">
                        +{dayEvents.length - (window.innerWidth < 640 ? 1 : 2)} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Calendar Day Selector */}
        <div className="sm:hidden mt-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-slate-800 mb-3">Quick Day Selection</h4>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.slice(0, 7).map((day, index) => (
                <Button
                  key={index}
                  variant={selectedDate && isSameDay(day, selectedDate) ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "text-xs p-2 h-10",
                    isSameDay(day, new Date()) && "bg-blue-100 text-blue-700 border-blue-300",
                    selectedDate && isSameDay(day, selectedDate) && "bg-blue-600 text-white"
                  )}
                >
                  {format(day, 'd')}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Selected Date Events */}
        {selectedDate && (
          <div className="mt-6 sm:mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h4 className="text-lg sm:text-xl font-semibold text-slate-800">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h4>
                <p className="text-slate-600 text-sm mt-1">
                  {getEventsForDate(selectedDate).length} event{getEventsForDate(selectedDate).length !== 1 ? 's' : ''} scheduled
                </p>
              </div>
              {getEventsForDate(selectedDate).length > 0 && (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  {!showBulkDelete ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllEventsForDate}
                        className="rounded-xl border-slate-200 hover:bg-slate-50 transition-all duration-200 w-full sm:w-auto"
                      >
                        Select All
                      </Button>
                      {selectedEvents.size > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowBulkDelete(true)}
                          className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl transition-all duration-200 w-full sm:w-auto"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Delete </span>({selectedEvents.size})
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSelection}
                        className="rounded-xl border-slate-200 hover:bg-slate-50 transition-all duration-200 w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDeleteEvents}
                        className="rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Delete </span>({selectedEvents.size})
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-3 sm:space-y-4">
              {getEventsForDate(selectedDate).map(event => (
                <div
                  key={event.id}
                  className={cn(
                    "group relative bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 p-3 sm:p-4",
                    selectedEvents.has(event.id) && "bg-red-50 border-red-200"
                  )}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {showBulkDelete && (
                      <input
                        type="checkbox"
                        checked={selectedEvents.has(event.id)}
                        onChange={() => toggleEventSelection(event.id)}
                        className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        title={`Select ${event.title} for bulk delete`}
                      />
                    )}
                    <div className={cn("w-3 h-3 rounded-full mt-2 shadow-sm", getEventColor(event))} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <h5 className={cn(
                          "font-semibold text-slate-800 text-sm sm:text-base",
                          event.status === 'completed' && "line-through text-slate-500"
                        )}>
                          {event.title}
                        </h5>
                        {event.status === 'completed' && (
                          <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium w-fit">
                            <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                            Completed
                          </div>
                        )}
                      </div>
                      {event.callCenterName && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 mb-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <button
                            onClick={() => handleCallCenterClick(event.callCenterName!)}
                            className="font-medium truncate hover:underline hover:text-blue-800 transition-colors cursor-pointer"
                            title={`Click to view ${event.callCenterName} details`}
                          >
                            {event.callCenterName}
                          </button>
                        </div>
                      )}
                      {event.description && (
                        <p className={cn(
                          "text-sm mb-3",
                          event.status === 'completed' ? "text-slate-400" : "text-slate-600"
                        )}>
                          {event.description}
                        </p>
                      )}
                      {event.summary && (
                        <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-sm font-medium text-purple-800">Summary</span>
                          </div>
                          <p className={cn(
                            "text-sm text-purple-700",
                            event.status === 'completed' ? "text-purple-500" : "text-purple-700"
                          )}>
                            {event.summary}
                          </p>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-slate-500">
                        {event.time && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span className="font-medium">{event.time}</span>
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="font-medium truncate max-w-[100px]">{event.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <div className={cn("w-2 h-2 rounded-full", getEventColor(event))} />
                          <span className="font-medium capitalize">{event.type}</span>
                        </div>
                      </div>
                      {event.completedAt && (
                        <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                          <span>Completed at {new Date(event.completedAt).toLocaleString()}</span>
                        </div>
                      )}
                      {event.relatedType && (
                        <div className="text-xs text-slate-400 mt-2">
                          {event.relatedType === 'step' ? '📋 From Steps' : '📞 From Call Log'}
                        </div>
                      )}
                    </div>
                    {!showBulkDelete && (
                      <div className="flex sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200 gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEventDialog(undefined, event)}
                          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg p-1 sm:p-2"
                          title="Edit event"
                        >
                          <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1 sm:p-2"
                          title="Delete event"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {getEventsForDate(selectedDate).length === 0 && (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-600 mb-2">No events scheduled</h3>
                  <p className="text-slate-500 mb-4 text-sm sm:text-base">This day is free! Add an event to get started.</p>
                  <Button
                    onClick={() => openEventDialog(selectedDate)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Event
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Utility function for className concatenation
function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}
