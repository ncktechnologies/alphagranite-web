// components/List.tsx
import { Job } from '@/store/api/job';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';

interface JobsListProps {
    jobs: Job[];
    selectedJobId: number | null;
    onJobSelect: (job: Job) => void;
    onNewJob: () => void;
    isLoading: boolean;
}

export const JobsList = ({
    jobs,
    selectedJobId,
    onJobSelect,
    onNewJob,
    isLoading
}: JobsListProps) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredJobs = useMemo(() => {
        if (!searchQuery) return jobs;
        const query = searchQuery.toLowerCase();
        return jobs.filter(job =>
            job.name.toLowerCase().includes(query) ||
            job.job_number.toLowerCase().includes(query)
        );
    }, [jobs, searchQuery]);

    return (
        <div className="w-1/3 min-w-[300px] border-r pr-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Jobs</h2>
                <Button onClick={onNewJob} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Job
                </Button>
            </div>

            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="p-3 border rounded-lg animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    ))
                ) : filteredJobs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        {searchQuery ? 'No jobs found' : 'No jobs available'}
                    </div>
                ) : (
                    filteredJobs.map((job) => (
                        <div
                            key={job.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedJobId === job.id
                                    ? 'ring-1 ring-[#8BAD2B] bg-[#F0FDF4]' : ''
                                }`}
                            onClick={() => onJobSelect(job)}
                        >
                            <div className="font-medium">{job.name}</div>
                            <div className="text-sm text-gray-500 flex justify-between">
                                <span>{job.job_number}</span>
                                {job.created_at && (
                                    <span>{format(new Date(job.created_at), 'MMM dd, yyyy')}</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};