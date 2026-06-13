import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { Container } from '@/components/common/container';
import { ToolCard } from '@/components/mcp/ToolCard';
import { ToolDetailsDrawer } from '@/components/mcp/ToolDetailsDrawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useMcpTools } from '@/hooks/use-mcp-tools';
import { type McpToolSummary } from '@/lib/mcp';

export function ToolCatalogPage() {
  const { data = [], isLoading } = useMcpTools();
  const [search, setSearch] = useState('');
  const [selectedTool, setSelectedTool] = useState<McpToolSummary | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [clearTimer, setClearTimer] = useState<number | null>(null);

  const filteredTools = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data;

    return data.filter((tool) => {
      const haystack = [tool.name, tool.title, tool.description, tool.category, ...(tool.tags ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [data, search]);

  return (
    <Container className="pb-8">
      <Toolbar>
        <ToolbarHeading title="MCP tools" description="Inspect the available tools and invoke them with a schema-driven form." />
        <ToolbarActions>
          <Button variant="outline" onClick={() => setSearch('')}>
            Clear search
          </Button>
        </ToolbarActions>
      </Toolbar>

      <Card className="mb-6">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tools, descriptions, tags" className="pl-9" />
          </div>
          <p className="hidden text-sm text-muted-foreground md:block">
            {filteredTools.length} tool{filteredTools.length === 1 ? '' : 's'}
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filteredTools.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTools.map((tool) => (
            <ToolCard
              key={tool.name}
              tool={tool}
              onOpen={() => {
                setSelectedTool(tool);
                setDrawerOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">No tools matched the current search.</CardContent>
        </Card>
      )}

      <ToolDetailsDrawer
        tool={selectedTool}
        open={drawerOpen && Boolean(selectedTool)}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            if (clearTimer) {
              window.clearTimeout(clearTimer);
            }

            const timer = window.setTimeout(() => {
              setSelectedTool(null);
            }, 250);
            setClearTimer(timer);
          }
        }}
      />
    </Container>
  );
}