import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface Role {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
  members: number;
  avatars: string[];
}

interface DeleteRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
}

const DeleteRoleModal = ({ open, onOpenChange, role }: DeleteRoleModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const handleDelete = () => {
    setIsDeleting(true);
    // Simulate API call
    setTimeout(() => {
      setIsDeleting(false);
      setIsDeleted(true);
      // Close modal after 2 seconds
      setTimeout(() => {
        onOpenChange(false);
        setIsDeleted(false);
      }, 2000);
    }, 1000);
  };

  if (!open || !role) return null;

  if (isDeleted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Role deleted successfully
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              The role '{role.name}' has been deleted successfully.
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
            <h2 className="text-lg font-semibold text-gray-900">Delete Role</h2>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Do you wish to continue? Deleting this role means that all users under this role would lose their admin permissions.
            </p>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{role.name}</p>
              <p className="text-xs text-gray-600">{role.description}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete role'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { DeleteRoleModal };