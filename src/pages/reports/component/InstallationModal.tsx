import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    if (/^\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10);
    }
    const match = trimmed.match(/^(?:(\d+)d\s*)?(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
    if (match) {
        const days = parseInt(match[1] || '0', 10);
        const hours = parseInt(match[2], 10);
        const minutes = parseInt(match[3], 10);
        const seconds = parseInt(match[4], 10);
        return days * 86400 + hours * 3600 + minutes * 60 + seconds;
    }
    const match2 = trimmed.match(/^(?:(\d+)d\s*)?(\d{1,2}):(\d{1,2})$/);
    if (match2) {
        const days = parseInt(match2[1] || '0', 10);
        const hours = parseInt(match2[2], 10);
        const minutes = parseInt(match2[3], 10);
        return days * 86400 + hours * 3600 + minutes * 60;
    }
    return null;
};

interface UpdateInstallationTemplateModalProps {
  open: boolean;
  onClose: () => void;
  rowData: {
    id?: string;
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
    note: string | null;
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
  const [sqftInstalled, setSqftInstalled] = useState<string>('');
  const [sqftNotInstalled, setSqftNotInstalled] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [durationDays, setDurationDays] = useState<number>(0);
  const [durationHours, setDurationHours] = useState<number>(0);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [updateReport] = useUpdateInstallationTemplateReportMutation();

  const timerSessionId = rowData?.timer_session_id ?? rowData?.id?.replace('timer-', '');

  const isTemplate = rowData?.activity_type === 'Template';
  const isInstallation = rowData?.activity_type === 'Installation';

  useEffect(() => {
    if (open && rowData) {
      setSqftTemplated(rowData.sqft_templated?.toString() ?? '');
      setSqftNotTemplated(rowData.sqft_not_templated?.toString() ?? '');
      setSqftInstalled(rowData.sqft_installed?.toString() ?? '');
      setSqftNotInstalled(rowData.sqft_not_installed?.toString() ?? '');
      setReason(rowData.note ?? '');
      if (rowData.total_work_seconds !== undefined && rowData.total_work_seconds !== null) {
        const seconds = rowData.total_work_seconds;
        const days = Math.floor(seconds / 86400);
        const remainder = seconds % 86400;
        const hours = Math.floor(remainder / 3600);
        const minutes = Math.floor((remainder % 3600) / 60);
        const secs = remainder % 60;
        setDurationDays(days);
        setDurationHours(hours);
        setDurationMinutes(minutes);
        setDurationSeconds(secs);
      } else {
        setDurationDays(0);
        setDurationHours(0);
        setDurationMinutes(0);
        setDurationSeconds(0);
      }
    }
  }, [open, rowData]);

  const handleSubmit = async () => {
    if (!timerSessionId) {
      toast.error('No timer session ID found');
      return;
    }

    const typeMap: Record<string, string> = {
      'Template': 'Templater',
      'Installation': 'Installer',
    };
    const mappedType = typeMap[rowData?.activity_type || ''] || '';
    if (!mappedType) {
      toast.error('Unknown activity type');
      return;
    }

    const payload: any = {
      type: mappedType,
      job_id: rowData.job_id,
      installer_id: rowData.installer_id,
      timer_session_id: Number(timerSessionId),
    };

    if (isTemplate) {
      if (sqftTemplated !== '') payload['sqft templated'] = parseFloat(sqftTemplated);
      if (sqftNotTemplated !== '') payload['sqft not templated'] = parseFloat(sqftNotTemplated);
    } else if (isInstallation) {
      if (sqftInstalled !== '') payload['sqft installed'] = parseFloat(sqftInstalled);
      if (sqftNotInstalled !== '') payload['sqft not installed'] = parseFloat(sqftNotInstalled);
    }

    if (reason.trim()) payload.note = reason.trim();

    // ✅ Send as "total work seconds" (with spaces) per Swagger
    const totalSeconds = durationDays * 86400 + durationHours * 3600 + durationMinutes * 60 + durationSeconds;
    if (totalSeconds > 0) {
      payload['total work seconds'] = totalSeconds;
    }

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
          {isTemplate && (
            <>
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
            </>
          )}

          {isInstallation && (
            <>
              <div>
                <Label htmlFor="sqftInstalled">SQFT Installed</Label>
                <Input
                  id="sqftInstalled"
                  type="number"
                  min="0"
                  step="0.01"
                  value={sqftInstalled}
                  onChange={(e) => setSqftInstalled(e.target.value)}
                  placeholder="Square feet installed"
                />
              </div>
              <div>
                <Label htmlFor="sqftNotInstalled">SQFT Not Installed</Label>
                <Input
                  id="sqftNotInstalled"
                  type="number"
                  min="0"
                  step="0.01"
                  value={sqftNotInstalled}
                  onChange={(e) => setSqftNotInstalled(e.target.value)}
                  placeholder="Square feet not installed"
                />
              </div>
            </>
          )}

          {/* <div>
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for incompletion"
            />
          </div> */}

          <div>
            <Label>Duration</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Days</label>
                <Select value={durationDays.toString()} onValueChange={(val) => setDurationDays(parseInt(val) || 0)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Hours</label>
                <Select value={durationHours.toString()} onValueChange={(val) => setDurationHours(parseInt(val) || 0)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, '0')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Mins</label>
                <Select value={durationMinutes.toString()} onValueChange={(val) => setDurationMinutes(parseInt(val) || 0)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 60 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, '0')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Secs</label>
                <Select value={durationSeconds.toString()} onValueChange={(val) => setDurationSeconds(parseInt(val) || 0)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 60 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, '0')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
