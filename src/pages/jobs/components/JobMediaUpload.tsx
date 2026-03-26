import React from 'react';
import { UniversalUpload } from '@/components/universal-upload';
import { useUploadJobMediaMutation } from '@/store/api/job';

interface JobMediaUploadProps {
  jobId: number;
  onUploadComplete?: () => void;
  onClose?: () => void;
}

/**
 * Job Media Upload Component
 * Uses UniversalUpload internally for consistent behavior across the app
 */
export function JobMediaUpload({ jobId, onUploadComplete, onClose }: JobMediaUploadProps) {
  const [uploadMedia] = useUploadJobMediaMutation();

  const stages = [
    { value: 'templating' },
    { value: 'drafting' },
    { value: 'programming' },
    { value: 'final_programming' },
    { value: 'sales_ct' },
    { value: 'revision' },
  ];

  const fileTypes = [
    { value: 'block_drawing' },
    { value: 'layout' },
    { value: 'ss_layout' },
    { value: 'shop_drawing' },
    { value: 'photo_media' },
  ];

  return (
    <UniversalUpload
      jobId={jobId}
      uploadMutation={uploadMedia}
      stages={stages}
      fileTypes={fileTypes}
      onUploadComplete={onUploadComplete}
      onClose={onClose}
    />
  );
}
