// components/Details.tsx
import { Job } from '@/store/api/job';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Pencil } from 'lucide-react';
import { useGetAccountByIdQuery } from '@/store/api/job';
import { Can } from '@/components/permission';

interface JobDetailsViewProps {
  job: Job;
  onEdit: (job: Job) => void;
}

export const JobDetailsView = ({ job, onEdit }: JobDetailsViewProps) => {
  const { data: accountData, isLoading: isAccountLoading } = useGetAccountByIdQuery(
    job.account_id || 0,
    { skip: !job.account_id }
  );
  
  const account = accountData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{job.name}</h1>
          <p className="text-gray-500">Job Number: {job.job_number}</p>
        </div>
        <Can action="update" on="jobs">
          <Button variant="outline" size="sm" onClick={() => onEdit(job)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Can>
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
            {job.account_id && (
              <div>
                <label className="text-sm font-medium text-gray-500">Account</label>
                {isAccountLoading ? (
                  <p>Loading...</p>
                ) : account ? (
                  <p>{account.name}</p>
                ) : (
                  <p>Account not found</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};