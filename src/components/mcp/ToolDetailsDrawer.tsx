import { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { ResultRenderer } from './ResultRenderer';
import { ToolInvokeForm } from './ToolInvokeForm';
import { useMcpToolDetails } from '@/hooks/use-mcp-tool-details';
import { useMcpToolInvoke } from '@/hooks/use-mcp-tool-invoke';
import { formatToolDisplayName, type McpToolSummary } from '@/lib/mcp';

export function ToolDetailsDrawer({
  tool,
  open,
  onOpenChange,
}: {
  tool: McpToolSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const toolName = tool?.name;
  const { data, isLoading } = useMcpToolDetails(toolName, open);
  const invokeMutation = useMcpToolInvoke(toolName);
  const [result, setResult] = useState<unknown>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      (document.activeElement as HTMLElement | null)?.blur();
    }

    onOpenChange(nextOpen);
  };

  useEffect(() => {
    setResult(null);
  }, [toolName]);

  const details = useMemo(() => data ?? tool, [data, tool]);

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="h-[92vh] overflow-hidden">
        <DrawerHeader className="px-6 pb-3 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <DrawerTitle>{formatToolDisplayName(details?.name, details?.title)}</DrawerTitle>
            {details?.category && <Badge variant="secondary" appearance="light">{details.category}</Badge>}
          </div>
          <DrawerDescription>{details?.description || 'Inspect the schema and invoke the selected tool.'}</DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
          <div className="flex w-full flex-col gap-4">
            <ToolInvokeForm
              tool={details as any}
              onInvoke={async (params) => {
                const response = await invokeMutation.mutateAsync(params);
                setResult(response);
                return response;
              }}
            />

            {result && (
              <Card>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Latest execution</p>
                      <p className="text-xs text-muted-foreground">Tool output returned from the backend.</p>
                    </div>
                    <DrawerClose asChild>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="size-4" />
                        Close
                      </Button>
                    </DrawerClose>
                  </div>
                  <Separator />
                  <ResultRenderer result={result} toolName={toolName} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}