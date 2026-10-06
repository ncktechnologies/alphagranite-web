// pages/performance/SubcontractorLabor.tsx
//
// Weekly subcontractor installer labor, entered by hand. Weeks are the labor
// cost reports' own weeks (week_ending from the backend, month-end partial weeks
// included), and the values feed Installer Labor Costs - Weekly - Subs/Combined.
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BackButton } from '@/components/common/BackButton';
import { useIsSuperAdmin, usePermission } from '@/hooks/use-permission';
import { useGetSubcontractorLaborQuery, useUpdateSubcontractorLaborMutation, SubcontractorLaborWeek } from '@/store/api/report';
import { formatCurrency } from '@/lib/report-format';
import { YearSelect } from './YearSelect';

type Draft = { total_labor_cost: string; head_count: string };

const toInput = (value: number | null) => (value === null || value === undefined ? '' : String(value));
const toValue = (input: string) => (input.trim() === '' ? null : Number(input));
const isInvalid = (input: string) => input.trim() !== '' && (Number.isNaN(Number(input)) || Number(input) < 0);

// "YYYY-MM-DD" as a local date (no UTC shift).
const localDate = (value: string) => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
};

export function SubcontractorLaborPage() {
    const permissions = usePermission('SLA Settings');
    const isSuperAdmin = useIsSuperAdmin();
    const canEdit = isSuperAdmin || permissions.can_create;

    const [year, setYear] = useState(new Date().getFullYear());
    const { data, isLoading } = useGetSubcontractorLaborQuery({ year });
    const [saveWeeks, { isLoading: isSaving }] = useUpdateSubcontractorLaborMutation();
    const weeks: SubcontractorLaborWeek[] = useMemo(() => data?.data?.weeks ?? [], [data]);

    const [drafts, setDrafts] = useState<Record<string, Draft>>({});
    useEffect(() => {
        setDrafts(Object.fromEntries(weeks.map((w) => [w.week_ending, { total_labor_cost: toInput(w.total_labor_cost), head_count: toInput(w.head_count) }])));
    }, [weeks]);

    const changedWeeks = weeks.filter((w) => {
        const draft = drafts[w.week_ending];
        return draft && (draft.total_labor_cost !== toInput(w.total_labor_cost) || draft.head_count !== toInput(w.head_count));
    });
    const hasInvalid = Object.values(drafts).some((d) => isInvalid(d.total_labor_cost) || isInvalid(d.head_count));

    const months = useMemo(() => {
        const grouped = new Map<number, SubcontractorLaborWeek[]>();
        weeks.forEach((w) => grouped.set(w.month_number, [...(grouped.get(w.month_number) ?? []), w]));
        return [...grouped.entries()];
    }, [weeks]);

    const yearTotal = Object.values(drafts).reduce((sum, d) => sum + (isInvalid(d.total_labor_cost) ? 0 : toValue(d.total_labor_cost) ?? 0), 0);

    const setDraft = (weekEnding: string, field: keyof Draft, value: string) =>
        setDrafts((prev) => ({ ...prev, [weekEnding]: { ...prev[weekEnding], [field]: value } }));

    const handleSave = async () => {
        if (hasInvalid) {
            toast.error('Values must be positive numbers');
            return;
        }
        try {
            await saveWeeks({
                year,
                weeks: changedWeeks.map((w) => ({
                    week_ending: w.week_ending,
                    total_labor_cost: toValue(drafts[w.week_ending].total_labor_cost),
                    head_count: toValue(drafts[w.week_ending].head_count),
                })),
            }).unwrap();
            toast.success(`Saved ${changedWeeks.length} week${changedWeeks.length === 1 ? '' : 's'}`);
        } catch (error: unknown) {
            const data = (error as { data?: { message?: string; detail?: { message?: string } } })?.data;
            toast.error(data?.message || data?.detail?.message || 'Could not save subcontractor labor');
        }
    };

    return (
        <div className="p-5 space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Sub Contractor Labor</h1>
                <div className="flex items-center gap-2 flex-wrap">
                    <YearSelect value={year} onChange={setYear} />
                    {canEdit && (
                        <>
                            <Button
                                variant="outline"
                                disabled={changedWeeks.length === 0 || isSaving}
                                onClick={() => setDrafts(Object.fromEntries(weeks.map((w) => [w.week_ending, { total_labor_cost: toInput(w.total_labor_cost), head_count: toInput(w.head_count) }])))}
                            >
                                Discard Changes
                            </Button>
                            <Button onClick={handleSave} disabled={changedWeeks.length === 0 || isSaving || hasInvalid}>
                                {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                Save{changedWeeks.length ? ` (${changedWeeks.length})` : ''}
                            </Button>
                        </>
                    )}
                    <BackButton />
                </div>
            </div>
            <p className="text-sm text-muted-foreground">
                Enter subcontractor installer labor for each report week. These feed the Installer Labor Costs - Weekly - Subs
                and Combined reports. Leave both fields empty to clear a week. Year total: <span className="font-semibold text-foreground">{formatCurrency(yearTotal)}</span>
            </p>

            {isLoading ? (
                <div className="flex items-center justify-center h-40">
                    <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid gap-5 xl:grid-cols-2">
                    {months.map(([monthNumber, monthWeeks]) => (
                        <Card key={monthNumber}>
                            <CardHeader className="py-3">
                                <CardTitle className="text-base">{format(new Date(year, monthNumber - 1, 1), 'MMMM yyyy')}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-muted-foreground">
                                            <th className="py-2 pr-3 font-medium">Week ending</th>
                                            <th className="py-2 pr-3 font-medium">Days</th>
                                            <th className="py-2 pr-3 font-medium">Total Labor Cost - Sub Contractor</th>
                                            <th className="py-2 font-medium">Sub Contractor Head Count</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthWeeks.map((week) => {
                                            const draft = drafts[week.week_ending] ?? { total_labor_cost: '', head_count: '' };
                                            return (
                                                <tr key={week.week_ending} className="border-t border-border">
                                                    <td className="py-2 pr-3 whitespace-nowrap tabular-nums">{format(localDate(week.week_ending), 'EEE, MMM d')}</td>
                                                    <td className="py-2 pr-3 tabular-nums text-muted-foreground">{week.number_of_days}</td>
                                                    <td className="py-1.5 pr-3">
                                                        <Input
                                                            type="number"
                                                            inputMode="decimal"
                                                            min={0}
                                                            step="0.01"
                                                            placeholder="$0.00"
                                                            aria-label={`Total labor cost, week ending ${week.week_ending}`}
                                                            aria-invalid={isInvalid(draft.total_labor_cost)}
                                                            value={draft.total_labor_cost}
                                                            disabled={!canEdit}
                                                            onChange={(event) => setDraft(week.week_ending, 'total_labor_cost', event.target.value)}
                                                        />
                                                    </td>
                                                    <td className="py-1.5">
                                                        <Input
                                                            type="number"
                                                            inputMode="decimal"
                                                            min={0}
                                                            step="0.5"
                                                            placeholder="0"
                                                            aria-label={`Head count, week ending ${week.week_ending}`}
                                                            aria-invalid={isInvalid(draft.head_count)}
                                                            value={draft.head_count}
                                                            disabled={!canEdit}
                                                            onChange={(event) => setDraft(week.week_ending, 'head_count', event.target.value)}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
