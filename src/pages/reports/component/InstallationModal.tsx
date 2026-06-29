import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateInstallationTemplateReportMutation } from '@/store/api/report';
import { toast } from 'sonner';

// ─── Helper: format duration with days ────────────────────────────────────
const formatDuration = (seconds: number): string => {
    if (seconds < 0) seconds = 0;
    const days = Math.floor(seconds / 86400);
    const remainder = seconds % 86400;
    const hrs = Math.floor(remainder / 3600);
    const mins = Math.floor((remainder % 3600) / 60);
    const secs = remainder % 60;
    if (days > 0) {
        return `${days}d ${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// ─── Helper: parse duration string to seconds ────────────────────────────
const parseDurationToSeconds = (input: string): number | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    // Try to parse as number (seconds)
    if (/^\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10);
    }
    // Try format: [Xd ]HH:MM:SS
    const match = trimmed.match(/^(?:(\d+)d\s*)?(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
    if (match) {
        const days = parseInt(match[1] || '0', 10);
        const hours = parseInt(match[2], 10);
        const minutes = parseInt(match[3], 10);
        const seconds = parseInt(match[4], 10);
        return days * 86400 + hours * 3600 + minutes * 60 + seconds;
    }
    // Try format: HH:MM (no seconds)
    const match2 = trimmed.match(/^(?:(\d+)d\s*)?(\d{1,2}):(\d{1,2})$/);
    if (match2) {
        const days = parseInt(match2[1] || '0', 10);
        const hours = parseInt(match2[2], 10);
        const minutes = parseInt(match2[3], 10);
        return days * 86400 + hours * 3600 + minutes * 60;
    }
    return null; // invalid format
};

interface UpdateInstallationTemplateModalProps {
  open: boolean;
  onClose: () => void;
  rowData: {
    id?: string;                  // React Table key, e.g. "timer-19"
    timer_session_id?: number;
    job_id?: number;
    fab_id?: number;
    installer_id?: number;
    activity_type?: string;       // 'Template' or 'Installation'
    sqft_templated?: number;
    sqft_not_templated?: number;
    sqft_installed?: number;
    sqft_not_installed?: number;
    reason_if_not_complete?: string | null;
    total_work_seconds?: number;
  };
  onUpdateSuccess?: () => void;
}

export const UpdateInstallationTemplateModal: React.FC<UpdateInstallationTemplateModalProps> = ({
  open,
  onClose,
  rowData,
  onUpdateSuccess,
}) => {
  const [sqftTemplated, setSqftTemplated] = useState<string>('');
  const [sqftNotTemplated, setSqftNotTemplated] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [durationDisplay, setDurationDisplay] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [updateReport] = useUpdateInstallationTemplateReportMutation();

  const timerSessionId = rowData?.timer_session_id ?? rowData?.id?.replace('timer-', '');

  useEffect(() => {
    if (open && rowData) {
      setSqftTemplated(rowData.sqft_templated?.toString() ?? '');
      setSqftNotTemplated(rowData.sqft_not_templated?.toString() ?? '');
      setReason(rowData.reason_if_not_complete ?? '');
      if (rowData.total_work_seconds !== undefined && rowData.total_work_seconds !== null) {
        // Show formatted duration
        setDurationDisplay(formatDuration(rowData.total_work_seconds));
      } else {
        setDurationDisplay('');
      }
    }
  }, [open, rowData]);

  const handleSubmit = async () => {
    if (!timerSessionId) {
      toast.error('No timer session ID found');
      return;
    }

    // Map activity_type to backend expected value
    const typeMap: Record<string, string> = {
      'Template': 'Templater',    // Swagger expects "Templater" (capitalized) or "Installer"
      'Installation': 'Installer',
    };
    const activityType = rowData?.activity_type || '';
    const mappedType = typeMap[activityType] || '';
    if (!mappedType) {
      toast.error('Unknown activity type');
      return;
    }

    // Build payload
    const payload: any = {
      type: mappedType,
      job_id: rowData.job_id,
      installer_id: rowData.installer_id,
      timer_session_id: Number(timerSessionId),
    };

    if (sqftTemplated !== '') payload['sqft templated'] = parseFloat(sqftTemplated);
    if (sqftNotTemplated !== '') payload['sqft not templated'] = parseFloat(sqftNotTemplated);
    if (reason.trim()) payload.reason = reason.trim();

    // Parse duration from display string to seconds
    if (durationDisplay.trim()) {
      const seconds = parseDurationToSeconds(durationDisplay.trim());
      if (seconds !== null) {
        payload.duration = seconds;
      } else {
        toast.error('Invalid duration format. Use HH:MM:SS or Xd HH:MM:SS');
        return;
      }
    }

    // Check if any extra fields changed
    const changedFields = Object.keys(payload).filter(
      key => !['type', 'job_id', 'installer_id', 'timer_session_id'].includes(key)
    );
    if (changedFields.length === 0) {
      toast.error('Please change at least one field');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateReport(payload).unwrap();
      toast.success('Timer session updated successfully');
      onUpdateSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Update failed:', error);
      toast.error(error?.data?.message || 'Failed to update timer session');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Timer Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="sqftTemplated">SQFT Templated</Label>
            <Input
              id="sqftTemplated"
              type="number"
              min="0"
              step="0.01"
              value={sqftTemplated}
              onChange={(e) => setSqftTemplated(e.target.value)}
              placeholder="Square feet templated"
            />
          </div>
          <div>
            <Label htmlFor="sqftNotTemplated">SQFT Not Templated</Label>
            <Input
              id="sqftNotTemplated"
              type="number"
              min="0"
              step="0.01"
              value={sqftNotTemplated}
              onChange={(e) => setSqftNotTemplated(e.target.value)}
              placeholder="Square feet not templated"
            />
          </div>
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for incompletion"
            />
          </div>
          <div>
            <Label htmlFor="duration">Duration (HH:MM:SS or Xd HH:MM:SS)</Label>
            <Input
              id="duration"
              value={durationDisplay}
              onChange={(e) => setDurationDisplay(e.target.value)}
              placeholder="e.g., 02:30:00 or 5d 03:01:34"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};