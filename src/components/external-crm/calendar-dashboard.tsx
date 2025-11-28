'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, MapPin } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

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
}

interface CalendarDashboardProps {
  refreshTrigger?: number;
}

export function CalendarDashboard({ refreshTrigger }: CalendarDashboardProps) {
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
    callCenterName: ''
  });

  // Call center search state
  const [callCenterSearch, setCallCenterSearch] = useState('');
  const [callCenterSuggestions, setCallCenterSuggestions] = useState<any[]>([]);
  const [showCallCenterSuggestions, setShowCallCenterSuggestions] = useState(false);
  const [autocompleteSuggestion, setAutocompleteSuggestion] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  useEffect(() => {
    loadEvents();
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
      callCenterName: ''
    });
    setCallCenterSearch('');
    setCallCenterSuggestions([]);
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
        callCenterName: event.callCenterName || ''
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

  // Search for call centers
  const searchCallCenters = async (query: string) => {
    if (query.length < 2) {
      setCallCenterSuggestions([]);
      setShowCallCenterSuggestions(false);
      return;
    }

    try {
      const response = await fetch(`/api/external-crm?search=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setCallCenterSuggestions(data.callCenters || []);
        setShowCallCenterSuggestions(true);

        // Auto-complete if there's a single suggestion that starts with the input
        if (data.callCenters && data.callCenters.length === 1) {
          const suggestion = data.callCenters[0];
          if (suggestion.name.toLowerCase().startsWith(query.toLowerCase())) {
            setAutocompleteSuggestion(suggestion.name);
          } else {
            setAutocompleteSuggestion('');
          }
        } else {
          setAutocompleteSuggestion('');
        }
      }
    } catch (error) {
      console.error('Error searching call centers:', error);
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

    // Search for suggestions
    searchCallCenters(value);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showCallCenterSuggestions || callCenterSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < callCenterSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : callCenterSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          selectCallCenter(callCenterSuggestions[selectedSuggestionIndex]);
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
      return 'bg-green-600';
    }

    // If the event has a color field (from priority), use it directly
    if (event.color && event.color.startsWith('#')) {
      // Convert hex color to Tailwind class
      const hex = event.color;
      switch (hex) {
        case '#ef4444': return 'bg-red-500';
        case '#FFC107': return 'bg-yellow-500';
        case '#4CAF50': return 'bg-green-500';
        default: return 'bg-gray-500';
      }
    }

    // Otherwise use default colors based on type
    switch (event.type) {
      case 'meeting': return 'bg-blue-500';
      case 'call': return 'bg-green-500';
      case 'task': return 'bg-orange-500';
      case 'reminder': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Calendar</h2>
          <p className="text-gray-600">Manage your events and appointments</p>
        </div>
        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => openEventDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Event title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Event description (optional)"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={eventForm.location}
                  onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Event location (optional)"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={eventForm.type} onValueChange={(value: CalendarEvent['type']) =>
                  setEventForm(prev => ({ ...prev, type: value }))
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

              {/* Call Center Search */}
              <div>
                <Label htmlFor="callCenter">Tag Call Center (Optional)</Label>
                <div className="relative">
                  <div className="relative">
                    <Input
                      id="callCenter"
                      value={callCenterSearch}
                      onChange={(e) => handleCallCenterInputChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Search for call center to tag..."
                      className="pr-8"
                    />
                    {autocompleteSuggestion && callCenterSearch && (
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-400 text-sm">
                          {autocompleteSuggestion.slice(callCenterSearch.length)}
                        </span>
                      </div>
                    )}
                  </div>
                  {eventForm.callCenterName && (
                    <button
                      type="button"
                      onClick={clearCallCenter}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Clear call center selection"
                    >
                      ✕
                    </button>
                  )}
                  {showCallCenterSuggestions && callCenterSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {callCenterSuggestions.map((callCenter: any, index: number) => (
                        <div
                          key={callCenter.id}
                          className={`px-3 py-2 cursor-pointer ${
                            index === selectedSuggestionIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
                          }`}
                          onClick={() => selectCallCenter(callCenter)}
                        >
                          <div className="font-medium">{callCenter.name}</div>
                          <div className="text-sm text-gray-500">
                            {callCenter.city}, {callCenter.country} • {callCenter.positions} positions
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {eventForm.callCenterName && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-800">
                        📞 Tagged: <strong>{eventForm.callCenterName}</strong>
                      </span>
                      <span className="text-xs text-blue-600">
                        This event will be added as a step to this call center
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {
                  setShowEventDialog(false);
                  setEditingEvent(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={editingEvent ? handleUpdateEvent : handleCreateEvent}>
                  {editingEvent ? 'Update' : 'Create'} Event
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <Button variant="outline" size="sm" onClick={previousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-semibold text-gray-900">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 border-r border-gray-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day: Date, index: number) => {
            const dayEvents = getEventsForDate(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={index}
                className={cn(
                  "min-h-[120px] p-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors",
                  !isCurrentMonth && "bg-gray-50 text-gray-400",
                  isToday && "bg-blue-50 border-blue-300"
                )}
                onClick={() => setSelectedDate(day)}
              >
                <div className="text-sm font-medium mb-1">
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className={cn(
                        "text-xs p-1 rounded text-white truncate",
                        getEventColor(event)
                      )}
                      title={event.title}
                    >
                      {event.time && <Clock className="w-3 h-3 inline mr-1" />}
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">
              Events for {format(selectedDate, 'MMMM d, yyyy')}
            </h4>
            {getEventsForDate(selectedDate).length > 0 && (
              <div className="flex gap-2">
                {!showBulkDelete ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllEventsForDate}
                    >
                      Select All
                    </Button>
                    {selectedEvents.size > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBulkDelete(true)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Bulk Delete ({selectedEvents.size})
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDeleteEvents}
                    >
                      Delete Selected ({selectedEvents.size})
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="space-y-3">
            {getEventsForDate(selectedDate).map(event => (
              <div key={event.id} className={cn(
                "flex items-start justify-between p-3 border border-gray-200 rounded-lg",
                selectedEvents.has(event.id) && "bg-red-50 border-red-300"
              )}>
                <div className="flex items-start gap-3 flex-1">
                  {showBulkDelete && (
                    <input
                      type="checkbox"
                      checked={selectedEvents.has(event.id)}
                      onChange={() => toggleEventSelection(event.id)}
                      className="mt-1"
                      title={`Select ${event.title} for bulk delete`}
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("w-3 h-3 rounded-full", getEventColor(event))} />
                      <h5 className={`font-medium ${event.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                        {event.title}
                      </h5>
                      {event.status === 'completed' && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                    {event.callCenterName && (
                      <p className="text-xs text-blue-600 mb-1">📞 {event.callCenterName}</p>
                    )}
                    {event.description && (
                      <p className={`text-sm mb-2 ${event.status === 'completed' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {event.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {event.time && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.time}
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </div>
                      )}
                    </div>
                    {event.completedAt && (
                      <div className="text-xs text-green-600 mt-1">
                        Completed at {new Date(event.completedAt).toLocaleString()}
                      </div>
                    )}
                    {event.relatedType && (
                      <div className="text-xs text-gray-400 mt-1">
                        {event.relatedType === 'step' ? '📋 From Steps' : '📞 From Call Log'}
                      </div>
                    )}
                  </div>
                </div>
                {!showBulkDelete && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEventDialog(undefined, event)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEvent(event.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {getEventsForDate(selectedDate).length === 0 && (
              <p className="text-gray-500 text-center py-4">No events for this date</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Utility function for className concatenation
function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}
