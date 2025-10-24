'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CallCenter } from '@/lib/types/external-crm';
import { CallCenterForm } from './call-center-form';
import { ContactManagement } from './contact-management';
import { InteractionHistory } from './interaction-history';
import { PhoneDetectionService } from '@/lib/services/phone-detection-service';
import {
  Edit,
  Phone,
  Mail,
  Globe,
  MapPin,
  Building,
  Calendar,
  DollarSign,
  Tag,
  Users,
  Target,
  TrendingUp,
  ExternalLink
} from 'lucide-react';

interface CallCenterDetailViewProps {
  callCenter: CallCenter;
  onUpdate: (data: Omit<CallCenter, 'id' | 'createdAt'>) => void;
  onEdit: (callCenter: CallCenter) => void;
  onDelete: (id: string) => void;
}

const STATUS_COLORS = {
  'New': 'bg-blue-100 text-blue-800 border-blue-200',
  'Contacted': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Qualified': 'bg-purple-100 text-purple-800 border-purple-200',
  'Proposal': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Negotiation': 'bg-orange-100 text-orange-800 border-orange-200',
  'Closed-Won': 'bg-green-100 text-green-800 border-green-200',
  'Closed-Lost': 'bg-red-100 text-red-800 border-red-200',
  'On-Hold': 'bg-gray-100 text-gray-800 border-gray-200'
};

export function CallCenterDetailView({ callCenter, onUpdate, onEdit, onDelete }: CallCenterDetailViewProps) {
  const [showEditForm, setShowEditForm] = useState(false);

  const handleFormSubmit = (data: Omit<CallCenter, 'id' | 'createdAt'>) => {
    onUpdate(data);
    setShowEditForm(false);
  };

  const handleFormCancel = () => {
    setShowEditForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <Building className="w-8 h-8 text-blue-600" />
                <div>
                  <CardTitle className="text-2xl">{callCenter.name}</CardTitle>
                  <p className="text-gray-600 flex items-center mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    {callCenter.city}, {callCenter.country}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4 mt-3">
                <Badge className={`${STATUS_COLORS[callCenter.status as keyof typeof STATUS_COLORS]} px-3 py-1`}>
                  {callCenter.status}
                </Badge>
                {callCenter.positions && (
                  <span className="text-sm text-gray-600">
                    📋 {callCenter.positions} positions
                  </span>
                )}
                {callCenter.value && (
                  <span className="text-sm text-green-600 font-medium">
                    💰 {callCenter.value.toLocaleString()} {callCenter.currency}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => onEdit(callCenter)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Details
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Call Center Details</DialogTitle>
                  </DialogHeader>
                  <CallCenterForm
                    callCenter={callCenter}
                    onSubmit={handleFormSubmit}
                    onCancel={handleFormCancel}
                  />
                </DialogContent>
              </Dialog>
              <Button variant="destructive" size="sm" onClick={() => onDelete(callCenter.id)}>
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Quick Info Cards */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-700">Contact Information</h4>
              {callCenter.phones && callCenter.phones.length > 0 && (
                <div className="flex items-center text-sm">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{callCenter.phones[0]}</span>
                  {callCenter.phone_infos && callCenter.phone_infos[0] && callCenter.phone_infos[0].is_mobile && callCenter.phone_infos[0].whatsapp_confidence >= 0.7 && (
                    <a
                      href={PhoneDetectionService.getWhatsAppLink(callCenter.phones[0])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 ml-2"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              )}
              {callCenter.email && (
                <div className="flex items-center text-sm">
                  <Mail className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="truncate">{callCenter.email}</span>
                </div>
              )}
              {callCenter.website && (
                <div className="flex items-center text-sm">
                  <Globe className="w-4 h-4 mr-2 text-gray-400" />
                  <a
                    href={callCenter.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center"
                  >
                    Visit Website
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-700">Business Details</h4>
              {callCenter.type && (
                <p className="text-sm">🏢 Type: {callCenter.type}</p>
              )}
              {callCenter.markets && callCenter.markets.length > 0 && (
                <p className="text-sm">🎯 Markets: {callCenter.markets.join(', ')}</p>
              )}
              {callCenter.source && (
                <p className="text-sm">🔍 Source: {callCenter.source}</p>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-700">Timeline</h4>
              <p className="text-sm">
                📅 Added: {new Date(callCenter.createdAt).toLocaleDateString()}
              </p>
              {callCenter.lastContacted && (
                <p className="text-sm">
                  📞 Last Contact: {new Date(callCenter.lastContacted).toLocaleDateString()}
                </p>
              )}
              {callCenter.foundDate && (
                <p className="text-sm">
                  🔍 Found: {new Date(callCenter.foundDate).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-700">Tags & Notes</h4>
              {callCenter.tags && callCenter.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {callCenter.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              {callCenter.notes && (
                <p className="text-sm text-gray-600 line-clamp-2">{callCenter.notes}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Management Tabs */}
      <Tabs defaultValue="contacts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contacts" className="flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Contact Management
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center">
            <Target className="w-4 h-4 mr-2" />
            Interaction History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-4">
          <ContactManagement
            callCenterId={callCenter.id}
            callCenterName={callCenter.name}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <InteractionHistory
            callCenterId={callCenter.id}
            callCenterName={callCenter.name}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}