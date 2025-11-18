// components/Form.tsx
import { useState, useEffect } from 'react';
import { Job } from '@/store/api/job';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Save } from 'lucide-react';
import { useGetAccountsQuery } from '@/store/api/job';

export interface JobFormData {
  name: string;
  job_number: string;
  account_id: number;
  description?: string;
  priority?: string;
  start_date?: string;
  due_date?: string;
}

interface JobFormProps {
  mode: 'new' | 'edit';
  job?: Job;
  onBack: () => void;
  onSave: (data: JobFormData) => void;
}

export const JobForm = ({ mode, job, onBack, onSave }: JobFormProps) => {
  const [formData, setFormData] = useState<JobFormData>({
    name: '',
    job_number: '',
    account_id: 0,
    description: '',
    priority: '',
    start_date: '',
    due_date: '',
  });

  const { data: accountsData } = useGetAccountsQuery({ limit: 100 });
  const accounts = accountsData || [];

  useEffect(() => {
    if (job && mode === 'edit') {
      setFormData({
        name: job.name || '',
        job_number: job.job_number || '',
        account_id: job.account_id || 0,
        description: job.description || '',
        priority: job.priority || '',
        start_date: job.start_date || '',
        due_date: job.due_date || '',
      });
    }
  }, [job, mode]);

  const handleChange = (field: keyof JobFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">
          {mode === 'new' ? 'Create New Job' : 'Edit Job'}
        </h1>
        <div></div> {/* Spacer for alignment */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Job Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_number">Job Number *</Label>
                <Input
                  id="job_number"
                  value={formData.job_number}
                  onChange={(e) => handleChange('job_number', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_id">Account *</Label>
                <Select
                  value={formData.account_id.toString()}
                  onValueChange={(value) => handleChange('account_id', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority || ''}
                  onValueChange={(value) => handleChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleChange('due_date', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onBack}>
                Cancel
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Save Job
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};