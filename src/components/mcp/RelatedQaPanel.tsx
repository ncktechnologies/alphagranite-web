import { Clock3, Link2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDisplayValue, type McpRelatedQaItem } from '@/lib/mcp';

export function RelatedQaPanel({
  items,
  onReuseQuestion,
}: {
  items?: McpRelatedQaItem[];
  onReuseQuestion: (question: string) => void;
}) {
  if (!items || items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Related Q&A</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={`${item.question}-${index}`} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" appearance="light">
                {item.mode || 'context'}
              </Badge>
              {typeof item.relevance === 'number' && (
                <Badge variant="info" appearance="light">
                  {Math.round(item.relevance * 100)}% relevant
                </Badge>
              )}
              {item.created_at && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  {formatDisplayValue(item.created_at)}
                </span>
              )}
            </div>

            <p className="mt-2 text-sm font-semibold text-foreground">{item.question}</p>
            {item.answer_summary && <p className="mt-1 text-sm text-muted-foreground">{item.answer_summary}</p>}

            <div className="mt-3">
              <Button type="button" size="sm" variant="outline" onClick={() => onReuseQuestion(item.question)}>
                <Link2 className="size-4" />
                Reuse in Ask
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
