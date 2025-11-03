import { Ellipsis } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { toAbsoluteUrl } from "@/lib/helpers";
import { AvatarGroup } from "@/partials/common/avatar-group";
import { DropdownMenu5 } from "./components/dropdown-menu-5";
import { useGetDepartmentsQuery } from "@/store/api";
import { Skeleton } from "@/components/ui/skeleton";
import type { Department as ApiDepartment, UserSample } from "@/store/api/department";

export interface Member {
    filename?: string;
    variant?: string;
    fallback?: string;
}

const DepartmentCard = () => {
    const navigate = useNavigate();
    const { data, isLoading, error } = useGetDepartmentsQuery({ page: 1, size: 100 });

    const handleView = (department: ApiDepartment) => {
        navigate(`/departments/${department.id}`, { state: { department } });
    };

    // Convert API user samples to avatar group format
    const convertUsersToMembers = (users?: UserSample[]): Member[] => {
        if (!users || users.length === 0) return [];
        
        return users.slice(0, 4).map(user => ({
            filename: user.profile_image_id || '',
            variant: 'size-8'
        }));
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-1 p-4">
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-9 w-9 rounded-full" />
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        </div>
                        <div className="p-4">
                            <Skeleton className="h-8 w-full" />
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-10">
                <p className="text-red-500">Failed to load departments</p>
            </div>
        );
    }

    const departments = data?.items || [];
    console.log(departments)
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {departments.map((dept) => {
                const members = convertUsersToMembers(dept.sample_members);
                const remainingCount = (dept.total_members || 0) - members.length;
                
                return (
                    <Card key={dept.id} className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-1 p-4">
                            <div className="space-y-2">
                                <img
                                    src={toAbsoluteUrl('/images/icons/department.svg')}
                                    className="bg-[#E6E9E7] rounded-full p-2 size-[36px] mb-3"
                                    alt="department"
                                />
                                <div className="flex flex-col">
                                    <Link
                                        to={`/departments/${dept.id}`}
                                        className="text-base font-medium text-text hover:text-primary-active mb-px"
                                        state={{ department: dept }}
                                    >
                                        {dept.name}
                                    </Link>
                                </div>
                                <p className="text-xs text-text-foreground flex-grow">
                                    {dept.description || 'No description available'}
                                </p>
                            </div>

                            <DropdownMenu5
                                trigger={
                                    <Button variant="ghost" mode="icon">
                                        <Ellipsis />
                                    </Button>
                                }
                                onView={() => handleView(dept)}
                                department={dept}
                            />
                        </div>
                        <CardFooter className="p-4 flex-col items-start space-y-2">
                            <span className="text-xs text-secondary-foreground uppercase">
                                member(s) {dept.total_members ? `(${dept.total_members})` : ''}
                            </span>
                            {members.length > 0 ? (
                                <AvatarGroup group={members} />
                            ) : (
                                <p className="text-xs text-muted-foreground">No members</p>
                            )}
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
    );
};

export { DepartmentCard };
