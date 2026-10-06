import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Year picker for the Performance input pages (current year, two back, one ahead). */
export function YearSelect({ value, onChange }: { value: number; onChange: (year: number) => void }) {
    const current = new Date().getFullYear();
    const years = [current + 1, current, current - 1, current - 2];
    if (!years.includes(value)) years.push(value);
    return (
        <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
            <SelectTrigger className="w-[110px] h-[34px]" aria-label="Year">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {years.sort((a, b) => b - a).map((year) => (
                    <SelectItem key={year} value={String(year)}>
                        {year}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
