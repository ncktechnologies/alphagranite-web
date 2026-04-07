import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UniversalUpload, UniversalUploadProps } from './UniversalUpload';
import { FileList } from '@/components/file-list';

interface UniversalUploadModalProps extends Omit<UniversalUploadProps, 'onClose'> {
  trigger?: React.ReactNode;
  title?: string;
  showExistingFiles?: boolean;
  existingFiles?: any[];
  onDeleteFile?: (fileId: string | number) => Promise<void>;
  onViewFile?: (file: any) => void;
  // Controlled mode props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}

/**
 * Universal Upload Modal Component
 * Opens UniversalUpload in a dialog with a "+" trigger button
 * Supports both controlled (external) and uncontrolled (internal) modes
 */
export function UniversalUploadModal({
  trigger,
  title = 'Upload Files',
  showExistingFiles = false,
  existingFiles = [],
  onDeleteFile,
  onViewFile,
  onUploadComplete,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  disabled = false,
  ...uploadProps
}: UniversalUploadModalProps) {
  // Internal state for uncontrolled mode
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;

  const handleUploadComplete = () => {
    setIsOpen(false);
    onUploadComplete?.();
  };

  // Prevent opening if disabled
  const handleOpenChange = (open: boolean) => {
    if (disabled && open) {
      return; // Don't allow opening when disabled
    }
    setIsOpen(open);
  };

  return (
    <div className="space-y-4">
      {/* Trigger Button - only render in uncontrolled mode (no open prop provided) */}
      {controlledOpen === undefined && (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            {trigger || (
              <Button
                variant="dashed"
                className="flex items-center gap-2 h-12 w-full"
                disabled={disabled}
              >
                <Plus className="w-4 h-4" />
                Add files
              </Button>
            )}
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[15px] font-semibold py-2 border-b">
                {title}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              <UniversalUpload
                {...uploadProps}
                onClose={() => handleOpenChange(false)}
                onUploadComplete={handleUploadComplete}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Render dialog directly for controlled mode (when open prop is provided) */}
      {controlledOpen !== undefined && (
        <Dialog open={controlledOpen && !disabled} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[15px] font-semibold py-2 border-b">
                {title}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              <UniversalUpload
                {...uploadProps}
                onClose={() => handleOpenChange(false)}
                onUploadComplete={handleUploadComplete}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Show Existing Files if provided */}
      {showExistingFiles && existingFiles && existingFiles.length > 0 && (
        <div className="mt-4">
          <FileList
            files={existingFiles}
            onViewFile={onViewFile}
            onDeleteFile={onDeleteFile}
          />
        </div>
      )}
    </div>
  );
}
