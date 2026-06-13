import { ChevronRight, Puzzle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatToolDisplayName, type McpToolSummary } from '@/lib/mcp';

export function ToolCard({ tool, onOpen }: { tool: McpToolSummary; onOpen: () => void }) {
  return (
    <Card className="group h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Puzzle className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base">{formatToolDisplayName(tool.name, tool.title)}</CardTitle>
              <p className="text-xs text-muted-foreground">{tool.name}</p>
            </div>
          </div>
          {tool.category && <Badge variant="secondary" appearance="light">{tool.category}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <p className="text-sm leading-6 text-muted-foreground line-clamp-3">{tool.description || 'No description provided.'}</p>

        <Button variant="outline" className="w-full justify-between" onClick={onOpen}>
          Inspect tool
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </CardContent>
    </Card>
  );
}