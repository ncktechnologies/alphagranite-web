import { Database } from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResultTable } from '@/components/mcp/ResultTable';
import { isPlainObject, type McpSqlResult } from '@/lib/mcp';

const toSqlRows = (result: McpSqlResult): Record<string, unknown>[] => {
  const columns = Array.isArray(result.columns) ? result.columns : [];
  const rows = Array.isArray(result.rows) ? result.rows : [];

  if (rows.length === 0) return [];

  if (rows.every((row) => isPlainObject(row))) {
    return rows as Record<string, unknown>[];
  }

  if (columns.length > 0 && rows.every(Array.isArray)) {
    return (rows as unknown[][]).map((row) => {
      const mapped: Record<string, unknown> = {};
      columns.forEach((column, index) => {
        mapped[column] = row[index];
      });
      return mapped;
    });
  }

  return [];
};

export function SqlResultPanel({ result }: { result: McpSqlResult }) {
  const rows = toSqlRows(result);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Database className="size-4 text-primary" />
          <CardTitle className="text-base">SQL result</CardTitle>
          {typeof result.row_count === 'number' && (
            <Badge variant="secondary" appearance="light">
              {result.row_count} rows
            </Badge>
          )}
          {result.truncated && (
            <Badge variant="warning" appearance="light">
              Truncated
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length > 0 ? (
          <ResultTable rows={rows} title="SQL rows" />
        ) : (
          <p className="text-sm text-muted-foreground">No SQL rows were returned for this query.</p>
        )}

        {result.sql && (
          <Accordion type="single" collapsible>
            <AccordionItem value="generated-sql">
              <AccordionTrigger>Generated SQL</AccordionTrigger>
              <AccordionContent>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/20 p-3 text-xs text-foreground">{result.sql}</pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
