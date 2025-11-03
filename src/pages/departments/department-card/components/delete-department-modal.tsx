import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useDeleteDepartmentMutation } from '@/store/api';
import { toast } from 'sonner';
import type { Department } from '@/store/api/department';

interface DeleteDepartmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: Department | null;
}

const DeleteDepartmentModal = ({ open, onOpenChange, department }: DeleteDepartmentModalProps) => {
  const [isDeleted, setIsDeleted] = useState(false);
  const [deleteDepartment, { isLoading: isDeleting }] = useDeleteDepartmentMutation();

  const handleDelete = async () => {
    if (!department) return;

    try {
      await deleteDepartment(department.id).unwrap();
      setIsDeleted(true);
      toast.success('Department deleted successfully');
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onOpenChange(false);
        setIsDeleted(false);
      }, 2000);
    } catch (error: any) {
      const errorMessage = error?.data?.detail || error?.data?.message || 'Failed to delete department';
      toast.error(errorMessage);
    }
  };

  if (!open || !department) return null;

  if (isDeleted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Department deleted successfully
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              The department '{department.name}' has been deleted successfully.
            </p>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </CardContent>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Delete Department</h2>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Do you wish to continue? Deleting this department means that all users under this department will be unassigned.
            </p>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{department.name}</p>
              <p className="text-xs text-gray-600">{department.description || 'No description'}</p>
              {department.total_members !== undefined && (
                <p className="text-xs text-gray-500 mt-1">Members: {department.total_members}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete department'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { DeleteDepartmentModal };
