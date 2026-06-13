import { ChevronDown, Info, Sparkles, Workflow } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatDisplayValue, formatFieldLabel, formatToolDisplayName, isPlainObject } from '@/lib/mcp';

const normalizeConfidence = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

export function PlannerMetadata({
  matchedTool,
  confidence,
  rationale,
  source,
  provider,
  model,
  advisor,
  advisorProvider,
  advisorModel,
  plannerCandidates,
  resolvedParams,
  insights,
  className,
}: {
  matchedTool?: string;
  confidence?: number;
  rationale?: string;
  source?: string;
  provider?: string;
  model?: string;
  advisor?: unknown;
  advisorProvider?: string;
  advisorModel?: string;
  plannerCandidates?: any[];
  resolvedParams?: any;
  insights?: any;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const normalizedConfidence = normalizeConfidence(confidence);

  const confidenceLabel = useMemo(() => {
    if (normalizedConfidence === undefined) return 'Unknown';
    if (normalizedConfidence > 0.85) return 'High';
    if (normalizedConfidence > 0.55) return 'Medium';
    return 'Low';
  }, [normalizedConfidence]);

  const advisorText = typeof advisor === 'string' ? advisor.trim() : '';
  const hasStructuredAdvisor = !advisorText && (Array.isArray(advisor) || isPlainObject(advisor));

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="space-y-3 border-b border-border bg-muted/20 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <CardTitle className="text-base">AI answer</CardTitle>
              {matchedTool && <Badge variant="info" appearance="light">{formatToolDisplayName(matchedTool)}</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{formatDisplayValue(provider || 'provider unknown')}</span>
              {model && <span>• {formatDisplayValue(model)}</span>}
              {source && <span>• {formatDisplayValue(source)}</span>}
            </div>
          </div>

          <Badge variant={normalizedConfidence && normalizedConfidence > 0.75 ? 'success' : normalizedConfidence && normalizedConfidence > 0.45 ? 'warning' : 'secondary'} appearance="light">
            {normalizedConfidence === undefined ? 'N/A' : `${Math.round(normalizedConfidence * 100)}% ${confidenceLabel}`}
          </Badge>
        </div>

        {advisorText || hasStructuredAdvisor ? (
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="size-4 text-emerald-600" />
              Advisor
              {advisorProvider && <Badge variant="secondary" appearance="light">{advisorProvider}</Badge>}
              {advisorModel && <Badge variant="secondary" appearance="light">{advisorModel}</Badge>}
            </div>
            {advisorText ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{advisorText}</p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Structured advisor details are shown in the answer below.</p>
            )}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4 py-5">
        {rationale && (
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Info className="size-4 text-primary" />
              Rationale
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{formatDisplayValue(rationale)}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetadataTile label="Matched tool" value={matchedTool} icon={<Workflow className="size-4" />} />
          <MetadataTile label="Confidence" value={normalizedConfidence === undefined ? 'Unknown' : `${Math.round(normalizedConfidence * 100)}%`} icon={<Sparkles className="size-4" />} />
          <MetadataTile label="Source" value={source} icon={<Info className="size-4" />} />
        </div>

        <Button variant="outline" className="w-full justify-between" onClick={() => setExpanded((current) => !current)}>
          <span className="flex items-center gap-2">
            <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} />
            Planner details
          </span>
          <span className="text-xs text-muted-foreground">{plannerCandidates?.length ?? 0} candidates</span>
        </Button>

        {expanded && (
          <div className="space-y-4 rounded-lg border border-border bg-background p-4">
            <Section title="Planner candidates">
              {plannerCandidates && plannerCandidates.length > 0 ? (
                <div className="space-y-2">
                  {plannerCandidates.map((candidate, index) => (
                    <div key={index} className="rounded-md border border-border p-3 text-sm">
                      {(() => {
                        const candidateConfidence = normalizeConfidence(candidate?.confidence);
                        return (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" appearance="light">
                          {formatToolDisplayName(candidate?.tool_name as string | undefined, candidate?.name as string | undefined) || `Candidate ${index + 1}`}
                        </Badge>
                        {candidateConfidence !== undefined && <span className="text-muted-foreground">{Math.round(candidateConfidence * 100)}%</span>}
                      </div>
                        );
                      })()}
                      <p className="mt-2 text-muted-foreground">{candidate?.rationale ?? candidate?.reason ?? formatDisplayValue(candidate)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No planner candidates were returned.</p>
              )}
            </Section>

            <Separator />

            <Section title="Resolved params">
              <StructuredObject value={resolvedParams} />
            </Section>

            <Separator />

            <Section title="Insights">
              <StructuredObject value={insights} />
            </Section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetadataTile({ label, value, icon }: { label: string; value?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{value || '-'}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {children}
    </div>
  );
}

function StructuredObject({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <p className="text-sm text-muted-foreground">No details were returned.</p>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-sm text-muted-foreground">No details were returned.</p>;
    }

    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-md border border-border bg-background p-3 text-sm text-foreground">
            {isPlainObject(item)
              ? Object.entries(item)
                  .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined)
                  .map(([key, entryValue]) => (
                    <div key={key} className="flex flex-wrap gap-2">
                      <span className="font-medium text-muted-foreground">{formatFieldLabel(key)}:</span>
                      <span>{formatDisplayValue(entryValue)}</span>
                    </div>
                  ))
              : formatDisplayValue(item)}
          </div>
        ))}
      </div>
    );
  }

  if (!isPlainObject(value)) {
    return <p className="text-sm text-muted-foreground">{formatDisplayValue(value)}</p>;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No details were returned.</p>;
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
      {entries.map(([key, entryValue]) => (
        <div key={key} className="flex flex-wrap gap-2 text-sm">
          <span className="font-medium text-muted-foreground">{formatFieldLabel(key)}:</span>
          <span className="text-foreground">{formatDisplayValue(entryValue)}</span>
        </div>
      ))}
    </div>
  );
}