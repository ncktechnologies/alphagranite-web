import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onNewRole: () => void;
}

export const EmptyState = ({ onNewRole }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 ">
      <div className="mb-6">
        <img src="/images/app/employee-security.svg" alt="" />
      </div>
      
      <h3 className="text-lg font-bold text-black mb-2">
        You haven't created any role yet
      </h3>
      
      <p className="text-sm text-primary-text text-center mb-6 max-w-md">
        Create a new role by clicking on the "New role" button and start managing other users and assign permissions
        
      </p>
      
      <Button onClick={onNewRole} className="text-primary" variant="ghost">
        + New role
      </Button>
    </div>
  );
};
