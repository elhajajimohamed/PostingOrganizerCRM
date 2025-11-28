'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CallCenter, DESTINATION_OPTIONS } from '@/lib/types/external-crm';

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

const BUSINESS_TYPE_OPTIONS = [
    { value: 'call-center', label: '🏢 Call Center' },
    { value: 'voip-reseller', label: '📞 VoIP Reseller' },
    { value: 'data-vendor', label: '📄 Data Vendor (Files)' },
    { value: 'workspace-rental', label: '🏢 Workspace Rental' },
    { value: 'individual', label: '👤 Individual' }
];

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
    // New destinations field (multiple selection)
    destinations: callCenter?.destinations || [],
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
    businessType: callCenter?.businessType || undefined,
    markets: callCenter?.markets || [],
    source: callCenter?.source || '',
    foundDate: callCenter?.foundDate || '',
    lastUpdated: callCenter?.lastUpdated || '',
    // Absence management fields
    absentDays: callCenter?.absentDays || 0,
    absentUntil: callCenter?.absentUntil || ''
  });

  const [customDestination, setCustomDestination] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 [FORM] CallCenterForm handleSubmit called');
    console.log('🔍 [FORM] Form data being submitted:', formData);
    console.log('🔍 [FORM] Destinations in form data:', formData.destinations);
    console.log('🔍 [FORM] Destinations type:', typeof formData.destinations);
    console.log('🔍 [FORM] Destinations isArray:', Array.isArray(formData.destinations));
    console.log('🔍 [FORM] Destinations length:', formData.destinations?.length);
    console.log('🔍 [FORM] Full form data JSON:', JSON.stringify(formData, null, 2));
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

          {/* Destinations */}
          <div>
            <Label>Destinations (Where to call) - Multiple selection</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 border rounded-md">
              {DESTINATION_OPTIONS.map(destination => (
                <div key={destination} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`destination-${destination}`}
                    checked={formData.destinations.includes(destination)}
                    onChange={(e) => {
                      console.log('🔍 [FORM] Checkbox changed for destination:', destination, 'checked:', e.target.checked);
                      if (e.target.checked) {
                        const newDestinations = [...formData.destinations, destination];
                        console.log('🔍 [FORM] Adding destination:', destination, 'new destinations:', newDestinations);
                        setFormData(prev => ({
                          ...prev,
                          destinations: newDestinations
                        }));
                      } else {
                        const filteredDestinations = formData.destinations.filter(d => d !== destination);
                        console.log('🔍 [FORM] Removing destination:', destination, 'new destinations:', filteredDestinations);
                        setFormData(prev => ({
                          ...prev,
                          destinations: filteredDestinations
                        }));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor={`destination-${destination}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {destination}
                  </label>
                </div>
              ))}
            </div>
            
            {/* Custom destination input */}
            <div className="mt-3">
              <Label htmlFor="custom-destination">Add Custom Destination</Label>
              <div className="flex space-x-2">
                <Input
                  id="custom-destination"
                  value={customDestination}
                  onChange={(e) => setCustomDestination(e.target.value)}
                  placeholder="Enter custom destination"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const trimmedDestination = customDestination.trim();
                    console.log('🔍 [FORM] Add custom destination clicked:', trimmedDestination);
                    console.log('🔍 [FORM] Current destinations:', formData.destinations);
                    console.log('🔍 [FORM] Already exists:', formData.destinations.includes(trimmedDestination));
                    
                    if (trimmedDestination && !formData.destinations.includes(trimmedDestination)) {
                      const newDestinations = [...formData.destinations, trimmedDestination];
                      console.log('🔍 [FORM] Adding custom destination:', trimmedDestination, 'new destinations:', newDestinations);
                      setFormData(prev => ({
                        ...prev,
                        destinations: newDestinations
                      }));
                      setCustomDestination('');
                    } else if (formData.destinations.includes(trimmedDestination)) {
                      console.log('🔍 [FORM] Custom destination already exists:', trimmedDestination);
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
            
            {/* Display selected destinations */}
            {formData.destinations.length > 0 && (
              <div className="mt-3">
                <Label>Selected Destinations:</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {formData.destinations.map((dest, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {dest}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            destinations: prev.destinations.filter(d => d !== dest)
                          }));
                        }}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Business Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Label htmlFor="businessType">Business Type</Label>
              <Select
                value={formData.businessType || ''}
                onValueChange={(value: 'call-center' | 'voip-reseller' | 'data-vendor' | 'workspace-rental' | 'individual') =>
                  setFormData(prev => ({ ...prev, businessType: value || undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type">Type (Legacy)</Label>
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
            
            {/* Absence Management Section */}
            <div className="border-t pt-4 mt-6">
              <Label htmlFor="absentDays" className="text-lg font-medium text-orange-600">
                📞 Absence Management
              </Label>
              <p className="text-sm text-gray-600 mb-3">
                Set how many days this call center should be excluded from daily call suggestions
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="absentDays">Absence Period (Days)</Label>
                  <Input
                    id="absentDays"
                    type="number"
                    min="0"
                    max="365"
                    value={formData.absentDays}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setFormData(prev => ({ 
                        ...prev, 
                        absentDays: value,
                        absentUntil: value > 0 ? new Date(Date.now() + (value * 24 * 60 * 60 * 1000)).toISOString() : ''
                      }));
                    }}
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Set to 0 for no absence. Max 365 days.
                  </p>
                </div>
                {formData.absentDays > 0 && (
                  <div>
                    <Label>Absent Until</Label>
                    <div className="p-2 bg-orange-50 border border-orange-200 rounded-md">
                      <p className="text-sm font-medium text-orange-700">
                        {new Date(formData.absentUntil).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-orange-600">
                        {formData.absentDays} day{formData.absentDays !== 1 ? 's' : ''} from today
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
