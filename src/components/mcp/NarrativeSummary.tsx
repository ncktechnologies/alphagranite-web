import { ChevronRight, Lightbulb, ListChecks, MessageSquareQuote, Sparkles, TrendingUp } from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { extractNarrativeSections, formatDisplayValue, formatFieldLabel, getColumnKeys, isPlainObject, type NarrativeSections } from '@/lib/mcp';
import { ResultTable } from './ResultTable';

export function NarrativeSummary({
  value,
  title = 'Answer',
  className,
}: {
  value: unknown;
  title?: string;
  className?: string;
}) {
  const narrative = extractNarrativeSections(value);

  if (!narrative) {
    return (
      <Card className={cn(className)}>
        <CardHeader className="space-y-2 border-b border-border bg-muted/20 py-5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">Structured result</p>
        </CardHeader>
        <CardContent className="space-y-4 py-5">
          <StructuredValue value={value} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="space-y-3 border-b border-border bg-muted/20 py-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <CardTitle className="text-base">{title}</CardTitle>
          {narrative.priority && (
            <Badge variant={priorityVariant(narrative.priority)} appearance="light">
              {narrative.priority}
            </Badge>
          )}
        </div>
        {narrative.summary && <p className="text-sm leading-6 text-foreground">{narrative.summary}</p>}
      </CardHeader>

      <CardContent className="space-y-4 py-5">
        {narrative.whatThisMeans && <KeyInsight icon={<Lightbulb className="size-4" />} title="What this means" value={narrative.whatThisMeans} />}

        {narrative.conversationReply && <KeyInsight icon={<MessageSquareQuote className="size-4" />} title="Plain-language reply" value={narrative.conversationReply} />}

        {narrative.likelyCauses.length > 0 && <BulletList icon={<TrendingUp className="size-4" />} title="Likely causes" items={narrative.likelyCauses} />}

        {narrative.recommendedActions.length > 0 && <BulletList icon={<ListChecks className="size-4" />} title="Recommended actions" items={narrative.recommendedActions} />}

        {narrative.followUpQuestion && (
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Follow-up question</p>
            <p className="mt-2 text-sm leading-6 text-foreground">{narrative.followUpQuestion}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KeyInsight({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{value}</p>
    </div>
  );
}

function BulletList({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </div>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function priorityVariant(priority: string): 'primary' | 'secondary' | 'warning' | 'destructive' | 'success' | 'info' {
  const normalized = priority.toLowerCase();
  if (normalized.includes('high')) return 'destructive';
  if (normalized.includes('medium')) return 'warning';
  if (normalized.includes('low')) return 'secondary';
  return 'info';
}

function StructuredValue({ value, title }: { value: unknown; title?: string }) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-sm text-muted-foreground">No items returned.</p>;
    }

    if (value.every(isPlainObject)) {
      return <ResultTable rows={value as Record<string, unknown>[]} title={title ?? 'Items'} />;
    }

    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="flex items-start gap-2 rounded-lg border border-border bg-background p-3 text-sm text-foreground">
            <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="break-words">{formatDisplayValue(item)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (!isPlainObject(value)) {
    return <p className="text-sm leading-6 text-muted-foreground">{formatDisplayValue(value)}</p>;
  }

  const entries = Object.entries(value);
  const scalarEntries = entries.filter(([, entryValue]) => entryValue === null || ['string', 'number', 'boolean'].includes(typeof entryValue) || entryValue instanceof Date);
  const nestedEntries = entries.filter(([, entryValue]) => Array.isArray(entryValue) || isPlainObject(entryValue));

  return (
    <div className="space-y-4">
      {scalarEntries.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {scalarEntries.map(([label, entryValue]) => (
            <Card key={label}>
              <CardHeader className="py-4">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">{formatFieldLabel(label)}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm font-medium text-foreground break-words">{formatDisplayValue(entryValue)}</CardContent>
            </Card>
          ))}
        </div>
      )}

      {nestedEntries.map(([label, entryValue]) => {
        const readableLabel = formatFieldLabel(label);

        if (Array.isArray(entryValue)) {
          if (entryValue.length > 0 && entryValue.every(isPlainObject)) {
            return (
              <NestedSection key={label} label={readableLabel}>
                <ResultTable rows={entryValue as Record<string, unknown>[]} title={readableLabel} />
              </NestedSection>
            );
          }

          return (
            <NestedSection key={label} label={readableLabel}>
              <StructuredValue value={entryValue} title={readableLabel} />
            </NestedSection>
          );
        }

        return (
          <NestedSection key={label} label={readableLabel}>
            <StructuredValue value={entryValue} title={readableLabel} />
          </NestedSection>
        );
      })}
    </div>
  );
}

function NestedSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4">
      <Accordion type="single" collapsible>
        <AccordionItem value={label} className="border-0">
          <AccordionTrigger className="py-3 text-sm font-semibold text-foreground">
            <span className="flex items-center gap-2">
              <ChevronRight className="size-4 text-primary" />
              {label}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pb-3">{children}</div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}