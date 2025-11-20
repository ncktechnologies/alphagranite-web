import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useGetAllActionMenusQuery, useCreateActionMenuMutation, useUpdateActionMenuMutation, useDeleteActionMenuMutation } from '@/store/api/actionMenu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ActionMenuForm {
  name: string;
  code: string;
}

export function PermissionsManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<{ id: number; name: string; code: string } | null>(null);
  const [formData, setFormData] = useState<ActionMenuForm>({ name: '', code: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { data: actionMenus, isLoading, isError, refetch } = useGetAllActionMenusQuery();
  const [createActionMenu, { isLoading: isCreating }] = useCreateActionMenuMutation();
  const [updateActionMenu, { isLoading: isUpdating }] = useUpdateActionMenuMutation();
  const [deleteActionMenu, { isLoading: isDeleting }] = useDeleteActionMenuMutation();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isDialogOpen) {
      setEditingMenu(null);
      setFormData({ name: '', code: '' });
      setErrors({});
    }
  }, [isDialogOpen]);

  // Populate form when editing
  useEffect(() => {
    if (editingMenu) {
      setFormData({
        name: editingMenu.name,
        code: editingMenu.code
      });
    }
  }, [editingMenu]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    } else if (!/^[a-z0-9_]+$/.test(formData.code)) {
      newErrors.code = 'Code must contain only lowercase letters, numbers, and underscores';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      if (editingMenu) {
        // Update existing action menu
        await updateActionMenu({
          id: editingMenu.id,
          data: formData
        }).unwrap();
        toast.success('Permission updated successfully');
      } else {
        // Create new action menu
        await createActionMenu(formData).unwrap();
        toast.success('Permission created successfully');
      }
      
      setIsDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to save permission');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this permission? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteActionMenu(id).unwrap();
      toast.success('Permission deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete permission');
    }
  };

  const handleEdit = (menu: { id: number; name: string; code: string }) => {
    setEditingMenu(menu);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Permissions Management</h2>
          <p className="text-sm text-gray-500">Manage system permissions and access controls</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Permission
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingMenu ? 'Edit Permission' : 'Create New Permission'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Permission Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Jobs, Employees"
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="code">Permission Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  placeholder="e.g., jobs, employees"
                />
                {errors.code && <p className="text-sm text-red-500">{errors.code}</p>}
                <p className="text-xs text-gray-500">
                  Must contain only lowercase letters, numbers, and underscores
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || isUpdating}
                >
                  {editingMenu ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load permissions. Please try again.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>System Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Permission Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionMenus && actionMenus.length > 0 ? (
                  actionMenus.map((menu) => (
                    <TableRow key={menu.id}>
                      <TableCell className="font-medium">{menu.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          {menu.code}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit({ id: menu.id, name: menu.name, code: menu.code })}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(menu.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      No permissions found. Create your first permission to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}