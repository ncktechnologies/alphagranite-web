// pages/performance/StaticData.tsx
//
// Yearly static figures. Overhead and breakeven values are calculated by the
// backend (src/app/service/performance_data.py:derive_static_data); overhead
// weekly feeds the labor cost reports, breakeven gross profit the dashboard.
import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, InputWrapper } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BackButton } from '@/components/common/BackButton';
import { useIsSuperAdmin, usePermission } from '@/hooks/use-permission';
import { useGetPerformanceStaticDataQuery, useUpdatePerformanceStaticDataMutation, PerformanceStaticData } from '@/store/api/report';
import { formatCurrency, formatNumber } from '@/lib/report-format';
import { YearSelect } from './YearSelect';

type EnteredField = 'total_expenses' | 'total_wages' | 'breakeven_gross_revenue';

const ENTERED_FIELDS: { key: EnteredField; label: string }[] = [
    { key: 'total_expenses', label: 'Total Expenses' },
    { key: 'total_wages', label: 'Total Wages' },
    { key: 'breakeven_gross_revenue', label: 'Breakeven Gross Revenue (Monthly)' },
];

// Working days = Mon-Fri less New Year's Day, Good Friday, Christmas Eve and Christmas Day (counted by the API per year).
const workingDaysText = (data?: PerformanceStaticData) =>
    data?.working_days_per_year ? `${data.working_days_per_year} working days in ${data.year}` : 'working days in the year';

const CALCULATED_FIELDS: { key: keyof PerformanceStaticData; label: string; formula: (data?: PerformanceStaticData) => string }[] = [
    { key: 'difference_overhead', label: 'Difference is Overhead', formula: () => 'Total Expenses − Total Wages' },
    { key: 'overhead_monthly', label: 'Overhead (no wages) Monthly', formula: () => 'Difference ÷ 12' },
    { key: 'overhead_weekly', label: 'Overhead (no wages) Weekly', formula: () => 'Difference ÷ 52 · used as overhead per week in the reports' },
    { key: 'breakeven_gross_profit', label: 'Breakeven Gross Profit', formula: () => 'Total Expenses ÷ 12' },
    { key: 'breakeven_avg_revenue_per_day', label: 'Average Revenue Per Day', formula: (data) =>
            `Breakeven Gross Revenue (Monthly) × 12 ÷ ${workingDaysText(data)} (weekdays less New Year's Day, Good Friday, Christmas Eve & Christmas Day)` },
];

const toInput = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));

/**
 * Dollar amount field: "$" prefix, shown as 7,800,000.00 like the calculated
 * values, and as the plain number while it is being edited.
 */
function CurrencyInput({ id, value, disabled, onChange }: {
    id: string;
    value: string;
    disabled?: boolean;
    onChange: (value: string) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const shown = isEditing || value === '' || Number.isNaN(Number(value)) ? value : formatNumber(value);
    return (
        <InputWrapper className={disabled ? 'opacity-50 cursor-not-allowed' : undefined}>
            <span className="text-muted-foreground" aria-hidden="true">$</span>
            <Input
                id={id}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={shown}
                disabled={disabled}
                onFocus={() => setIsEditing(true)}
                onBlur={() => setIsEditing(false)}
                // Digits and the decimal point only, so pasted "$7,800,000" is read as 7800000.
                onChange={(event) => onChange(event.target.value.replace(/[^0-9.]/g, ''))}
            />
        </InputWrapper>
    );
}

export function PerformanceStaticDataPage() {
    const permissions = usePermission('SLA Settings');
    const isSuperAdmin = useIsSuperAdmin();
    const canEdit = isSuperAdmin || permissions.can_create;

    const [year, setYear] = useState(new Date().getFullYear());
    const { data, isLoading, isFetching } = useGetPerformanceStaticDataQuery({ year });
    const [saveStaticData, { isLoading: isSaving }] = useUpdatePerformanceStaticDataMutation();
    const saved = data?.data;

    const [form, setForm] = useState<Record<EnteredField, string>>({ total_expenses: '', total_wages: '', breakeven_gross_revenue: '' });
    useEffect(() => {
        setForm({
            total_expenses: toInput(saved?.total_expenses),
            total_wages: toInput(saved?.total_wages),
            breakeven_gross_revenue: toInput(saved?.breakeven_gross_revenue),
        });
    }, [saved]);

    const invalidField = useMemo(
        () => ENTERED_FIELDS.find(({ key }) => form[key] !== '' && (Number.isNaN(Number(form[key])) || Number(form[key]) < 0)),
        [form],
    );
    const isDirty = ENTERED_FIELDS.some(({ key }) => form[key] !== toInput(saved?.[key]));

    const handleSave = async () => {
        if (invalidField) {
            toast.error(`${invalidField.label} must be a positive number`);
            return;
        }
        const value = (key: EnteredField) => (form[key] === '' ? null : Number(form[key]));
        try {
            await saveStaticData({
                year,
                total_expenses: value('total_expenses'),
                total_wages: value('total_wages'),
                breakeven_gross_revenue: value('breakeven_gross_revenue'),
            }).unwrap();
            toast.success(`Static data for ${year} saved`);
        } catch (error: unknown) {
            toast.error((error as { data?: { message?: string } })?.data?.message || 'Could not save static data');
        }
    };

    return (
        <div className="p-5 space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Static Data</h1>
                <div className="flex items-center gap-2">
                    <YearSelect value={year} onChange={setYear} />
                    <BackButton />
                </div>
            </div>
            <p className="text-sm text-muted-foreground">
                Yearly figures used across the reports. Overhead weekly becomes the overhead per week in the labor cost
                reports, and breakeven gross profit drives the Gross Profit Delta on the dashboard.
            </p>

            {isLoading ? (
                <div className="flex items-center justify-center h-40">
                    <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Entered values · {year}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {ENTERED_FIELDS.map(({ key, label }) => (
                                <div key={key} className="space-y-1.5">
                                    <Label htmlFor={key}>{label}</Label>
                                    <CurrencyInput
                                        id={key}
                                        value={form[key]}
                                        disabled={!canEdit}
                                        onChange={(value) => setForm((prev) => ({ ...prev, [key]: value }))}
                                    />
                                </div>
                            ))}
                            {canEdit && (
                                <div className="flex gap-2 pt-2">
                                    <Button onClick={handleSave} disabled={!isDirty || isSaving || !!invalidField}>
                                        {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                        Save
                                    </Button>
                                    <Button
                                        variant="outline"
                                        disabled={!isDirty || isSaving}
                                        onClick={() => setForm({
                                            total_expenses: toInput(saved?.total_expenses),
                                            total_wages: toInput(saved?.total_wages),
                                            breakeven_gross_revenue: toInput(saved?.breakeven_gross_revenue),
                                        })}
                                    >
                                        Discard Changes
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Calculated · {year}</CardTitle>
                        </CardHeader>
                        <CardContent className="divide-y divide-border">
                            {CALCULATED_FIELDS.map(({ key, label, formula }) => (
                                <div key={key} className="flex items-center justify-between gap-4 py-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground">{label}</p>
                                        <p className="text-xs text-muted-foreground">{formula(saved)}</p>
                                    </div>
                                    <p className="shrink-0 text-base font-semibold tabular-nums">
                                        {isFetching ? '…' : formatCurrency(saved?.[key] as number | null)}
                                    </p>
                                </div>
                            ))}
                            {isDirty && <p className="pt-3 text-xs text-muted-foreground">Save to recalculate.</p>}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
