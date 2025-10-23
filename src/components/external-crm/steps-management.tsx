'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Step } from '@/lib/types/external-crm';
import { ExternalCRMSubcollectionsService } from '@/lib/services/external-crm-service';

interface StepsManagementProps {
  callCenterId: string;
}

export function StepsManagement({ callCenterId }: StepsManagementProps) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStep, setEditingStep] = useState<Step | undefined>();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    completed: false,
    notes: '',
  });

  useEffect(() => {
    loadSteps();
  }, [callCenterId]);

  const loadSteps = async () => {
    try {
      const data = await ExternalCRMSubcollectionsService.getSteps(callCenterId);
      setSteps(data);
    } catch (error) {
      console.error('Error loading steps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingStep) {
        await ExternalCRMSubcollectionsService.updateStep(callCenterId, editingStep.id, formData);
        setSteps(prev => prev.map(s => s.id === editingStep.id ? { ...s, ...formData } : s));
      } else {
        const stepId = await ExternalCRMSubcollectionsService.addStep(callCenterId, formData);
        const newStep: Step = {
          id: stepId,
          ...formData,
        };
        setSteps(prev => [...prev, newStep]);
      }

      setShowForm(false);
      setEditingStep(undefined);
      resetForm();
    } catch (error) {
      console.error('Error saving step:', error);
    }
  };

  const handleEdit = (step: Step) => {
    setEditingStep(step);
    setFormData({
      title: step.title,
      description: step.description,
      date: step.date,
      completed: step.completed,
      notes: step.notes,
    });
    setShowForm(true);
  };

  const handleDelete = async (stepId: string) => {
    if (!confirm('Are you sure you want to delete this step?')) return;

    try {
      await ExternalCRMSubcollectionsService.deleteStep(callCenterId, stepId);
      setSteps(prev => prev.filter(s => s.id !== stepId));
    } catch (error) {
      console.error('Error deleting step:', error);
    }
  };

  const handleToggleComplete = async (stepId: string, completed: boolean) => {
    try {
      await ExternalCRMSubcollectionsService.updateStep(callCenterId, stepId, { completed });
      setSteps(prev => prev.map(s => s.id === stepId ? { ...s, completed } : s));
    } catch (error) {
      console.error('Error updating step completion:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      completed: false,
      notes: '',
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingStep(undefined);
    resetForm();
  };

  if (loading) {
    return <div className="text-center py-8">Loading steps...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Sales Steps ({steps.length})</h3>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingStep(undefined); }}>
              Add Step
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStep ? 'Edit Step' : 'Add Step'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="completed"
                    checked={formData.completed}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, completed: !!checked }))}
                  />
                  <Label htmlFor="completed">Completed</Label>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingStep ? 'Update' : 'Add'} Step
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {steps.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No steps added yet. Add your first sales step to track progress.
            </CardContent>
          </Card>
        ) : (
          steps.map(step => (
            <Card key={step.id} className={step.completed ? 'bg-green-50 border-green-200' : ''}>
              <CardContent className="py-4">
                <div className="flex items-start space-x-4">
                  <Checkbox
                    checked={step.completed}
                    onCheckedChange={(checked) => handleToggleComplete(step.id, !!checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className={`font-semibold ${step.completed ? 'line-through text-gray-500' : ''}`}>
                          {step.title}
                        </h4>
                        {step.description && (
                          <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                        )}
                        {step.date && (
                          <p className="text-sm text-gray-500 mt-1">
                            Due: {new Date(step.date).toLocaleDateString()}
                          </p>
                        )}
                        {step.notes && (
                          <p className="text-sm text-gray-600 mt-2 italic">{step.notes}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(step)}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(step.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
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