'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientTopup, FinancialAnalyticsService } from '@/lib/services/financial-analytics-service';
import { CallCenter } from '@/lib/types/external-crm';
import { ExternalCRMService } from '@/lib/services/external-crm-service';
import { Search, Check, Plus } from 'lucide-react';

interface ClientTopUpsManagementProps {
  callCenters: CallCenter[];
  onDataChange?: () => void;
}

const PAYMENT_METHODS = FinancialAnalyticsService.getPaymentMethodOptions();
const COUNTRIES = FinancialAnalyticsService.getCountryOptions();

export function ClientTopUpsManagement({ callCenters, onDataChange }: ClientTopUpsManagementProps) {
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

  // Form validation states
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'client'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Searchable call center dropdown state
  const [callCenterSearch, setCallCenterSearch] = useState('');
  const [showCallCenterDropdown, setShowCallCenterDropdown] = useState(false);

  useEffect(() => {
    loadTopups();
  }, []);

  const loadTopups = async () => {
    try {
      const response = await fetch('/api/external-crm/top-ups');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        setTopups(result.data);
      } else {
        throw new Error(result.error || 'Failed to load top-ups');
      }
    } catch (error) {
      console.error('Error loading top-ups:', error);
      // Could show a toast notification here instead of just console.error
      // For now, we'll let the loading state handle the UI feedback
    } finally {
      setLoading(false);
    }
  };

  // Form validation function
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.clientName.trim()) {
      errors.clientName = 'Client name is required';
    }

    if (!formData.callCenterName.trim()) {
      errors.callCenterName = 'Call center name is required';
    }

    if (formData.amountEUR <= 0) {
      errors.amountEUR = 'Amount must be greater than 0';
    }

    if (!formData.paymentMethod) {
      errors.paymentMethod = 'Payment method is required';
    }

    if (!formData.date) {
      errors.date = 'Date is required';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        errors.date = 'Date cannot be in the future';
      }
    }

    if (!formData.country) {
      errors.country = 'Country is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

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
          setShowForm(false);
          setEditingTopup(undefined);
          resetForm();
          // Notify parent component to refresh data
          onDataChange?.();
        } else {
          setFormErrors({ submit: result.error || 'Failed to update top-up. Please check your data and try again.' });
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
          setShowForm(false);
          setEditingTopup(undefined);
          resetForm();
          // Notify parent component to refresh data
          onDataChange?.();
        } else {
          setFormErrors({ submit: result.error || 'Failed to create top-up. Please check your data and try again.' });
        }
      }
    } catch (error) {
      console.error('Error saving top-up:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setFormErrors({ submit: `${errorMessage}. Please check your connection and try again.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = useCallback((topup: ClientTopup) => {
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
  }, []);

  const handleDelete = useCallback(async (topupId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this top-up record? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/external-crm/top-ups?id=${topupId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setTopups(prev => prev.filter(t => t.id !== topupId));
        // Notify parent component to refresh data
        onDataChange?.();
        // Show success feedback
        console.log('Top-up deleted successfully');
      } else {
        throw new Error(result.error || 'Failed to delete top-up');
      }
    } catch (error) {
      console.error('Error deleting top-up:', error);
      // Show error feedback to user
      alert(`Failed to delete top-up: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [onDataChange]);

  // Filtered call centers based on search
  const filteredCallCenters = useMemo(() => {
    if (!callCenterSearch.trim()) return callCenters.slice(0, 10); // Show first 10 if no search
    return callCenters.filter(center =>
      center.name.toLowerCase().includes(callCenterSearch.toLowerCase()) ||
      center.city.toLowerCase().includes(callCenterSearch.toLowerCase()) ||
      center.country.toLowerCase().includes(callCenterSearch.toLowerCase())
    ).slice(0, 20); // Limit to 20 results for performance
  }, [callCenters, callCenterSearch]);

  const selectCallCenter = (center: CallCenter) => {
    setFormData(prev => ({
      ...prev,
      callCenterName: center.name,
      country: center.country,
      clientId: center.id.toString()
    }));
    setCallCenterSearch('');
    setShowCallCenterDropdown(false);
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
    setCallCenterSearch('');
    setShowCallCenterDropdown(false);
    setFormErrors({});
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTopup(undefined);
    resetForm();
    setFormErrors({});
    setIsSubmitting(false);
  };

  const handleCallCenterInputChange = (value: string) => {
    setFormData(prev => ({ ...prev, callCenterName: value }));
    setCallCenterSearch(value);
    setShowCallCenterDropdown(true);
  };

  // Filtered and sorted topups
  const filteredAndSortedTopups = useMemo(() => {
    let filtered = topups.filter(topup => {
      const matchesSearch = !searchTerm ||
        topup.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        topup.callCenterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        topup.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPaymentMethod = !filterPaymentMethod || topup.paymentMethod === filterPaymentMethod;
      const matchesCountry = !filterCountry || topup.country === filterCountry;

      return matchesSearch && matchesPaymentMethod && matchesCountry;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'amount':
          aValue = a.amountEUR;
          bValue = b.amountEUR;
          break;
        case 'client':
          aValue = a.clientName.toLowerCase();
          bValue = b.clientName.toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [topups, searchTerm, filterPaymentMethod, filterCountry, sortBy, sortOrder]);

  const totalTopups = topups.reduce((sum, topup) => sum + topup.amountEUR, 0);
  const filteredTotal = filteredAndSortedTopups.reduce((sum, topup) => sum + topup.amountEUR, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-48 mb-1"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                    <div className="h-8 bg-gray-200 rounded w-18"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search" className="text-sm font-medium text-gray-700">Search</Label>
              <div className="relative mt-1">
                <Input
                  id="search"
                  type="text"
                  placeholder="Search clients, centers, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div>
              <Label htmlFor="filterPayment" className="text-sm font-medium text-gray-700">Payment Method</Label>
              <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All methods</SelectItem>
                  {PAYMENT_METHODS.map(method => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filterCountry" className="text-sm font-medium text-gray-700">Country</Label>
              <Select value={filterCountry} onValueChange={setFilterCountry}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All countries</SelectItem>
                  {COUNTRIES.map(country => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sortBy" className="text-sm font-medium text-gray-700">Sort By</Label>
              <div className="flex gap-2 mt-1">
                <Select value={sortBy} onValueChange={(value: 'date' | 'amount' | 'client') => setSortBy(value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Client Top-ups ({filteredAndSortedTopups.length})</h3>
          <p className="text-sm text-gray-600">
            Total: {FinancialAnalyticsService.formatCurrency(filteredTotal, 'EUR')}
            {filteredAndSortedTopups.length !== topups.length && (
              <span className="text-gray-400 ml-2">
                (filtered from {topups.length} total)
              </span>
            )}
          </p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingTopup(undefined); }} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Top-up
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="topup-form-description">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {editingTopup ? 'Edit Top-up' : 'Add Client Top-up'}
              </DialogTitle>
              <p id="topup-form-description" className="text-sm text-gray-600 mt-2">
                {editingTopup ? 'Update the client top-up information below.' : 'Fill in the details to add a new client top-up record.'}
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {formErrors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{formErrors.submit}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName" className="text-sm font-medium">Client Name *</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, clientName: e.target.value }));
                      if (formErrors.clientName) {
                        setFormErrors(prev => ({ ...prev, clientName: '' }));
                      }
                    }}
                    placeholder="Enter client name"
                    required
                    aria-describedby={formErrors.clientName ? "clientName-error" : undefined}
                    className={`mt-1 ${formErrors.clientName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {formErrors.clientName && (
                    <p id="clientName-error" className="mt-1 text-sm text-red-600" role="alert">
                      {formErrors.clientName}
                    </p>
                  )}
                  {formErrors.clientName && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.clientName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="callCenterName" className="text-sm font-medium">Call Center Name *</Label>
                  <div className="relative mt-1">
                    <Input
                      id="callCenterName"
                      value={formData.callCenterName}
                      onChange={(e) => handleCallCenterInputChange(e.target.value)}
                      onFocus={() => setShowCallCenterDropdown(true)}
                      onBlur={() => {
                        // Delay hiding to allow click on dropdown items
                        setTimeout(() => setShowCallCenterDropdown(false), 200);
                      }}
                      placeholder="Search call centers..."
                      required
                      role="combobox"
                      aria-expanded={showCallCenterDropdown}
                      aria-haspopup="listbox"
                      aria-describedby={formErrors.callCenterName ? "callCenterName-error" : undefined}
                      className={formErrors.callCenterName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
                    />
                    {formErrors.callCenterName && (
                      <p id="callCenterName-error" className="mt-1 text-sm text-red-600" role="alert">
                        {formErrors.callCenterName}
                      </p>
                    )}
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                    {showCallCenterDropdown && (
                      <div
                        className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
                        role="listbox"
                        aria-label="Call center options"
                      >
                        {filteredCallCenters.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            No call centers found
                          </div>
                        ) : (
                          filteredCallCenters.map((center) => (
                            <div
                              key={center.id}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                              onClick={() => selectCallCenter(center)}
                              role="option"
                              aria-selected={formData.callCenterName === center.name}
                            >
                              <div>
                                <div className="font-medium">{center.name}</div>
                                <div className="text-sm text-gray-500">
                                  {center.city}, {center.country} • {center.positions} positions
                                </div>
                              </div>
                              {formData.callCenterName === center.name && (
                                <Check className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount" className="text-sm font-medium">Amount (EUR) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amountEUR || ''}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, amountEUR: parseFloat(e.target.value) || 0 }));
                      if (formErrors.amountEUR) {
                        setFormErrors(prev => ({ ...prev, amountEUR: '' }));
                      }
                    }}
                    placeholder="0.00"
                    required
                    className={`mt-1 ${formErrors.amountEUR ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {formErrors.amountEUR && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.amountEUR}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="paymentMethod" className="text-sm font-medium">Payment Method *</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, paymentMethod: value }));
                      if (formErrors.paymentMethod) {
                        setFormErrors(prev => ({ ...prev, paymentMethod: '' }));
                      }
                    }}
                  >
                    <SelectTrigger className={`mt-1 ${formErrors.paymentMethod ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(method => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.paymentMethod && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.paymentMethod}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date" className="text-sm font-medium">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, date: e.target.value }));
                      if (formErrors.date) {
                        setFormErrors(prev => ({ ...prev, date: '' }));
                      }
                    }}
                    required
                    className={`mt-1 ${formErrors.date ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {formErrors.date && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.date}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="country" className="text-sm font-medium">Country *</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, country: value }));
                      if (formErrors.country) {
                        setFormErrors(prev => ({ ...prev, country: '' }));
                      }
                    }}
                  >
                    <SelectTrigger className={`mt-1 ${formErrors.country ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}>
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
                  {formErrors.country && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.country}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Additional details about the top-up..."
                  className="mt-1"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto" disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {editingTopup ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    <>{editingTopup ? 'Update' : 'Add'} Top-up</>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {topups.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 sm:py-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No top-ups recorded yet</h3>
              <p className="text-gray-500 mb-4">Add your first client top-up to track payments and financial data.</p>
              <Button onClick={() => setShowForm(true)} className="inline-flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Top-up
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedTopups.map(topup => (
            <Card key={topup.id} className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                      <span className="font-bold text-xl text-green-600">
                        {FinancialAnalyticsService.formatCurrency(topup.amountEUR, 'EUR')}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {new Date(topup.date).toLocaleDateString()}
                        </span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                          {topup.paymentMethod}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1 mb-3">
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">{topup.clientName}</span>
                        <span className="text-gray-400 mx-2">•</span>
                        <span>{topup.callCenterName}</span>
                      </div>
                      <div className="text-sm text-gray-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {topup.country}
                      </div>
                    </div>
                    {topup.notes && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-700 leading-relaxed">{topup.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-row sm:flex-col gap-2 sm:gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(topup)} className="flex-1 sm:flex-none">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(topup.id)} className="flex-1 sm:flex-none">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
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