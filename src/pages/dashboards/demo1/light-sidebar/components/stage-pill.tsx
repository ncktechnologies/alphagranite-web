import { humanizeSegment } from '@/lib/breadcrumbs';
import { cn } from '@/lib/utils';

// Stage hues carried over from the original dashboard badges.
const STAGE_STYLES: Record<string, { dot: string; pill: string }> = {
  drafting: { dot: 'bg-purple-500', pill: 'bg-purple-50 text-purple-700 ring-purple-200' },
  slab_smith_request: { dot: 'bg-orange-500', pill: 'bg-orange-50 text-orange-700 ring-orange-200' },
  cut_list: { dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
  templating: { dot: 'bg-green-500', pill: 'bg-green-50 text-green-700 ring-green-200' },
  cost_of_stones: { dot: 'bg-yellow-500', pill: 'bg-yellow-50 text-yellow-800 ring-yellow-200' },
  completed: { dot: 'bg-green-500', pill: 'bg-green-50 text-green-700 ring-green-200' },
  programming: { dot: 'bg-slate-400', pill: 'bg-slate-50 text-slate-700 ring-slate-200' },
};

const FALLBACK = { dot: 'bg-[#8A93A5]', pill: 'bg-[#F1F2F6] text-[#4B5675] ring-[#E2E4ED]' };

export const stageKey = (stage?: string) =>
  (stage ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');

export const stageLabel = (stage?: string) => (stage ? humanizeSegment(stageKey(stage)) : '—');

export function StagePill({ stage, className }: { stage?: string; className?: string }) {
  const style = STAGE_STYLES[stageKey(stage)] ?? FALLBACK;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        style.pill,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', style.dot)} aria-hidden />
      {stageLabel(stage)}
    </span>
  );
}
