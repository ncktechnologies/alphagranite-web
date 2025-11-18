// components/Details.tsx
import { Job } from '@/store/api/job';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface JobDetailsViewProps {
  job: Job;
  onEdit: (job: Job) => void;
  onDelete: () => void;
}

export const JobDetailsView = ({ job, onEdit, onDelete }: JobDetailsViewProps) => {
//   const handleDelete = () => {
//     if (window.confirm(`Are you sure you want to delete job "${job.name}"?`)) {
//       onDelete();
//     }
//   };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{job.name}</h1>
          <p className="text-gray-500">Job Number: {job.job_number}</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(job)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {/* <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button> */}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <Badge variant={job.status_id === 1 ? 'success' : 'secondary'}>
                {job.status_id === 1 ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Account ID</label>
              <p>{job.account_id}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Priority</label>
              <p>{job.priority || 'Not set'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p>{job.created_at ? format(new Date(job.created_at), 'MMM dd, yyyy HH:mm') : 'N/A'}</p>
            </div>
            
            {job.start_date && (
              <div>
                <label className="text-sm font-medium text-gray-500">Start Date</label>
                <p>{format(new Date(job.start_date), 'MMM dd, yyyy')}</p>
              </div>
            )}
            
            {job.due_date && (
              <div>
                <label className="text-sm font-medium text-gray-500">Due Date</label>
                <p>{format(new Date(job.due_date), 'MMM dd, yyyy')}</p>
              </div>
            )}
          </div>
          
          {job.description && (
            <>
              <Separator />
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="mt-1">{job.description}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};