'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Building,
  MapPin,
  Phone,
  Mail,
  Globe,
  User,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Calendar,
  DollarSign,
  Tag,
  Users,
  MessageSquare,
  Clock
} from 'lucide-react';
import { CallCenter, CallCenterContact, Step, CallLog, Contact } from '@/lib/types/external-crm';
import { ExternalCRMSubcollectionsService } from '@/lib/services/external-crm-service';
import { PhoneDetectionService } from '@/lib/services/phone-detection-service';

interface CallCenterDetailModalProps {
  callCenter: CallCenter | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (callCenter: CallCenter) => void;
  onDelete?: (id: string) => void;
}

interface ContactFormData {
  name: string;
  position: string;
  email: string;
  phone: string;
  department: string;
  notes: string;
}

interface StepFormData {
  title: string;
  description: string;
  date: string;
  notes: string;
  priority: 'low' | 'medium' | 'high';
}

const DEPARTMENTS = [
  'Management',
  'HR',
  'Operations',
  'Quality Assurance',
  'Training',
  'IT',
  'Finance',
  'Sales',
  'Customer Service',
  'Other'
];

export function CallCenterDetailModal({
  callCenter,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}: CallCenterDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCallCenter, setEditedCallCenter] = useState<CallCenter | null>(null);
  const [contacts, setContacts] = useState<CallCenterContact[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showStepForm, setShowStepForm] = useState(false);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [callHistory, setCallHistory] = useState<CallLog[]>([]);
  const [loadingCallHistory, setLoadingCallHistory] = useState(false);
  const [contactForm, setContactForm] = useState<ContactFormData>({
    name: '',
    position: '',
    email: '',
    phone: '',
    department: '',
    notes: ''
  });
  const [stepForm, setStepForm] = useState<StepFormData>({
    title: '',
    description: '',
    date: '',
    notes: '',
    priority: 'medium'
  });

  useEffect(() => {
    if (callCenter) {
      setEditedCallCenter(callCenter);
      // Load contacts from the call center's subcollection
      loadContactsFromCallCenter(callCenter.id);
      // Load steps from the call center's subcollection
      loadStepsFromCallCenter(callCenter.id);
      // Load call history
      loadCallHistory(callCenter.id);
      // Reset form states when call center changes
      setStepForm({
        title: '',
        description: '',
        date: '',
        notes: '',
        priority: 'medium'
      });
      setEditingStep(null);
      setShowStepForm(false);
    }
  }, [callCenter]);

  const loadContactsFromCallCenter = async (callCenterId: string) => {
    try {
      console.log(`👥 [CONTACTS] Loading contacts for call center: ${callCenterId}`);
      const response = await fetch(`/api/external-crm/call-centers/${callCenterId}/contacts`);
      if (response.ok) {
        const data = await response.json();
        const contactsWithDefaults = (data.contacts || []).map((contact: any) => ({
          ...contact,
          department: contact.department || '',
          createdAt: contact.createdAt || new Date().toISOString(),
          updatedAt: contact.updatedAt || new Date().toISOString(),
          phone_info: contact.phone_info || undefined
        } as CallCenterContact));
        setContacts(contactsWithDefaults);
        console.log(`✅ [CONTACTS] Loaded ${contactsWithDefaults.length} contacts for call center`);
      } else {
        console.error('❌ [CONTACTS] Failed to load contacts from call center');
        setContacts([]);
      }
    } catch (error) {
      console.error('❌ [CONTACTS] Error loading contacts:', error);
      setContacts([]);
    }
  };

  const loadStepsFromCallCenter = async (callCenterId: string) => {
    try {
      console.log(`📋 [STEPS] Loading steps for call center: ${callCenterId}`);
      const response = await fetch(`/api/external-crm/call-centers/${callCenterId}/steps`);
      if (response.ok) {
        const data = await response.json();
        setSteps(data.steps || []);
        console.log(`✅ [STEPS] Loaded ${data.steps?.length || 0} steps for call center`);
      } else {
        console.error('❌ [STEPS] Failed to load steps from call center');
        setSteps([]);
      }
    } catch (error) {
      console.error('❌ [STEPS] Error loading steps:', error);
      setSteps([]);
    }
  };

  const loadCallHistory = async (callCenterId: string) => {
    try {
      setLoadingCallHistory(true);
      console.log(`📞 [CALL-HISTORY] Loading call history for call center: ${callCenterId}`);
      const callHistoryData = await ExternalCRMSubcollectionsService.getCallHistory(callCenterId);
      setCallHistory(callHistoryData);
      console.log(`✅ [CALL-HISTORY] Loaded ${callHistoryData.length} call logs for call center`);
    } catch (error) {
      console.error('❌ [CALL-HISTORY] Error loading call history:', error);
      setCallHistory([]);
    } finally {
      setLoadingCallHistory(false);
    }
  };

  const handleSave = async () => {
    if (!editedCallCenter) return;

    try {
      const updatedCallCenter = {
        ...editedCallCenter,
        steps: steps,
        updatedAt: new Date().toISOString()
      };

      onUpdate(updatedCallCenter);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating call center:', error);
      alert('Failed to update call center');
    }
  };

  const handleContactSubmit = async () => {
    if (!contactForm.name || !contactForm.position) {
      alert('Name and position are required');
      return;
    }

    if (!callCenter) {
      alert('Call center not found');
      return;
    }

    try {
      const contactData = {
        name: contactForm.name,
        position: contactForm.position,
        email: contactForm.email,
        phone: contactForm.phone,
        notes: contactForm.notes,
        lastContact: new Date().toISOString()
      };

      if (editingContact) {
        // Update existing contact
        await fetch(`/api/external-crm/call-centers/${callCenter.id}/contacts/${editingContact}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactData)
        });
        setContacts(prev => prev.map(c => c.id === editingContact ? { ...c, ...contactData } : c));
        setEditingContact(null);
      } else {
        // Create new contact
        const response = await fetch(`/api/external-crm/call-centers/${callCenter.id}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactData)
        });
        const result = await response.json();
        const newContact: CallCenterContact = {
          id: result.id,
          ...contactData,
          department: contactForm.department,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setContacts(prev => [...prev, newContact]);
      }

      setContactForm({
        name: '',
        position: '',
        email: '',
        phone: '',
        department: '',
        notes: ''
      });
      setShowContactForm(false);
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Failed to save contact');
    }
  };

  const handleEditContact = (contact: CallCenterContact) => {
    setContactForm({
      name: contact.name,
      position: contact.position,
      email: contact.email,
      phone: contact.phone,
      department: contact.department,
      notes: contact.notes
    });
    setEditingContact(contact.id);
    setShowContactForm(true);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    if (!callCenter) {
      alert('Call center not found');
      return;
    }

    try {
      await fetch(`/api/external-crm/call-centers/${callCenter.id}/contacts/${contactId}`, {
        method: 'DELETE'
      });
      setContacts(prev => prev.filter(c => c.id !== contactId));
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact');
    }
  };

  const handleStepSubmit = async () => {
    if (!stepForm.title || !stepForm.date) {
      alert('Title and date are required');
      return;
    }

    if (!callCenter) {
      alert('Call center not found');
      return;
    }

    try {
      const stepData = {
        title: stepForm.title,
        description: stepForm.description,
        date: stepForm.date,
        completed: false,
        notes: stepForm.notes,
        priority: stepForm.priority
      };

      if (editingStep) {
        // Update existing step
        await ExternalCRMSubcollectionsService.updateStep(callCenter.id.toString(), editingStep, stepData);
        setSteps(prev => prev.map(s => s.id === editingStep ? { ...s, ...stepData } : s));
        setEditingStep(null);
      } else {
        // Create new step
        const stepId = await ExternalCRMSubcollectionsService.addStep(callCenter.id.toString(), stepData);
        const newStep: Step = {
          id: stepId,
          ...stepData
        };
        setSteps(prev => [...prev, newStep]);
      }

      setStepForm({
        title: '',
        description: '',
        date: '',
        notes: '',
        priority: 'medium'
      });
      setShowStepForm(false);
    } catch (error) {
      console.error('Error saving step:', error);
      alert('Failed to save step');
    }
  };

  const handleEditStep = (step: Step) => {
    setStepForm({
      title: step.title,
      description: step.description,
      date: step.date,
      notes: step.notes,
      priority: step.priority || 'medium'
    });
    setEditingStep(step.id);
    setShowStepForm(true);
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm('Are you sure you want to delete this step?')) return;

    if (!callCenter) {
      alert('Call center not found');
      return;
    }

    try {
      await ExternalCRMSubcollectionsService.deleteStep(callCenter.id.toString(), stepId);
      setSteps(prev => prev.filter(s => s.id !== stepId));
    } catch (error) {
      console.error('Error deleting step:', error);
      alert('Failed to delete step');
    }
  };

  const handleToggleStepComplete = async (stepId: string) => {
    if (!callCenter) {
      alert('Call center not found');
      return;
    }

    try {
      const step = steps.find(s => s.id === stepId);
      if (!step) return;

      const updatedCompleted = !step.completed;
      await ExternalCRMSubcollectionsService.updateStep(callCenter.id.toString(), stepId, {
        completed: updatedCompleted
      });

      setSteps(prev => prev.map(s =>
        s.id === stepId ? { ...s, completed: updatedCompleted } : s
      ));
    } catch (error) {
      console.error('Error updating step completion:', error);
      alert('Failed to update step status');
    }
  };

  const handleCreateCalendarEvent = async (step: Step) => {
    try {
      const eventData = {
        title: step.title,
        description: step.description,
        date: step.date,
        startTime: '09:00',
        endTime: '10:00',
        type: 'call' as const,
        callCenterId: callCenter?.id || '',
        priority: 'medium' as const,
        status: 'scheduled' as const,
        completed: false,
        notes: step.notes,
        tags: ['step', 'follow-up'],
        attendees: [],
        reminder: {
          enabled: true,
          timing: [{ type: 'days' as const, value: 1 }],
          methods: ['email' as const, 'browser' as const],
          escalation: false,
          snoozeEnabled: true,
          snoozeDuration: 15
        },
        recurring: {
          enabled: false,
          pattern: 'weekly' as const,
          interval: 1,
          daysOfWeek: [],
          endDate: '',
          occurrences: 0,
          exceptions: []
        },
        pipelineStage: '',
        outcome: '',
        followUpRequired: false,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastModifiedBy: 'system'
      };

      const response = await fetch('/api/external-crm/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        alert('Calendar event created successfully!');
      } else {
        const errorData = await response.json();
        console.error('Failed to create calendar event:', errorData);
        alert('Failed to create calendar event: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating calendar event:', error);
      alert('Failed to create calendar event');
    }
  };

  if (!callCenter || !editedCallCenter) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <Building className="w-5 h-5" />
              {isEditing ? (
                <Input
                  value={editedCallCenter.name}
                  onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="text-xl font-bold"
                />
              ) : (
                editedCallCenter.name
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  {onDelete && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        onDelete(callCenter.id);
                        onClose();
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
            <TabsTrigger value="steps">Steps ({steps.length})</TabsTrigger>
            <TabsTrigger value="call-log">Call Log ({callHistory.length})</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="country">Country</Label>
                      {isEditing ? (
                        <Select
                          value={editedCallCenter.country}
                          onValueChange={(value: 'Morocco' | 'Tunisia' | 'Senegal' | 'Ivory Coast' | 'Guinea' | 'Cameroon') => setEditedCallCenter(prev => prev ? { ...prev, country: value } : null)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Morocco">🇲🇦 Morocco</SelectItem>
                            <SelectItem value="Tunisia">🇹🇳 Tunisia</SelectItem>
                            <SelectItem value="Senegal">🇸🇳 Senegal</SelectItem>
                            <SelectItem value="Ivory Coast">🇨🇮 Ivory Coast</SelectItem>
                            <SelectItem value="Guinea">🇬🇳 Guinea</SelectItem>
                            <SelectItem value="Cameroon">🇨🇲 Cameroon</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2 p-2 border rounded">
                          <MapPin className="w-4 h-4" />
                          {editedCallCenter.country}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="city">City</Label>
                      {isEditing ? (
                        <Input
                          value={editedCallCenter.city}
                          onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, city: e.target.value } : null)}
                        />
                      ) : (
                        <div className="p-2 border rounded">
                          {editedCallCenter.city}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="positions">Positions</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editedCallCenter.positions}
                          onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, positions: parseInt(e.target.value) || 0 } : null)}
                        />
                      ) : (
                        <div className="p-2 border rounded">
                          {editedCallCenter.positions} positions
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="status">Status</Label>
                      {isEditing ? (
                        <Select
                          value={editedCallCenter.status}
                          onValueChange={(value: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed-Won' | 'Closed-Lost' | 'On-Hold') => setEditedCallCenter(prev => prev ? { ...prev, status: value } : null)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="New">New</SelectItem>
                            <SelectItem value="Contacted">Contacted</SelectItem>
                            <SelectItem value="Qualified">Qualified</SelectItem>
                            <SelectItem value="Proposal">Proposal</SelectItem>
                            <SelectItem value="Negotiation">Negotiation</SelectItem>
                            <SelectItem value="Closed-Won">Closed-Won</SelectItem>
                            <SelectItem value="Closed-Lost">Closed-Lost</SelectItem>
                            <SelectItem value="On-Hold">On-Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={`p-2 ${getStatusColor(editedCallCenter.status)}`}>
                          {editedCallCenter.status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="value">Value</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editedCallCenter.value}
                          onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, value: parseFloat(e.target.value) || 0 } : null)}
                        />
                      ) : (
                        <div className="flex items-center gap-2 p-2 border rounded">
                          <DollarSign className="w-4 h-4" />
                          {editedCallCenter.value?.toLocaleString()} {editedCallCenter.currency}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="source">Source</Label>
                      <div className="p-2 border rounded">
                        {editedCallCenter.source}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="phones">Phone Numbers</Label>
                    {isEditing ? (
                      <Input
                        id="phones"
                        value={editedCallCenter.phones.join(', ')}
                        onChange={(e) => setEditedCallCenter(prev => prev ? {
                          ...prev,
                          phones: e.target.value.split(',').map(phone => phone.trim()).filter(phone => phone)
                        } : null)}
                        placeholder="e.g., +212 6XX XXX XXX, +212 5XX XXX XXX"
                      />
                    ) : (
                      <div className="space-y-2">
                        {editedCallCenter.phones.map((phone, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 border rounded">
                            <Phone className="w-4 h-4" />
                            {phone}
                            {editedCallCenter.phone_infos && editedCallCenter.phone_infos[index] && editedCallCenter.phone_infos[index].is_mobile && editedCallCenter.phone_infos[index].whatsapp_confidence >= 0.7 && (
                              <a
                                href={PhoneDetectionService.getWhatsAppLink(phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="emails">Email Addresses</Label>
                    {isEditing ? (
                      <Input
                        id="emails"
                        value={editedCallCenter.emails.join(', ')}
                        onChange={(e) => setEditedCallCenter(prev => prev ? {
                          ...prev,
                          emails: e.target.value.split(',').map(email => email.trim()).filter(email => email)
                        } : null)}
                        placeholder="e.g., contact@company.com, info@company.com"
                      />
                    ) : (
                      <div className="space-y-2">
                        {editedCallCenter.emails.map((email, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 border rounded">
                            <Mail className="w-4 h-4" />
                            {email}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    {isEditing ? (
                      <Input
                        id="website"
                        value={editedCallCenter.website || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, website: e.target.value } : null)}
                        placeholder="https://www.company.com"
                      />
                    ) : (
                      editedCallCenter.website && (
                        <div className="flex items-center gap-2 p-2 border rounded">
                          <Globe className="w-4 h-4" />
                          <a href={editedCallCenter.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {editedCallCenter.website}
                          </a>
                        </div>
                      )
                    )}
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    {isEditing ? (
                      <Textarea
                        id="address"
                        value={editedCallCenter.address || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, address: e.target.value } : null)}
                        placeholder="Full address"
                        rows={2}
                      />
                    ) : (
                      editedCallCenter.address && (
                        <div className="p-2 border rounded">
                          {editedCallCenter.address}
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tags and Additional Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tags">Tags</Label>
                    {isEditing ? (
                      <Input
                        id="tags"
                        value={editedCallCenter.tags?.join(', ') || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? {
                          ...prev,
                          tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                        } : null)}
                        placeholder="e.g., premium, urgent, high-priority"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {editedCallCenter.tags?.map((tag, index) => (
                          <Badge key={index} variant="outline">
                            {tag}
                          </Badge>
                        )) || <span className="text-gray-500">No tags</span>}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="source">Source</Label>
                    {isEditing ? (
                      <Input
                        id="source"
                        value={editedCallCenter.source || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, source: e.target.value } : null)}
                        placeholder="e.g., Google, Facebook, Referral"
                      />
                    ) : (
                      <div className="p-2 border rounded">
                        {editedCallCenter.source || 'Not specified'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="type">Type</Label>
                    {isEditing ? (
                      <Input
                        id="type"
                        value={editedCallCenter.type || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, type: e.target.value } : null)}
                        placeholder="e.g., Inbound, Outbound, Blended"
                      />
                    ) : (
                      <div className="p-2 border rounded">
                        {editedCallCenter.type || 'Not specified'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="competitors">Competitors</Label>
                    {isEditing ? (
                      <Input
                        id="competitors"
                        value={editedCallCenter.competitors?.join(', ') || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? {
                          ...prev,
                          competitors: e.target.value.split(',').map(comp => comp.trim()).filter(comp => comp)
                        } : null)}
                        placeholder="e.g., Company A, Company B"
                      />
                    ) : (
                      <div className="p-2 border rounded">
                        {editedCallCenter.competitors?.join(', ') || 'None specified'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="socialMedia">Social Media</Label>
                    {isEditing ? (
                      <Input
                        id="socialMedia"
                        value={editedCallCenter.socialMedia?.join(', ') || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? {
                          ...prev,
                          socialMedia: e.target.value.split(',').map(sm => sm.trim()).filter(sm => sm)
                        } : null)}
                        placeholder="e.g., https://facebook.com/page, https://linkedin.com/company"
                      />
                    ) : (
                      <div className="p-2 border rounded">
                        {editedCallCenter.socialMedia?.join(', ') || 'None specified'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="markets">Markets</Label>
                    {isEditing ? (
                      <Input
                        id="markets"
                        value={editedCallCenter.markets?.join(', ') || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? {
                          ...prev,
                          markets: e.target.value.split(',').map(market => market.trim()).filter(market => market)
                        } : null)}
                        placeholder="e.g., Morocco, France, Spain"
                      />
                    ) : (
                      <div className="p-2 border rounded">
                        {editedCallCenter.markets?.join(', ') || 'None specified'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="foundDate">Found Date</Label>
                    {isEditing ? (
                      <Input
                        id="foundDate"
                        type="date"
                        value={editedCallCenter.foundDate || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, foundDate: e.target.value } : null)}
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 border rounded">
                        <Calendar className="w-4 h-4" />
                        {editedCallCenter.foundDate ? new Date(editedCallCenter.foundDate).toLocaleDateString() : 'Not specified'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="lastContacted">Last Contacted</Label>
                    {isEditing ? (
                      <Input
                        id="lastContacted"
                        type="date"
                        value={editedCallCenter.lastContacted || ''}
                        onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, lastContacted: e.target.value } : null)}
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 border rounded">
                        <Clock className="w-4 h-4" />
                        {editedCallCenter.lastContacted ? new Date(editedCallCenter.lastContacted).toLocaleDateString() : 'Never'}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Created</Label>
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <Calendar className="w-4 h-4" />
                      {new Date(editedCallCenter.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div>
                    <Label>Last Updated</Label>
                    <div className="flex items-center gap-2 p-2 border rounded">
                      <Clock className="w-4 h-4" />
                      {new Date(editedCallCenter.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Contacts ({contacts.length})
              </h3>
              <Button onClick={() => setShowContactForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </div>

            {contacts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Contacts Added</h3>
                  <p className="text-gray-600 mb-4">
                    Add contacts to track key people at this call center.
                  </p>
                  <Button onClick={() => setShowContactForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Contact
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {contacts.map((contact) => (
                  <Card key={contact.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <User className="w-5 h-5 text-gray-400 mt-1" />
                          <div className="flex-1">
                            <h4 className="font-semibold">{contact.name}</h4>
                            <p className="text-sm text-gray-600">{contact.position}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              {contact.department && (
                                <Badge variant="outline">
                                  {contact.department}
                                </Badge>
                              )}
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Added {new Date(contact.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditContact(contact)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteContact(contact.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {contact.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                              {contact.email}
                            </a>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                              {contact.phone}
                            </a>
                            {contact.phone_info && contact.phone_info.is_mobile && contact.phone_info.whatsapp_confidence >= 0.7 && (
                              <a
                                href={PhoneDetectionService.getWhatsAppLink(contact.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {contact.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                          {contact.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="steps" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Steps ({steps.length})
              </h3>
              <Button onClick={() => setShowStepForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </Button>
            </div>

            {steps.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Steps Added</h3>
                  <p className="text-gray-600 mb-4">
                    Add steps to track your progress with this call center (calls, meetings, emails, etc.)
                  </p>
                  <Button onClick={() => setShowStepForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Step
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {steps
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((step) => (
                    <Card key={step.id} className={step.completed ? 'bg-green-50 border-green-200' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={step.completed}
                              onChange={() => handleToggleStepComplete(step.id)}
                              className="mt-1"
                              title="Mark step as completed"
                            />
                            <div className="flex-1">
                              <h4 className={`font-semibold ${step.completed ? 'line-through text-gray-500' : ''}`}>
                                {step.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(step.date).toLocaleDateString()}
                                </div>
                                {step.priority && (
                                  <Badge
                                    variant="outline"
                                    className={`${
                                      step.priority === 'high' ? 'bg-red-100 text-red-800 border-red-200' :
                                      step.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                      'bg-gray-100 text-gray-800 border-gray-200'
                                    }`}
                                  >
                                    {step.priority.charAt(0).toUpperCase() + step.priority.slice(1)} Priority
                                  </Badge>
                                )}
                                {step.completed && (
                                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                    Completed
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCreateCalendarEvent(step)}
                              title="Add to Calendar"
                            >
                              <Calendar className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditStep(step)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteStep(step.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {step.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                            {step.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="call-log" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Call Log ({callHistory.length})
                </h3>
                <Button
                  onClick={() => {
                    // Open call log dialog for this call center
                    const dailyCallCenter = {
                      callCenter: callCenter,
                      callCount: callHistory.length,
                      lastCalledDate: callHistory.length > 0 ? callHistory[0].date : undefined,
                      needsNewPhoneNumber: false,
                      daysSinceLastCall: callHistory.length > 0 ?
                        Math.floor((new Date().getTime() - new Date(callHistory[0].date).getTime()) / (1000 * 60 * 60 * 24)) :
                        Infinity
                    };
                    // This would need to be passed from parent component
                    // For now, we'll show a placeholder
                    alert('Call logging feature available in Daily Calls section');
                  }}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Log New Call
                </Button>
              </div>

              {loadingCallHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : callHistory.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Call History</h3>
                    <p className="text-gray-600 mb-4">
                      No calls have been logged for this call center yet.
                    </p>
                    <Button
                      onClick={() => alert('Call logging feature available in Daily Calls section')}
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Log First Call
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {callHistory
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((callLog) => (
                      <Card key={callLog.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`${
                                  callLog.outcome === 'answered' ? 'bg-green-100 text-green-800 border-green-200' :
                                  callLog.outcome === 'no-answer' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                  callLog.outcome === 'busy' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                  callLog.outcome === 'voicemail' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                  'bg-gray-100 text-gray-800 border-gray-200'
                                }`}
                              >
                                {callLog.outcome.replace('-', ' ').toUpperCase()}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {new Date(callLog.date).toLocaleDateString()} at {new Date(callLog.date).toLocaleTimeString()}
                              </span>
                            </div>
                            {callLog.duration > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {callLog.duration} min
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm text-gray-700">{callLog.notes}</p>

                            {callLog.followUp && callLog.followUp !== 'none' && (
                              <div className="flex items-center gap-2 text-xs text-blue-600">
                                <Calendar className="w-3 h-3" />
                                <span>Follow-up: {callLog.followUp.replace('-', ' ')}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Activity Log</h3>
                <p className="text-gray-600">
                  Activity tracking will be available in a future update
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editedCallCenter.notes || ''}
                    onChange={(e) => setEditedCallCenter(prev => prev ? { ...prev, notes: e.target.value } : null)}
                    placeholder="Add notes about this call center..."
                    rows={6}
                  />
                ) : (
                  <div className="p-4 border rounded min-h-[150px] bg-gray-50">
                    {editedCallCenter.notes ? (
                      <p className="whitespace-pre-wrap">{editedCallCenter.notes}</p>
                    ) : (
                      <p className="text-gray-500 italic">No notes added yet</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Contact Form Modal */}
        {/* Contact Form Modal */}
        <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact-name">Name *</Label>
                  <Input
                    id="contact-name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <Label htmlFor="contact-position">Position *</Label>
                  <Input
                    id="contact-position"
                    value={contactForm.position}
                    onChange={(e) => setContactForm(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="Job title"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@company.com"
                  />
                </div>

                <div>
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input
                    id="contact-phone"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+212-6-12-34-56-78"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="contact-department">Department</Label>
                <Select
                  value={contactForm.department}
                  onValueChange={(value) => setContactForm(prev => ({ ...prev, department: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="contact-notes">Notes</Label>
                <Textarea
                  id="contact-notes"
                  value={contactForm.notes}
                  onChange={(e) => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this contact..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowContactForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleContactSubmit}>
                  {editingContact ? 'Update Contact' : 'Add Contact'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Step Form Modal */}
        <Dialog open={showStepForm} onOpenChange={setShowStepForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStep ? 'Edit Step' : 'Add New Step'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="step-title">Title *</Label>
                <Input
                  id="step-title"
                  value={stepForm.title}
                  onChange={(e) => setStepForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Call Manager, Send Proposal, Schedule Meeting"
                />
              </div>

              <div>
                <Label htmlFor="step-description">Description</Label>
                <Textarea
                  id="step-description"
                  value={stepForm.description}
                  onChange={(e) => setStepForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what needs to be done..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="step-date">Date *</Label>
                <Input
                  id="step-date"
                  type="date"
                  value={stepForm.date}
                  onChange={(e) => setStepForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="step-priority">Priority</Label>
                <Select
                  value={stepForm.priority}
                  onValueChange={(value: 'low' | 'medium' | 'high') => setStepForm(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="step-notes">Notes</Label>
                <Textarea
                  id="step-notes"
                  value={stepForm.notes}
                  onChange={(e) => setStepForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this step..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowStepForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStepSubmit}>
                  {editingStep ? 'Update Step' : 'Add Step'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function getStatusColor(status: string) {
  const colors = {
    'New': 'bg-blue-100 text-blue-800 border-blue-200',
    'Contacted': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'Qualified': 'bg-purple-100 text-purple-800 border-purple-200',
    'Proposal': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Negotiation': 'bg-orange-100 text-orange-800 border-orange-200',
    'Closed-Won': 'bg-green-100 text-green-800 border-green-200',
    'Closed-Lost': 'bg-red-100 text-red-800 border-red-200',
    'On-Hold': 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return colors[status as keyof typeof colors] || colors.New;
}