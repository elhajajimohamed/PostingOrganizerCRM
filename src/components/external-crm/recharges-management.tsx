'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Recharge } from '@/lib/types/external-crm';
import { ExternalCRMSubcollectionsService } from '@/lib/services/external-crm-service';

interface RechargesManagementProps {
  callCenterId: string;
}

const CURRENCY_OPTIONS = ['MAD', 'EUR', 'USD', 'XOF'];
const METHOD_OPTIONS = [
  'Bank Transfer',
  'Cash',
  'Check',
  'Credit Card',
  'Wire Transfer',
  'Mobile Payment',
  'Other'
];

export function RechargesManagement({ callCenterId }: RechargesManagementProps) {
  const [recharges, setRecharges] = useState<Recharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecharge, setEditingRecharge] = useState<Recharge | undefined>();
  const [formData, setFormData] = useState({
    amount: 0,
    currency: 'MAD',
    date: '',
    method: '',
    notes: '',
  });

  useEffect(() => {
    loadRecharges();
  }, [callCenterId]);

  const loadRecharges = async () => {
    try {
      const data = await ExternalCRMSubcollectionsService.getRecharges(callCenterId);
      setRecharges(data);
    } catch (error) {
      console.error('Error loading recharges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingRecharge) {
        await ExternalCRMSubcollectionsService.updateRecharge(callCenterId, editingRecharge.id, formData);
        setRecharges(prev => prev.map(r => r.id === editingRecharge.id ? { ...r, ...formData } : r));
      } else {
        const rechargeId = await ExternalCRMSubcollectionsService.addRecharge(callCenterId, formData);
        const newRecharge: Recharge = {
          id: rechargeId,
          ...formData,
        };
        setRecharges(prev => [newRecharge, ...prev]); // Add to beginning since sorted by date desc
      }

      setShowForm(false);
      setEditingRecharge(undefined);
      resetForm();
    } catch (error) {
      console.error('Error saving recharge:', error);
    }
  };

  const handleEdit = (recharge: Recharge) => {
    setEditingRecharge(recharge);
    setFormData({
      amount: recharge.amount,
      currency: recharge.currency || 'MAD',
      date: recharge.date,
      method: recharge.method,
      notes: recharge.notes,
    });
    setShowForm(true);
  };

  const handleDelete = async (rechargeId: string) => {
    if (!confirm('Are you sure you want to delete this recharge record?')) return;

    try {
      await ExternalCRMSubcollectionsService.deleteRecharge(callCenterId, rechargeId);
      setRecharges(prev => prev.filter(r => r.id !== rechargeId));
    } catch (error) {
      console.error('Error deleting recharge:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: 0,
      currency: 'MAD',
      date: new Date().toISOString().split('T')[0], // Today's date
      method: '',
      notes: '',
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRecharge(undefined);
    resetForm();
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const totalRecharges = recharges.reduce((sum, recharge) => sum + recharge.amount, 0);

  if (loading) {
    return <div className="text-center py-8">Loading recharges...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Recharges ({recharges.length})</h3>
          <p className="text-sm text-gray-600">
            Total: {formatCurrency(totalRecharges, 'MAD')}
          </p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingRecharge(undefined); }}>
              Add Recharge
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRecharge ? 'Edit Recharge' : 'Add Recharge'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map(currency => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
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
                  <Label htmlFor="method">Payment Method</Label>
                  <Select value={formData.method} onValueChange={(value) => setFormData(prev => ({ ...prev, method: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {METHOD_OPTIONS.map(method => (
                        <SelectItem key={method} value={method}>
                          {method}
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
                  placeholder="Additional details about the recharge..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRecharge ? 'Update' : 'Add'} Recharge
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {recharges.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No recharges recorded yet. Add your first recharge to track payments.
            </CardContent>
          </Card>
        ) : (
          recharges.map(recharge => (
            <Card key={recharge.id}>
              <CardContent className="py-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <span className="font-semibold text-lg">
                        {formatCurrency(recharge.amount, recharge.currency || 'MAD')}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(recharge.date).toLocaleDateString()}
                      </span>
                      {recharge.method && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {recharge.method}
                        </span>
                      )}
                    </div>
                    {recharge.notes && (
                      <p className="text-sm text-gray-700">{recharge.notes}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(recharge)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(recharge.id)}>
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
