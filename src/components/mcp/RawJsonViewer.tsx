import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export function RawJsonViewer({
  value,
  title = 'Raw JSON',
  className,
}: {
  value: unknown;
  title?: string;
  className?: string;
}) {
  const text = JSON.stringify(value ?? null, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    toast.success('JSON copied');
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex-row items-center justify-between gap-3 py-4">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="size-4" />
          Copy
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[420px] rounded-lg border border-border bg-muted/20">
          <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs leading-6 text-foreground">{text}</pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}