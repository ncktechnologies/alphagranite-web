import React from 'react';
import { UniversalUpload } from '@/components/universal-upload';
import { useUploadOperatorQaMutation } from '@/store/api/operator';
import { useSelector } from 'react-redux';

interface OperatorMediaUploadProps {
  /** fab_id — used as the job identifier in the upload URL: /api/v1/operators/{operator_id}/jobs/{fab_id}/upload */
  jobId: number;
  onUploadComplete?: () => void;
  onClose?: () => void;
}

/**
 * Operator Media Upload Component
 * Uses UniversalUpload internally for consistent behavior across the app.
 * NOTE: jobId prop receives fab_id — the upload API uses fab_id as the job identifier.
 */
export function OperatorMediaUpload({ jobId, onUploadComplete, onClose }: OperatorMediaUploadProps) {
  const [uploadQa] = useUploadOperatorQaMutation();

  // Get current operator ID from store
  const currentUser = useSelector((s: any) => s.user.user);
  const operatorId = currentUser?.employee_id || currentUser?.id;

  const stages = [
    { value: 'cutting' },
    { value: 'Edging' },
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
      jobId={jobId}            // fab_id passed through as jobId
      entityId={operatorId}
      uploadMutation={uploadQa}
      stages={stages}
      fileTypes={fileTypes}
      defaultStage="qa"
      defaultFileType="media"
      showFileTypeSelect={false}
      showStageSelect={false}
      additionalParams={{
        operator_id: operatorId,
      }}
      onUploadComplete={onUploadComplete}
      onClose={onClose}
    />
  );
}