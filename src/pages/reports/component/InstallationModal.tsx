import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUpdateInstallationTemplateReportMutation } from '@/store/api/report';
import { toast } from 'sonner';

interface UpdateInstallationTemplateModalProps {
  open: boolean;
  onClose: () => void;
  rowData: {
    fab_id: number;
    job_id?: number;
    installer_id?: number;
    activity_type?: string; // 'Template' or 'Installation'
    activity_complete?: boolean;
    sqft_templated?: number;
    sqft_not_templated?: number;
    reason_if_not_complete?: string | null;
    duration?: string; // e.g., "2:30" or "150"
  };
  onUpdateSuccess?: () => void;
}

export const UpdateInstallationTemplateModal: React.FC<UpdateInstallationTemplateModalProps> = ({
  open,
  onClose,
  rowData,
  onUpdateSuccess,
}) => {
  const [activityComplete, setActivityComplete] = useState<boolean>(false);
  const [sqftTemplated, setSqftTemplated] = useState<string>('');
  const [sqftNotTemplated, setSqftNotTemplated] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [updateReport] = useUpdateInstallationTemplateReportMutation();

  useEffect(() => {
    if (open && rowData) {
      setActivityComplete(rowData.activity_complete ?? false);
      setSqftTemplated(rowData.sqft_templated?.toString() ?? '');
      setSqftNotTemplated(rowData.sqft_not_templated?.toString() ?? '');
      setReason(rowData.reason_if_not_complete ?? '');
      setDuration(rowData.duration ?? '');
    }
  }, [open, rowData]);

  // ─── Helper to convert duration string to minutes (integer) ─────────────
  const parseDurationToMinutes = (dur: string): number => {
    if (!dur) return 0;
    const trimmed = dur.trim();
    // If it's already a number, parse as minutes
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    // Try to parse "HH:MM" or "MM:SS" – we assume "MM:SS" or "H:MM"
    const parts = trimmed.split(':');
    if (parts.length === 2) {
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      // If the first part is > 23, treat as minutes:seconds? Better to treat as hours:minutes.
      // But we don't know; we'll assume the format is "minutes:seconds" if first part <= 59.
      if (hours <= 59) {
        // Treat as minutes:seconds → total minutes = hours + minutes/60? Not integer.
        // Simpler: treat as "hours:minutes" (like "2:30" → 2h30m = 150 min)
        return hours * 60 + minutes;
      }
      // If first part > 59, treat as minutes:seconds (unlikely)
      return hours + Math.round(minutes / 60);
    }
    // If single number, assume minutes
    return parseInt(trimmed, 10) || 0;
  };

  const handleSubmit = async () => {
    // Build payload
   const payload: any = {
    type: rowData?.activity_type?.toLowerCase() === 'installation' ? 'installation' : 'template',
    fab_id: rowData.fab_id,
    job_id: rowData.job_id,
    installer_id: rowData.installer_id,
  };

    if (sqftTemplated !== '') payload.sqft_templated = parseFloat(sqftTemplated);
    if (sqftNotTemplated !== '') payload.sqft_not_templated = parseFloat(sqftNotTemplated);
    if (reason.trim()) payload.reason = reason.trim();
    if (duration.trim()) {
      payload.duration = parseDurationToMinutes(duration.trim());
    }
    payload.activity_complete = activityComplete;

    if (Object.keys(payload).length === 4) {
      toast.error('Please change at least one field');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateReport(payload).unwrap();
      toast.success('Record updated successfully');
      onUpdateSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Update failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update {rowData?.activity_type || ''} Record</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="activityComplete">Activity Complete</Label>
            <Switch
              id="activityComplete"
              checked={activityComplete}
              onCheckedChange={setActivityComplete}
            />
          </div>
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
            <Label htmlFor="duration">Duration </Label>
            <Input
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g., 150 or 2:30"
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