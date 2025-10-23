'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientTopup, FinancialAnalyticsService } from '@/lib/services/financial-analytics-service';
import { CallCenter } from '@/lib/types/external-crm';
import { ExternalCRMService } from '@/lib/services/external-crm-service';

interface ClientTopUpsManagementProps {
  callCenters: CallCenter[];
}

const PAYMENT_METHODS = FinancialAnalyticsService.getPaymentMethodOptions();
const COUNTRIES = FinancialAnalyticsService.getCountryOptions();

export function ClientTopUpsManagement({ callCenters }: ClientTopUpsManagementProps) {
  const [topups, setTopups] = useState<ClientTopup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTopup, setEditingTopup] = useState<ClientTopup | undefined>();
  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    callCenterName: '',
    amountEUR: 0,
    paymentMethod: '',
    date: '',
    country: '',
    notes: '',
  });

  useEffect(() => {
    loadTopups();
  }, []);

  const loadTopups = async () => {
    try {
      const response = await fetch('/api/external-crm/top-ups');
      const result = await response.json();
      if (result.success) {
        setTopups(result.data);
      }
    } catch (error) {
      console.error('Error loading top-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const topupData = {
        ...formData,
        date: new Date(formData.date).toISOString(),
      };

      if (editingTopup) {
        const response = await fetch('/api/external-crm/top-ups', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTopup.id, ...topupData }),
        });
        const result = await response.json();
        if (result.success) {
          setTopups(prev => prev.map(t => t.id === editingTopup.id ? result.data : t));
        }
      } else {
        const response = await fetch('/api/external-crm/top-ups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(topupData),
        });
        const result = await response.json();
        if (result.success) {
          setTopups(prev => [result.data, ...prev]);
        }
      }

      setShowForm(false);
      setEditingTopup(undefined);
      resetForm();
    } catch (error) {
      console.error('Error saving top-up:', error);
    }
  };

  const handleEdit = (topup: ClientTopup) => {
    setEditingTopup(topup);
    setFormData({
      clientId: topup.clientId,
      clientName: topup.clientName,
      callCenterName: topup.callCenterName,
      amountEUR: topup.amountEUR,
      paymentMethod: topup.paymentMethod,
      date: topup.date.split('T')[0], // Convert to date input format
      country: topup.country,
      notes: topup.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (topupId: string) => {
    if (!confirm('Are you sure you want to delete this top-up record?')) return;

    try {
      const response = await fetch(`/api/external-crm/top-ups?id=${topupId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setTopups(prev => prev.filter(t => t.id !== topupId));
      }
    } catch (error) {
      console.error('Error deleting top-up:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      clientName: '',
      callCenterName: '',
      amountEUR: 0,
      paymentMethod: '',
      date: new Date().toISOString().split('T')[0],
      country: '',
      notes: '',
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTopup(undefined);
    resetForm();
  };

  const totalTopups = topups.reduce((sum, topup) => sum + topup.amountEUR, 0);

  if (loading) {
    return <div className="text-center py-8">Loading top-ups...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Client Top-ups ({topups.length})</h3>
          <p className="text-sm text-gray-600">
            Total: {FinancialAnalyticsService.formatCurrency(totalTopups, 'EUR')}
          </p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingTopup(undefined); }}>
              Add Top-up
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTopup ? 'Edit Top-up' : 'Add Client Top-up'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="callCenterName">Call Center Name *</Label>
                  <Input
                    id="callCenterName"
                    value={formData.callCenterName}
                    onChange={(e) => setFormData(prev => ({ ...prev, callCenterName: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount (EUR) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amountEUR}
                    onChange={(e) => setFormData(prev => ({ ...prev, amountEUR: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method *</Label>
                  <Select value={formData.paymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(method => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Select value={formData.country} onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Additional details about the top-up..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTopup ? 'Update' : 'Add'} Top-up
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {topups.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No top-ups recorded yet. Add your first client top-up to track payments.
            </CardContent>
          </Card>
        ) : (
          topups.map(topup => (
            <Card key={topup.id}>
              <CardContent className="py-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <span className="font-semibold text-lg">
                        {FinancialAnalyticsService.formatCurrency(topup.amountEUR, 'EUR')}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(topup.date).toLocaleDateString()}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {topup.paymentMethod}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 mb-1">
                      <strong>{topup.clientName}</strong> - {topup.callCenterName}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {topup.country}
                    </div>
                    {topup.notes && (
                      <p className="text-sm text-gray-700">{topup.notes}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(topup)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(topup.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}