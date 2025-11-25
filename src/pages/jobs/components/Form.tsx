// components/Form.tsx
import { useState, useEffect } from 'react';
import { Job, Account } from '@/store/api/job';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Save } from 'lucide-react';
import { useGetAccountsQuery } from '@/store/api/job';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface JobFormData {
  name: string;
  job_number: string;
  project_value: string;
  account_id?: number;
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
    project_value: '',
    account_id: undefined,
  });

  const { data: accountsData, isLoading: isLoadingAccounts } = useGetAccountsQuery();
  const accounts = accountsData || [];

  useEffect(() => {
    if (job && mode === 'edit') {
      setFormData({
        name: job.name || '',
        job_number: job.job_number || '',
        project_value: job.project_value || '',
        account_id: job.account_id || undefined,
      });
    }
  }, [job, mode]);

  const handleChange = (field: keyof JobFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAccountChange = (value: string) => {
    const accountId = value ? parseInt(value) : undefined;
    handleChange('account_id', accountId || '');
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
                <Label htmlFor="project_value">Project Value *</Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                  <Input
                    id="project_value"
                    value={formData.project_value}
                    onChange={(e) => handleChange('project_value', e.target.value)}
                    className="pl-8"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account">Account</Label>
                <Select 
                  value={formData.account_id?.toString() || 'none'} 
                  onValueChange={(value) => {
                    if (value === 'none') {
                      handleChange('account_id', '');
                    } else {
                      const accountId = parseInt(value);
                      handleChange('account_id', accountId || '');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingAccounts ? (
                      <SelectItem value="loading" disabled>Loading accounts...</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="none">None</SelectItem>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
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