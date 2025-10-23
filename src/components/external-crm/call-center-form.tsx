'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CallCenter } from '@/lib/types/external-crm';

interface CallCenterFormProps {
  callCenter?: CallCenter;
  onSubmit: (data: Omit<CallCenter, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

const STATUS_OPTIONS = [
    'New',
    'Contacted',
    'Qualified',
    'Proposal',
    'Negotiation',
    'Closed-Won',
    'Closed-Lost',
    'On-Hold'
];

const CURRENCY_OPTIONS = ['MAD', 'EUR', 'USD', 'XOF'];

export function CallCenterForm({ callCenter, onSubmit, onCancel }: CallCenterFormProps) {
  const [formData, setFormData] = useState({
    name: callCenter?.name || '',
    country: (callCenter?.country as 'Morocco' | 'Tunisia' | 'Senegal' | 'Ivory Coast' | 'Guinea' | 'Cameroon') || 'Morocco',
    city: callCenter?.city || '',
    positions: callCenter?.positions || 0,
    status: callCenter?.status || 'New',
    phones: callCenter?.phones || [],
    emails: callCenter?.emails || [],
    website: callCenter?.website || '',
    tags: callCenter?.tags || [],
    notes: callCenter?.notes || '',
    createdAt: callCenter?.createdAt || '',
    updatedAt: callCenter?.updatedAt || '',
    lastContacted: callCenter?.lastContacted || '',
    // Optional fields for backward compatibility
    competitors: callCenter?.competitors || [],
    address: callCenter?.address || '',
    email: callCenter?.email || '',
    socialMedia: callCenter?.socialMedia || [],
    contacts: callCenter?.contacts || [],
    steps: callCenter?.steps || [],
    callHistory: callCenter?.callHistory || [],
    recharges: callCenter?.recharges || [],
    value: callCenter?.value || 0,
    currency: callCenter?.currency || 'MAD',
    archived: callCenter?.archived || false,
    completed: callCenter?.completed || false,
    type: callCenter?.type || '',
    markets: callCenter?.markets || [],
    source: callCenter?.source || '',
    foundDate: callCenter?.foundDate || '',
    lastUpdated: callCenter?.lastUpdated || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleArrayChange = (field: 'competitors' | 'phones' | 'socialMedia' | 'markets' | 'tags', value: string) => {
    const array = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [field]: array }));
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>{callCenter ? 'Edit Call Center' : 'Add Call Center'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed-Won' | 'Closed-Lost' | 'On-Hold') => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="country">Country *</Label>
              <Select
                value={formData.country}
                onValueChange={(value: 'Morocco' | 'Tunisia' | 'Senegal' | 'Ivory Coast' | 'Guinea' | 'Cameroon') =>
                  setFormData(prev => ({ ...prev, country: value }))
                }
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
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
          </div>

          {/* Business Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="positions">Positions</Label>
              <Input
                id="positions"
                type="number"
                value={formData.positions}
                onChange={(e) => setFormData(prev => ({ ...prev, positions: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="phones">Phones (comma-separated)</Label>
              <Input
                id="phones"
                value={formData.phones.join(', ')}
                onChange={(e) => handleArrayChange('phones', e.target.value)}
                placeholder="e.g., +212 6XX XXX XXX, +212 5XX XXX XXX"
              />
            </div>
            <div>
              <Label htmlFor="emails">Emails (comma-separated)</Label>
              <Input
                id="emails"
                value={formData.emails.join(', ')}
                onChange={(e) => setFormData(prev => ({ ...prev, emails: e.target.value.split(',').map(email => email.trim()).filter(email => email) }))}
                placeholder="e.g., contact@company.com, info@company.com"
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              />
            </div>
          </div>

          {/* Address and Social Media */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="socialMedia">Social Media (comma-separated)</Label>
              <Input
                id="socialMedia"
                value={formData.socialMedia.join(', ')}
                onChange={(e) => handleArrayChange('socialMedia', e.target.value)}
                placeholder="e.g., https://facebook.com/page, https://linkedin.com/company"
              />
            </div>
          </div>

          {/* Business Value */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type="number"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
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
                    <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="competitors">Competitors (comma-separated)</Label>
              <Input
                id="competitors"
                value={formData.competitors.join(', ')}
                onChange={(e) => handleArrayChange('competitors', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="markets">Markets (comma-separated)</Label>
              <Input
                id="markets"
                value={formData.markets.join(', ')}
                onChange={(e) => handleArrayChange('markets', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={formData.source}
                onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="foundDate">Found Date</Label>
              <Input
                id="foundDate"
                type="date"
                value={formData.foundDate}
                onChange={(e) => setFormData(prev => ({ ...prev, foundDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="lastContacted">Last Contacted</Label>
              <Input
                id="lastContacted"
                type="date"
                value={formData.lastContacted}
                onChange={(e) => setFormData(prev => ({ ...prev, lastContacted: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags.join(', ')}
                onChange={(e) => handleArrayChange('tags', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {callCenter ? 'Update' : 'Create'} Call Center
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}