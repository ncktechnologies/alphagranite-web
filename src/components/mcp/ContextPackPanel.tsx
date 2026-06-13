import { AlertTriangle, Layers3 } from 'lucide-react';

import { NarrativeSummary } from '@/components/mcp/NarrativeSummary';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDisplayValue, isPlainObject, type McpContextPackResult } from '@/lib/mcp';

const asToolList = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) return [];
  return value.filter(isPlainObject) as Array<Record<string, unknown>>;
};

const asToolErrors = (value: unknown): Array<Record<string, unknown> | string> => {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === 'string' || isPlainObject(item)) as Array<Record<string, unknown> | string>;
};

export function ContextPackPanel({ result }: { result: McpContextPackResult }) {
  const toolsRun = asToolList(result.tools_run);
  const toolErrors = asToolErrors(result.tool_errors);
  const merged = result.merged ?? result;

  return (
    <div className="space-y-4">
      {toolErrors.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-warning" />
              Tool errors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {toolErrors.map((error, index) => (
              <p key={index}>{typeof error === 'string' ? error : formatDisplayValue(error.error ?? error.message ?? error)}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <NarrativeSummary value={merged} title="Combined insights" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tools run</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {toolsRun.length > 0 ? (
            toolsRun.map((tool, index) => (
              <div key={index} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Layers3 className="size-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">{formatDisplayValue(tool.tool_name ?? tool.tool ?? tool.name ?? `Tool ${index + 1}`)}</p>
                  {tool.status && (
                    <Badge variant="secondary" appearance="light">
                      {formatDisplayValue(tool.status)}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{formatDisplayValue(tool.summary ?? tool.note ?? tool.result_summary ?? 'Completed')}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No individual tool execution details were returned.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
