import { AlertCircle, BarChart3, ListFilter, Table2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDisplayValueForKey, extractTableRows, getSummaryScalars, inferResultSummary, isNarrativeObject, unwrapMcpDisplayPayload } from '@/lib/mcp';
import { ResultTable } from './ResultTable';
import { NarrativeSummary } from './NarrativeSummary';

const toolRendererRegistry: Record<string, (result: unknown) => React.ReactNode> = {};

export function ResultRenderer({ result, toolName, className }: { result: unknown; toolName?: string; className?: string }) {
  const displayResult = unwrapMcpDisplayPayload(result);

  if (toolName && toolRendererRegistry[toolName]) {
    return <div className={className}>{toolRendererRegistry[toolName](displayResult)}</div>;
  }

  const summary = inferResultSummary(displayResult);
  const rows = extractTableRows(displayResult);
  const scalars = getSummaryScalars(displayResult);

  if (isNarrativeObject(displayResult)) {
    return (
      <div className={className}>
        <NarrativeSummary value={displayResult} title="Summary" />
      </div>
    );
  }

  if (summary.kind === 'empty') {
    return <EmptyResult />;
  }

  if (summary.kind === 'scalar' || summary.kind === 'object') {
    return (
      <div className={className}>
        <CompactResult scalars={scalars} rows={rows} result={displayResult} />
      </div>
    );
  }

  return (
    <div className={className}>
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList variant="line" size="md" className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="summary" className="gap-2">
            <BarChart3 className="size-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Table2 className="size-4" />
            Data
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-2">
            <ListFilter className="size-4" />
            Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-0">
          <CompactResult scalars={scalars} rows={rows} result={displayResult} />
        </TabsContent>

        <TabsContent value="data" className="mt-0">
          {rows.length > 0 ? (
            <ResultTable rows={rows} title={summary.kind === 'large-table' ? 'Large result' : 'Result data'} />
          ) : (
            <Card>
              <CardContent className="py-10 text-sm text-muted-foreground">No table-like rows were detected in this payload.</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {scalars.map((item) => (
                  <Card key={item.label}>
                    <CardHeader className="py-4">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm text-foreground break-words">{formatDisplayValueForKey(item.value, item.key)}</CardContent>
                  </Card>
                ))}
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                The selected tool returned structured data. Use the Summary and Data tabs for a readable view.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CompactResult({ scalars, rows, result }: { scalars: Array<{ key: string; label: string; value: unknown }>; rows: Record<string, unknown>[]; result: unknown }) {
  return (
    <div className="space-y-4">
      {scalars.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {scalars.map((item) => (
            <Card key={item.label}>
              <CardHeader className="py-4">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm font-medium text-foreground break-words">{formatDisplayValueForKey(item.value, item.key)}</CardContent>
            </Card>
          ))}
        </div>
      )}

      {rows.length > 0 ? (
        <ResultTable rows={rows} title="Compact data" />
      ) : typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean' ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            <p>{formatDisplayValueForKey(result)}</p>
          </CardContent>
        </Card>
      ) : (
        <NarrativeSummary value={result} title="Summary" />
      )}
    </div>
  );
}

function EmptyResult() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertCircle className="size-10 text-muted-foreground" />
        <div>
          <p className="text-base font-semibold text-foreground">No result returned</p>
          <p className="mt-1 text-sm text-muted-foreground">The selected tool did not return a payload.</p>
        </div>
      </CardContent>
    </Card>
  );
}