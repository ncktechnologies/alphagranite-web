// components/Details.tsx
import { Job } from '@/store/api/job';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Pencil } from 'lucide-react';

interface JobDetailsViewProps {
  job: Job;
  onEdit: (job: Job) => void;
}

export const JobDetailsView = ({ job, onEdit }: JobDetailsViewProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{job.name}</h1>
          <p className="text-gray-500">Job Number: {job.job_number}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onEdit(job)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Project Value</label>
              <p>{job.project_value ? `$${job.project_value}` : 'Not set'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};