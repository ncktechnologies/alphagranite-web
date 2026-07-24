import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ImageInput, ImageInputFile } from '@/components/image-input';

// AvatarInput.tsx
interface AvatarInputProps {
  onFileChange?: (file: File | null) => void;
  defaultImageUrl?: string; // new prop
  disabled?: boolean; // optional for view mode
}

export function AvatarInput({ 
  onFileChange, 
  defaultImageUrl,
  disabled = false 
}: AvatarInputProps = {}) {
  // Initialize with defaultImageUrl if provided, otherwise fallback
  const [avatar, setAvatar] = useState<ImageInputFile[]>(() => {
    if (defaultImageUrl) {
      return [{ dataURL: defaultImageUrl }];
    }
    return [{ dataURL: toAbsoluteUrl('/images/app/user-line.svg') }];
  });

  // Update internal state when defaultImageUrl changes (e.g., when editing different employee)
  useEffect(() => {
    if (defaultImageUrl) {
      setAvatar([{ dataURL: defaultImageUrl }]);
    } else {
      setAvatar([{ dataURL: toAbsoluteUrl('/images/app/user-line.svg') }]);
    }
  }, [defaultImageUrl]);

  return (
    <ImageInput
      value={avatar}
      onChange={(selectedAvatar) => {
        setAvatar(selectedAvatar);
        // Notify parent about file change
        if (onFileChange) {
          const file = selectedAvatar.length > 0 ? selectedAvatar[0].file : null;
          onFileChange(file);
        }
      }}
    >
      {({ onImageUpload }) => (
        <div
          className="size-32 relative cursor-pointer"
          onClick={disabled ? undefined : onImageUpload}
          style={{ cursor: disabled ? 'default' : 'pointer' }}
        >
          <div className="rounded-full overflow-hidden h-full w-full bg-[#F7F7F7] bg-cover bg-center flex items-center justify-center">
            {avatar.length > 0 && <img src={avatar[0].dataURL} alt="avatar"  className='size-full'/>}
            {!disabled && (
              <div className="flex items-center justify-center cursor-pointer rounded-full right-0 bottom-0 bg-primary p-2 absolute">
                <img src="/images/app/camera-line.svg" alt="" />
              </div>
            )}
          </div>
        </div>
      )}
    </ImageInput>
  );
}