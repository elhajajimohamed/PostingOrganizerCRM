'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Search } from 'lucide-react';
import { Phone, Mail, MessageSquare, Plus, Upload, Trash2, Edit, CheckSquare, Square, History, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ProspectionService } from '@/lib/services/prospection-service';
import { ExternalCRMService } from '@/lib/services/external-crm-service';

interface Prospect {
  id: string;
  name: string;
  country: string;
  city: string;
  positions: number;
  businessType: 'call-center' | 'voip-reseller' | 'data-vendor' | 'workspace-rental' | 'individual';
  phones: string[];
  phone_infos?: any[];
  emails: string[];
  website: string;
  address?: string;
  source?: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  // When the prospect was added
  addedDate: string; // Date when prospect was added to system
  // Status within prospects system
  status: 'active' | 'added_to_crm' | 'archived' | 'pending' | 'contacted' | 'qualified' | 'not_interested' | 'invalid';
  priority: 'low' | 'medium' | 'high';
  // Contact tracking
  contactAttempts?: number;
  lastContacted?: string;
  contacts?: Contact[];
  callHistory?: CallLog[];
}

interface Contact {
  id: string;
  name: string;
  position: string;
  phone: string;
  email: string;
  notes: string;
}

interface CallLog {
  id: string;
  date: string;
  duration: number;
  outcome: string;
  notes: string;
  phone_used?: string;
}

