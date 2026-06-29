import { useState, useEffect } from 'react';
import { useGetSlaSettingsQuery, useUpdateSlaRuleMutation, SlaRule } from '@/store/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { LoaderCircle } from 'lucide-react';
import { BackButton } from '@/components/common/BackButton';
import { useIsSuperAdmin, usePermission } from '@/hooks/use-permission';

// Extend the rule type to allow null for numeric fields (to represent empty input)
type EditableRule = Omit<SlaRule, 'target_days' | 'at_risk_days'> & {
  target_days: number | null;
  at_risk_days: number | null;
};

export function SlaSettings() {
  const permissions = usePermission('SLA Settings');
  const isSuperAdmin = useIsSuperAdmin();
  const canEdit = isSuperAdmin || permissions.can_create;

  const { data: rules = [], isLoading, refetch } = useGetSlaSettingsQuery();
  const [updateRule] = useUpdateSlaRuleMutation();

  const [editableRules, setEditableRules] = useState<EditableRule[]>([]);
  const [modifiedIds, setModifiedIds] = useState<Set<number>>(new Set());
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    if (rules.length) {
      setEditableRules(
        rules.map((r) => ({
          ...r,
          target_days: r.target_days ?? null,   // can be null for empty
          at_risk_days: r.at_risk_days ?? null,
        }))
      );
      setModifiedIds(new Set());
    }
  }, [rules]);

  const handleFieldChange = (
    id: number,
    field: 'target_days' | 'at_risk_days' | 'is_applicable',
    value: any
  ) => {
    if (!canEdit) return;

    setEditableRules((prev) =>
      prev.map((rule) => {
        if (rule.id !== id) return rule;

        let newValue = value;
        if (field === 'target_days' || field === 'at_risk_days') {
          // If the input is empty, store null; otherwise parse as number
          newValue = value === '' ? null : parseFloat(value);
          if (isNaN(newValue as number)) newValue = null;
        }
        return { ...rule, [field]: newValue };
      })
    );
    setModifiedIds((prev) => new Set(prev).add(id));
  };

  const handleSaveRule = async (id: number) => {
    if (!canEdit || savingId !== null) return;
    const rule = editableRules.find((r) => r.id === id);
    if (!rule) return;

    setSavingId(id);
    try {
      await updateRule({
        id,
        data: {
          // Convert null to 0 before sending
          target_days: rule.target_days ?? 0,
          at_risk_days: rule.at_risk_days ?? 0,
          is_applicable: rule.is_applicable,
        },
      }).unwrap();

      toast.success(`Service level setting updated No ${id} successfully`);
      setModifiedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      refetch();
    } catch (error: any) {
      // toast.error(error?.data?.message || 'Failed to update rule');
    } finally {
      setSavingId(null);
    }
  };

  const handleReset = () => {
    setEditableRules(
      rules.map((r) => ({
        ...r,
        target_days: r.target_days ?? null,
        at_risk_days: r.at_risk_days ?? null,
      }))
    );
    setModifiedIds(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-[#4b545d]">SLA Settings</h1>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={modifiedIds.size === 0}
            >
              Discard Changes
            </Button>
          )}
          <BackButton />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Adjust target days, at‑risk window, and applicability for each fab type and stage.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">SLA Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-[#7c8689]">Fab Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-[#7c8689]">Stage</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-[#7c8689]">Target Days</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-[#7c8689]">At‑Risk Days</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-[#7c8689]">Applicable</th>
                  {canEdit && <th className="px-4 py-2 text-left text-xs font-semibold text-[#7c8689]">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {editableRules.map((rule) => {
                  const isModified = modifiedIds.has(rule.id);
                  const isSaving = savingId === rule.id;
                  return (
                    <tr key={rule.id} className={`border-b hover:bg-gray-50/50 ${isModified ? 'bg-yellow-50' : ''}`}>
                      <td className="px-4 py-2 text-sm uppercase">{rule.fab_type}</td>
                      <td className="px-4 py-2 text-sm">{rule.stage_name}</td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          value={rule.target_days ?? ''}
                          onChange={(e) =>
                            handleFieldChange(rule.id, 'target_days', e.target.value)
                          }
                          className="w-20 h-8"
                          min={0}
                          step={0.5}
                          disabled={!canEdit || isSaving}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          value={rule.at_risk_days ?? ''}
                          onChange={(e) =>
                            handleFieldChange(rule.id, 'at_risk_days', e.target.value)
                          }
                          className="w-20 h-8"
                          min={0}
                          step={0.5}
                          disabled={!canEdit || isSaving}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Switch
                          checked={rule.is_applicable}
                          onCheckedChange={(checked) =>
                            handleFieldChange(rule.id, 'is_applicable', checked)
                          }
                          disabled={!canEdit || isSaving}
                        />
                      </td>
                      {canEdit && (
                        <td className="px-4 py-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveRule(rule.id)}
                            disabled={!isModified || isSaving || savingId !== null}
                          >
                            {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : 'Save'}
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {editableRules.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">No SLA rules found.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}