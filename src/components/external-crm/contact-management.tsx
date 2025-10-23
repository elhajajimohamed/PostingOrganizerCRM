'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Contact } from '@/lib/types/external-crm';
import { ExternalCRMSubcollectionsService, CrossSectionContactsService } from '@/lib/services/external-crm-service';
import { Plus, Edit, Trash2, Phone, Mail, User, Calendar } from 'lucide-react';

interface ContactManagementProps {
  callCenterId?: string; // Made optional for global view
  callCenterName?: string; // Made optional for global view
  showGlobalView?: boolean; // New prop to enable global view
}

export function ContactManagement({ callCenterId, callCenterName, showGlobalView = false }: ContactManagementProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>();
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    phone: '',
    email: '',
    notes: '',
    lastContact: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadContacts();
  }, [callCenterId]);

  const loadContacts = async () => {
    try {
      setLoading(true);

      if (showGlobalView) {
        // Load all contacts across call centers
        const { contacts } = await CrossSectionContactsService.getAllContacts();
        setContacts(contacts);
      } else if (callCenterId) {
        // Load contacts for specific call center
        const data = await ExternalCRMSubcollectionsService.getContacts(callCenterId);
        setContacts(data);
      } else {
        setContacts([]);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (showGlobalView) {
        // In global view, we can't add new contacts without specifying a call center
        // This would require a call center selection dialog
        alert('Please use the individual call center view to add new contacts.');
        return;
      }

      if (!callCenterId) {
        alert('Call center ID is required to save contact.');
        return;
      }

      if (editingContact) {
        await ExternalCRMSubcollectionsService.updateContact(callCenterId, editingContact.id, formData);
      } else {
        await ExternalCRMSubcollectionsService.addContact(callCenterId, formData);
      }

      await loadContacts();
      setShowForm(false);
      setEditingContact(undefined);
      resetForm();
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      position: contact.position,
      phone: contact.phone,
      email: contact.email,
      notes: contact.notes,
      lastContact: contact.lastContact
    });
    setShowForm(true);
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      if (showGlobalView) {
        // In global view, we need to find which call center this contact belongs to
        // For now, we'll show a message asking user to use individual call center view
        alert('Please use the individual call center view to delete contacts.');
        return;
      }

      if (!callCenterId) {
        alert('Call center ID is required to delete contact.');
        return;
      }

      await ExternalCRMSubcollectionsService.deleteContact(callCenterId, contactId);
      await loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      position: '',
      phone: '',
      email: '',
      notes: '',
      lastContact: new Date().toISOString().split('T')[0]
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            {showGlobalView ? 'Global Contact Management' : `Contact Management - ${callCenterName}`}
          </CardTitle>
          <Dialog open={showForm} onOpenChange={(open) => {
            if (!open) {
              setShowForm(false);
              setEditingContact(undefined);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingContact ? 'Edit Contact' : 'Add New Contact'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="position">Position/Title</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="CEO, HR Manager, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+212 6XX XXX XXX"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@company.com"
                  />
                </div>

                <div>
                  <Label htmlFor="lastContact">Last Contact Date</Label>
                  <Input
                    id="lastContact"
                    type="date"
                    value={formData.lastContact}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastContact: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes about this contact..."
                    rows={3}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button type="submit">
                    {editingContact ? 'Update Contact' : 'Add Contact'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingContact(undefined);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No contacts added yet.</p>
            <p className="text-sm">Add key contacts to keep track of important relationships.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map(contact => (
              <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{contact.name}</h4>
                      {contact.position && (
                        <p className="text-sm text-gray-600">{contact.position}</p>
                      )}
                      {showGlobalView && 'callCenterName' in contact && (contact as any).callCenterName && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {(contact as any).callCenterName}
                        </Badge>
                      )}
                      <div className="flex items-center space-x-4 mt-1">
                        {contact.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="w-4 h-4 mr-1" />
                            {contact.phone}
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="w-4 h-4 mr-1" />
                            {contact.email}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Last contacted: {new Date(contact.lastContact).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {contact.notes && (
                    <p className="text-sm text-gray-600 mt-2 pl-13">{contact.notes}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(contact)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(contact.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}