export default function ProspectionPage() {
  const [allProspects, setAllProspects] = useState<Prospect[]>([]);
  const [todayProspects, setTodayProspects] = useState<Prospect[]>([]);
  const [contactedToday, setContactedToday] = useState<Prospect[]>([]);
  const [selectedProspects, setSelectedProspects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('today');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingContactedToday, setLoadingContactedToday] = useState(false);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importProgressText, setImportProgressText] = useState('');
  const [showCallLogDialog, setShowCallLogDialog] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    city: '',
    positions: '',
    businessType: '',
    phones: [''],
    emails: [''],
    website: '',
    address: '',
    source: '',
    tags: '',
    notes: '',
    priority: 'medium'
  });

  const [callLogData, setCallLogData] = useState({
    duration: '',
    outcome: '',
    notes: '',
    phone_used: '',
    disposition: ''
  });

  const [importData, setImportData] = useState('');

  // Helper function to convert phones field to array
  const getPhoneArray = (phones: any): string[] => {
    if (!phones) return [];
    if (Array.isArray(phones)) return phones;
    if (typeof phones === 'string') return phones.split(';').map(p => p.trim()).filter(p => p);
    return [];
  };

  // Helper function to convert emails field to array
  const getEmailArray = (emails: any): string[] => {
    if (!emails) return [];
    if (Array.isArray(emails)) return emails;
    if (typeof emails === 'string') return emails.split(';').map(e => e.trim()).filter(e => e);
    return [];
  };

  useEffect(() => {
    loadAllProspects();
    loadTodayProspects();
    loadContactedToday();
  }, [selectedDate]);

  const loadAllProspects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/prospection/all');
      const data = await response.json();
      setAllProspects(data.prospects || []);
    } catch (error) {
      console.error('Error loading prospects:', error);
    }
    setIsLoading(false);
  };

  const loadTodayProspects = async () => {
    try {
      const response = await fetch(`/api/prospection?date=${selectedDate}&tab=today`);
      const data = await response.json();
      setTodayProspects(data.prospects || []);
    } catch (error) {
      console.error('Error loading today prospects:', error);
    }
  };

  const loadContactedToday = async () => {
    setLoadingContactedToday(true);
    try {
      const response = await fetch(`/api/prospection?date=${selectedDate}&tab=contacted`);
      const data = await response.json();
      setContactedToday(data.prospects || []);
    } catch (error) {
      console.error('Error loading contacted prospects:', error);
    }
    setLoadingContactedToday(false);
  };

  const handleAddProspect = async () => {
    try {
      const prospectData = {
        ...formData,
        positions: parseInt(formData.positions) || 0,
        phones: formData.phones.filter(p => p.trim()),
        emails: formData.emails.filter(e => e.trim()),
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        addedDate: new Date().toISOString().split('T')[0],
        status: 'active' as const,
        contactAttempts: 0
      };

      const response = await fetch('/api/prospection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prospectData)
      });

      if (response.ok) {
        setShowAddForm(false);
        resetForm();
        loadAllProspects();
        loadTodayProspects();
      }
    } catch (error) {
      console.error('Error adding prospect:', error);
    }
  };

  const handleImportProspects = async () => {
    setImporting(true);
    setImportProgress(0);
    setImportProgressText('Starting import...');

    try {
      let prospects;

      if (importFile) {
        setImportProgressText('Reading file...');
        setImportProgress(25);
        const fileContent = await importFile.text();
        setImportProgressText('Parsing data...');
        setImportProgress(50);
        prospects = JSON.parse(fileContent);
      } else {
        setImportProgressText('Parsing data...');
        setImportProgress(25);
        prospects = JSON.parse(importData);
      }

      setImportProgressText('Validating data...');
      setImportProgress(75);
      setImportProgressText(`Preparing to import ${prospects.length} prospects...`);
      setImportProgress(85);

      const response = await fetch('/api/prospection/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects, date: selectedDate })
      });

      if (response.ok) {
        setImportProgressText('Importing data to database...');
        setImportProgress(95);
        setShowImportDialog(false);
        setImportData('');
        setImportFile(null);
        setImportProgressText('Import completed successfully!');
        setImportProgress(100);
        loadAllProspects();
        loadTodayProspects();
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      console.error('Error importing prospects:', error);
      setImportProgressText('Import failed. Please try again.');
    } finally {
      setTimeout(() => {
        setImporting(false);
        setImportProgress(0);
        setImportProgressText('');
      }, 2000);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportData(''); // Clear textarea when file is selected
    }
  };

  const handleMarkAsContacted = async (prospect: Prospect) => {
    try {
      // Update prospect status to 'contacted' and track daily progress
      await ProspectionService.updateProspect(prospect.id, { 
        status: 'contacted',
        lastContacted: new Date().toISOString(),
        contactAttempts: (prospect.contactAttempts || 0) + 1
      });
      
      setSuccessMessage(`"${prospect.name}" marked as contacted!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      
      // Reload both lists
      loadTodayProspects();
      loadContactedToday();
      
    } catch (error) {
      console.error('Error marking as contacted:', error);
    }
  };

  const handleAddToCRM = async (prospect: Prospect) => {
    try {
      console.log('🔍 Add to CRM clicked for prospect:', prospect.name, prospect.id);
      
      // Create call center data from prospect
      const callCenterData = {
        name: prospect.name,
        country: prospect.country as any,
        city: prospect.city,
        positions: prospect.positions,
        businessType: prospect.businessType,
        phones: prospect.phones,
        phone_infos: prospect.phone_infos,
        emails: prospect.emails,
        website: prospect.website,
        address: prospect.address,
        source: prospect.source,
        tags: prospect.tags,
        notes: prospect.notes,
        status: 'New' as const,
        value: 0,
        currency: 'USD',
        updatedAt: new Date().toISOString(),
        lastContacted: null
      };

      // Create call center in external CRM
      await ExternalCRMService.createCallCenter(callCenterData);
      
      // Update prospect status to indicate it was added to CRM
      await ProspectionService.updateProspect(prospect.id, {
        status: 'added_to_crm' as any
      });
      
      setSuccessMessage(`"${prospect.name}" has been added to the Call Centers CRM!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      
      // Reload prospects
      await loadAllProspects();
      
    } catch (error) {
      console.error('❌ Error adding to CRM:', error);
      setSuccessMessage('Error adding prospect to CRM');
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleBulkContacted = async () => {
    try {
      for (const prospectId of selectedProspects) {
        const prospect = todayProspects.find(p => p.id === prospectId);
        if (prospect) {
          await ProspectionService.updateProspect(prospect.id, { 
            status: 'contacted',
            lastContacted: new Date().toISOString(),
            contactAttempts: (prospect.contactAttempts || 0) + 1
          });
        }
      }
      
      setSelectedProspects([]);
      setSuccessMessage(`${selectedProspects.length} prospects marked as contacted!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      loadTodayProspects();
      loadContactedToday();
      
    } catch (error) {
      console.error('❌ Error marking prospects as contacted:', error);
      setSuccessMessage('Error marking prospects as contacted');
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleBulkAddToCRM = async () => {
    try {
      console.log('🔍 Bulk Add to CRM clicked for prospects:', selectedProspects);
      
      for (const prospectId of selectedProspects) {
        const prospect = allProspects.find(p => p.id === prospectId);
        if (prospect) {
          const callCenterData = {
            name: prospect.name,
            country: prospect.country as any,
            city: prospect.city,
            positions: prospect.positions,
            businessType: prospect.businessType,
            phones: prospect.phones,
            phone_infos: prospect.phone_infos,
            emails: prospect.emails,
            website: prospect.website,
            address: prospect.address,
            source: prospect.source,
            tags: prospect.tags,
            notes: prospect.notes,
            status: 'New' as const,
            value: 0,
            currency: 'USD',
            updatedAt: new Date().toISOString(),
            lastContacted: null
          };

          await ExternalCRMService.createCallCenter(callCenterData);
          await ProspectionService.updateProspect(prospect.id, {
            status: 'added_to_crm' as any
          });
        }
      }
      
      setSelectedProspects([]);
      setSuccessMessage(`${selectedProspects.length} prospects added to Call Centers CRM!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadAllProspects();
      
    } catch (error) {
      console.error('❌ Error adding prospects to CRM:', error);
      setSuccessMessage('Error adding prospects to CRM');
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      country: '',
      city: '',
      positions: '',
      businessType: '',
      phones: [''],
      emails: [''],
      website: '',
      address: '',
      source: '',
      tags: '',
      notes: '',
      priority: 'medium'
    });
  };

  const toggleProspectSelection = (prospectId: string) => {
    setSelectedProspects(prev =>
      prev.includes(prospectId)
        ? prev.filter(id => id !== prospectId)
        : [...prev, prospectId]
    );
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const sendEmail = (email: string) => {
    window.open(`mailto:${email}`, '_blank');
  };

  const makeCall = (phone: string) => {
    window.open(`tel:${phone}`, '_blank');
  };

  const getBusinessTypeColor = (type: string) => {
    switch (type) {
      case 'call-center': return 'bg-blue-100 text-blue-800';
      case 'voip-reseller': return 'bg-green-100 text-green-800';
      case 'data-vendor': return 'bg-purple-100 text-purple-800';
      case 'workspace-rental': return 'bg-orange-100 text-orange-800';
      case 'individual': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-gray-100 text-gray-800';
      case 'added_to_crm': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-red-100 text-red-800';
      case 'contacted': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const currentProspects = activeTab === 'today' ? todayProspects : 
                          activeTab === 'contacted' ? contactedToday : 
                          activeTab === 'all' ? allProspects : [];

  return (
    <div className="container mx-auto p-6">
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
          <CheckSquare className="w-5 h-5 mr-2" />
          {successMessage}
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Prospection</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Daily Target: {contactedToday.length}/10 prospects contacted today
          </div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>
      </div>
        
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="today">Today's Prospects ({todayProspects.length})</TabsTrigger>
          <TabsTrigger value="contacted">Already Contacted ({contactedToday.length})</TabsTrigger>
          <TabsTrigger value="all">All Prospects ({allProspects.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          {selectedProspects.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedProspects.length} prospects selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleBulkContacted}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Mark as Contacted ({selectedProspects.length})
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="text-center py-8">Loading prospects...</div>
          ) : todayProspects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No prospects for {format(new Date(selectedDate), 'MMMM d, yyyy')}</p>
                <p className="text-sm text-gray-400 mt-2">Add prospects or import from JSON to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {todayProspects.map((prospect) => (
                <Card key={prospect.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedProspects.includes(prospect.id)}
                          onCheckedChange={() => toggleProspectSelection(prospect.id)}
                        />
                        <div>
                          <CardTitle className="text-lg">{prospect.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getBusinessTypeColor(prospect.businessType)}>
                              {prospect.businessType.replace('-', ' ')}
                            </Badge>
                            <Badge className={getPriorityColor(prospect.priority)}>
                              {prospect.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {getPhoneArray(prospect.phones).some(phone => {
                          const phoneInfo = prospect.phone_infos?.find((p: any) => p.original === phone);
                          return phoneInfo?.is_mobile;
                        }) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-600 text-white hover:bg-green-700 border-green-600"
                            onClick={() => {
                              const mobilePhone = getPhoneArray(prospect.phones).find(phone => {
                                const phoneInfo = prospect.phone_infos?.find((p: any) => p.original === phone);
                                return phoneInfo?.is_mobile;
                              });
                              if (mobilePhone) openWhatsApp(mobilePhone);
                            }}
                            title="WhatsApp (Mobile)"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        ) : getPhoneArray(prospect.phones).length > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                            onClick={() => {
                              openWhatsApp(getPhoneArray(prospect.phones)[0]);
                            }}
                            title="WhatsApp (Landline)"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        ) : null}

                        {getEmailArray(prospect.emails).length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendEmail(getEmailArray(prospect.emails)[0])}
                            title="Send Email"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}

                        {getPhoneArray(prospect.phones).length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => makeCall(getPhoneArray(prospect.phones)[0])}
                            title="Call"
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleMarkAsContacted(prospect)}
                          title="Mark as Contacted"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckSquare className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Location:</span> {prospect.city}, {prospect.country}
                      </div>
                      {prospect.positions > 0 && (
                        <div>
                          <span className="font-medium">Positions:</span> {prospect.positions}
                        </div>
                      )}
                      {getPhoneArray(prospect.phones).length > 0 && (
                        <div>
                          <span className="font-medium">Phones:</span> {getPhoneArray(prospect.phones).join(', ')}
                        </div>
                      )}
                      {getEmailArray(prospect.emails).length > 0 && (
                        <div>
                          <span className="font-medium">Emails:</span> {getEmailArray(prospect.emails).join(', ')}
                        </div>
                      )}
                      {prospect.website && (
                        <div>
                          <span className="font-medium">Website:</span> <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{prospect.website}</a>
                        </div>
                      )}
                    </div>
                    {prospect.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                        <span className="font-medium">Notes:</span> {prospect.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contacted" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-sm text-gray-600">
              {contactedToday.length} prospects contacted on {format(new Date(selectedDate), 'MMMM d, yyyy')}
            </div>
            <div className="ml-auto">
              <Progress value={(contactedToday.length / 10) * 100} className="w-48" />
              <div className="text-xs text-gray-500 mt-1">{contactedToday.length}/10 daily target</div>
            </div>
          </div>

          {loadingContactedToday ? (
            <div className="text-center py-8">Loading contacted prospects...</div>
          ) : contactedToday.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No prospects contacted for {format(new Date(selectedDate), 'MMMM d, yyyy')}</p>
                <p className="text-sm text-gray-400 mt-2">Contact some prospects from "Today's Prospects" to see them here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {contactedToday.map((prospect) => (
                <Card key={prospect.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{prospect.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getBusinessTypeColor(prospect.businessType)}>
                            {prospect.businessType.replace('-', ' ')}
                          </Badge>
                          <Badge className={getStatusColor(prospect.status)}>
                            {prospect.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {getPhoneArray(prospect.phones).some(phone => {
                          const phoneInfo = prospect.phone_infos?.find((p: any) => p.original === phone);
                          return phoneInfo?.is_mobile;
                        }) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-600 text-white hover:bg-green-700 border-green-600"
                            onClick={() => {
                              const mobilePhone = getPhoneArray(prospect.phones).find(phone => {
                                const phoneInfo = prospect.phone_infos?.find((p: any) => p.original === phone);
                                return phoneInfo?.is_mobile;
                              });
                              if (mobilePhone) openWhatsApp(mobilePhone);
                            }}
                            title="WhatsApp (Mobile)"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        ) : getPhoneArray(prospect.phones).length > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                            onClick={() => {
                              openWhatsApp(getPhoneArray(prospect.phones)[0]);
                            }}
                            title="WhatsApp (Landline)"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        ) : null}

                        {getEmailArray(prospect.emails).length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendEmail(getEmailArray(prospect.emails)[0])}
                            title="Send Email"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}

                        {getPhoneArray(prospect.phones).length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => makeCall(getPhoneArray(prospect.phones)[0])}
                            title="Call"
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Location:</span> {prospect.city}, {prospect.country}
                      </div>
                      {prospect.positions > 0 && (
                        <div>
                          <span className="font-medium">Positions:</span> {prospect.positions}
                        </div>
                      )}
                      {getPhoneArray(prospect.phones).length > 0 && (
                        <div>
                          <span className="font-medium">Phones:</span> {getPhoneArray(prospect.phones).join(', ')}
                        </div>
                      )}
                      {getEmailArray(prospect.emails).length > 0 && (
                        <div>
                          <span className="font-medium">Emails:</span> {getEmailArray(prospect.emails).join(', ')}
                        </div>
                      )}
                    </div>
                    {prospect.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                        <span className="font-medium">Notes:</span> {prospect.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="flex justify-end mb-4">
            {selectedProspects.length === allProspects.length && allProspects.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setSelectedProspects([])}>
                <Square className="w-4 h-4 mr-2" />
                Deselect All
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setSelectedProspects(allProspects.map(p => p.id))}>
                <CheckSquare className="w-4 h-4 mr-2" />
                Select All
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading prospects...</div>
          ) : allProspects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No prospects found</p>
                <p className="text-sm text-gray-400 mt-2">Add prospects or import from JSON to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {allProspects.map((prospect) => (
                <Card key={prospect.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedProspects.includes(prospect.id)}
                          onCheckedChange={() => toggleProspectSelection(prospect.id)}
                        />
                        <div>
                          <CardTitle className="text-lg">{prospect.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getBusinessTypeColor(prospect.businessType)}>
                              {prospect.businessType.replace('-', ' ')}
                            </Badge>
                            <Badge className={getPriorityColor(prospect.priority)}>
                              {prospect.priority}
                            </Badge>
                            <Badge className={getStatusColor(prospect.status)}>
                              {prospect.status.replace('_', ' ')}
                            </Badge>
                            {prospect.addedDate && (
                              <Badge variant="outline">
                                Added: {format(new Date(prospect.addedDate), 'MMM d, yyyy')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {getPhoneArray(prospect.phones).some(phone => {
                          const phoneInfo = prospect.phone_infos?.find((p: any) => p.original === phone);
                          return phoneInfo?.is_mobile;
                        }) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-600 text-white hover:bg-green-700 border-green-600"
                            onClick={() => {
                              const mobilePhone = getPhoneArray(prospect.phones).find(phone => {
                                const phoneInfo = prospect.phone_infos?.find((p: any) => p.original === phone);
                                return phoneInfo?.is_mobile;
                              });
                              if (mobilePhone) openWhatsApp(mobilePhone);
                            }}
                            title="WhatsApp (Mobile)"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        ) : getPhoneArray(prospect.phones).length > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                            onClick={() => {
                              openWhatsApp(getPhoneArray(prospect.phones)[0]);
                            }}
                            title="WhatsApp (Landline)"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        ) : null}

                        {getEmailArray(prospect.emails).length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendEmail(getEmailArray(prospect.emails)[0])}
                            title="Send Email"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}

                        {getPhoneArray(prospect.phones).length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => makeCall(getPhoneArray(prospect.phones)[0])}
                            title="Call"
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        )}

                        {prospect.status !== 'added_to_crm' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleAddToCRM(prospect)}
                            title="Add to CRM"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Location:</span> {prospect.city}, {prospect.country}
                      </div>
                      {prospect.positions > 0 && (
                        <div>
                          <span className="font-medium">Positions:</span> {prospect.positions}
                        </div>
                      )}
                      {getPhoneArray(prospect.phones).length > 0 && (
                        <div>
                          <span className="font-medium">Phones:</span> {getPhoneArray(prospect.phones).join(', ')}
                        </div>
                      )}
                      {getEmailArray(prospect.emails).length > 0 && (
                        <div>
                          <span className="font-medium">Emails:</span> {getEmailArray(prospect.emails).join(', ')}
                        </div>
                      )}
                      {prospect.website && (
                        <div>
                          <span className="font-medium">Website:</span> <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{prospect.website}</a>
                        </div>
                      )}
                    </div>
                    {prospect.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                        <span className="font-medium">Notes:</span> {prospect.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Import and Add Prospect dialogs (same as before) */}
      <div className="flex gap-2 mt-6">
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import JSON
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Prospects from JSON</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Upload JSON File</label>
                <Input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="mb-2"
                />
                <div className="text-xs text-gray-500 mb-2">Or paste JSON data below:</div>
                <Textarea
                  placeholder="Paste your JSON data here..."
                  value={importData}
                  onChange={(e) => {
                    setImportData(e.target.value);
                    setImportFile(null);
                  }}
                  rows={8}
                  disabled={importing}
                />
              </div>

              {importing && (
                <div className="space-y-2">
                  <Progress value={importProgress} className="w-full" />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">{importProgressText || 'Processing...'}</p>
                    <p className="text-sm text-gray-500">{Math.round(importProgress)}%</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setShowImportDialog(false);
                  setImportData('');
                  setImportFile(null);
                  setImporting(false);
                  setImportProgress(0);
                  setImportProgressText('');
                }} disabled={importing}>
                  Cancel
                </Button>
                <Button onClick={handleImportProspects} disabled={(!importData && !importFile) || importing}>
                  {importing ? 'Importing...' : 'Import Prospects'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Prospect
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Prospect</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Business Type *</label>
                  <Select value={formData.businessType} onValueChange={(value) => setFormData(prev => ({ ...prev, businessType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call-center">Call Center</SelectItem>
                      <SelectItem value="voip-reseller">VoIP Reseller</SelectItem>
                      <SelectItem value="data-vendor">Data Vendor</SelectItem>
                      <SelectItem value="workspace-rental">Workspace Rental</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Country *</label>
                  <Select value={formData.country} onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morocco">Morocco</SelectItem>
                      <SelectItem value="Tunisia">Tunisia</SelectItem>
                      <SelectItem value="Senegal">Senegal</SelectItem>
                      <SelectItem value="Ivory Coast">Ivory Coast</SelectItem>
                      <SelectItem value="Guinea">Guinea</SelectItem>
                      <SelectItem value="Cameroon">Cameroon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">City *</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Positions</label>
                  <Input
                    type="number"
                    value={formData.positions}
                    onChange={(e) => setFormData(prev => ({ ...prev, positions: e.target.value }))}
                    placeholder="Number of positions"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone Numbers *</label>
                {formData.phones.map((phone, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={phone}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        phones: prev.phones.map((p, i) => i === index ? e.target.value : p)
                      }))}
                      placeholder="Phone number"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email Addresses</label>
                {formData.emails.map((email, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={email}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        emails: prev.emails.map((p, i) => i === index ? e.target.value : p)
                      }))}
                      placeholder="Email address"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddProspect}>
                  Add Prospect
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
