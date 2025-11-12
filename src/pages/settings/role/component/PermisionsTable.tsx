
// components/PermissionsTable.tsx
import { Checkbox } from '@/components/ui/checkbox';
import { Permissions } from '@/config/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { useGetAllActionMenusQuery } from '@/store/api/actionMenu';
import { Skeleton } from '@/components/ui/skeleton';

interface PermissionsTableProps {
  permissions: Permissions;
  onPermissionChange: (module: string, action: string, checked: boolean) => void;
}

export const PermissionsTable = ({
  permissions,
  onPermissionChange,
}: PermissionsTableProps) => {
  // Fetch action menus from API
  const { data: actionMenus, isLoading } = useGetAllActionMenusQuery();

  if (isLoading) {
    return (
      <Card className=" border-l-0">
        <CardContent className="p-6">
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className=" border-l-0">
      <CardContent className="kt-scrollable-x-auto p-0 w-full">
        <Table >
          <TableHeader>
            <TableRow className="bg-accent/60">
              <TableHead className="text-start text-secondary-foreground font-normal min-w-[300px] h-10">
                Module
              </TableHead>
              <TableHead className="min-w-24 text-secondary-foreground font-normal text-center h-10">
                Create
              </TableHead>
              <TableHead className="min-w-24 text-secondary-foreground font-normal text-center h-10">
                Read
              </TableHead>
              <TableHead className="min-w-24 text-secondary-foreground font-normal text-center h-10">
                Update
              </TableHead>
              <TableHead className="min-w-24 text-secondary-foreground font-normal text-center h-10">
                Delete
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actionMenus?.map((actionMenu) => (
              <TableRow key={actionMenu.code} className="">
                <TableCell className="py-2.5!">{actionMenu.name}</TableCell>
                {(['create', 'read', 'update', 'delete'] as const).map((action) => (
                  <TableCell key={action} className="py-2.5! text-center ">
                    <Checkbox
                      checked={permissions[actionMenu.code]?.[action] || false}
                      onCheckedChange={(checked) =>
                        onPermissionChange(actionMenu.code, action, checked as boolean)
                      }
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};