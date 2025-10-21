// // components/PermissionsTable.tsx
// import { Checkbox } from '@/components/ui/checkbox';
// import { modules } from '@/config/menu.config';
// import { Permissions } from '@/config/types';

// interface PermissionsTableProps {
//   permissions: Permissions;
//   onPermissionChange: (module: string, action: string, checked: boolean) => void;
// }

// export const PermissionsTable = ({
//   permissions,
//   onPermissionChange,
// }: PermissionsTableProps) => {
//   return (
//     <div className="space-y-4">
//       <h3 className="font-semibold text-gray-900">Permissions</h3>
//       <div className="overflow-x-auto">
//         <table className="w-full border-collapse">
//           <thead>
//             <tr className="border-b">
//               <th className="text-left py-2 font-medium text-gray-700">Module</th>
//               <th className="text-center py-2 font-medium text-gray-700">Create</th>
//               <th className="text-center py-2 font-medium text-gray-700">Read</th>
//               <th className="text-center py-2 font-medium text-gray-700">Update</th>
//               <th className="text-center py-2 font-medium text-gray-700">Delete</th>
//             </tr>
//           </thead>
//           <tbody>
//             {modules.map((module) => (
//               <tr key={module.key} className="border-b">
//                 <td className="py-2 font-medium text-gray-900">{module.label}</td>
//                 {(['create', 'read', 'update', 'delete'] as const).map((action) => (
//                   <td key={action} className="py-2 text-center">
//                     <Checkbox
//                       checked={permissions[module.key]?.[action] || false}
//                       onCheckedChange={(checked) =>
//                         onPermissionChange(module.key, action, checked as boolean)
//                       }
//                     />
//                   </td>
//                 ))}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// components/PermissionsTable.tsx
import { Checkbox } from '@/components/ui/checkbox';
import { modules } from '@/config/menu.config';
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

interface PermissionsTableProps {
  permissions: Permissions;
  onPermissionChange: (module: string, action: string, checked: boolean) => void;
}

export const PermissionsTable = ({
  permissions,
  onPermissionChange,
}: PermissionsTableProps) => {


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
            {modules.map((module) => (
              <TableRow key={module.key} className="">
                <TableCell className="py-2.5!">{module.label}</TableCell>
                {(['create', 'read', 'update', 'delete'] as const).map((action) => (
                  <TableCell key={action} className="py-2.5! text-center ">
                    <Checkbox
                      checked={permissions[module.key]?.[action] || false}
                      onCheckedChange={(checked) =>
                        onPermissionChange(module.key, action, checked as boolean)
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