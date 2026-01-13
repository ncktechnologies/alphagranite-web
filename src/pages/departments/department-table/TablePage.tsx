import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { DepartmentTable } from './DepartmentTable';
import { useParams } from 'react-router';
import { useGetDepartmentByIdQuery } from '@/store/api';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/common/BackButton';

export function DepartmentDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const { data: department, isLoading, error } = useGetDepartmentByIdQuery(Number(id), {
        skip: !id,
    });

    if (isLoading) {
        return (
            <div className="">
                <Container>
                    <Toolbar className="">
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-64" />
                            <Skeleton className="h-4 w-96" />
                        </div>
                    </Toolbar>
                    <div className="space-y-4 mt-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                </Container>
            </div>
        );
    }

    if (error || !department) {
        return (
            <div className="">
                <Container>
                    <div className="text-center py-10">
                        <p className="text-red-500">Failed to load department details</p>
                    </div>
                </Container>
            </div>
        );
    }

    return (
        <div className="">
            <Container>
                <Toolbar className="">
                    <ToolbarHeading 
                        title={department.name} 
                        description={department.description || 'No description available'} 
                    />
                    <ToolbarActions>
                        <BackButton fallbackUrl="/departments" />
                    </ToolbarActions>
                </Toolbar>
                <DepartmentTable employees={department.users || []} />
            </Container>
        </div>
    );
}
