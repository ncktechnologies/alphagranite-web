import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface CreateEventFormProps {
  onClose: () => void;
  selectedDate: Date | null;
  onEventCreated?: () => void;
}

const CreateEventForm: React.FC<CreateEventFormProps> = ({
  onClose,
  selectedDate,
  onEventCreated,
}) => {
  const [formData, setFormData] = useState({
    fab_id: '',
    title: '',
    start_time: '09:00',
    end_time: '10:00',
    description: '',
    assigned_to: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fab_id || !formData.title) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      // Here you would call your API to create the event
      console.log('Creating event:', {
        ...formData,
        date: selectedDate,
      });

      toast.success('Event scheduled successfully');
      onEventCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create Plan');
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-lg border-l z-50 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b flex justify-between items-center">
        <CardTitle>Create Plan</CardTitle>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-md"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date Display */}
          <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Scheduled Date</p>
              <p className="font-semibold">
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'No date selected'}
              </p>
            </div>
          </div>

          {/* Fab ID */}
          <div>
            <Label htmlFor="fab_id" className="text-sm font-medium">
              FAB ID *
            </Label>
            <Input
              id="fab_id"
              type="text"
              placeholder="e.g., 2390"
              value={formData.fab_id}
              onChange={(e) =>
                setFormData({ ...formData, fab_id: e.target.value })
              }
              className="mt-2"
            />
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium">
              Event Title *
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="e.g., Cutting session"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="mt-2"
            />
          </div>

          {/* Time Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Time</Label>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-600 mb-1 block">Start Time</label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-600 mb-1 block">End Time</label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <Label htmlFor="assigned_to" className="text-sm font-medium">
              Assign To
            </Label>
            <Select
              value={formData.assigned_to}
              onValueChange={(value) =>
                setFormData({ ...formData, assigned_to: value })
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operator1">John Smith</SelectItem>
                <SelectItem value="operator2">Sarah Johnson</SelectItem>
                <SelectItem value="operator3">Mike Davis</SelectItem>
                <SelectItem value="operator4">Lisa Anderson</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Description / Notes
            </Label>
            <Textarea
              id="description"
              placeholder="Add any notes about this event..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="mt-2 min-h-24"
            />
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="p-6 border-t bg-gray-50 flex gap-3">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1"
        >
          Schedule Event
        </Button>
      </div>
    </div>
  );
};

export default CreateEventForm;
