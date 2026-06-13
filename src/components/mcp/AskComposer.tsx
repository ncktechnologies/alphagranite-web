import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Bot, Clock3, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { type McpAskRequestFocus, type McpAskRequestResponseMode } from '@/lib/mcp';

const INLINE_RECENT_QUERY_LIMIT = 3;

export interface RecentMcpQuestion {
  question: string;
  matchedTool?: string;
  createdAt: string;
}

interface ComposerFormValues {
  question: string;
}

export interface AskComposerOptions {
  response_mode: McpAskRequestResponseMode;
  focus: McpAskRequestFocus;
  allow_context_pack: boolean;
  prefer_sql: boolean;
}

export function AskComposer({
  onSubmit,
  isPending,
  suggestedPrompts,
  defaultQuestion,
  options,
  onOptionsChange,
}: {
  onSubmit: (question: string) => void;
  isPending?: boolean;
  suggestedPrompts: string[];
  defaultQuestion?: string;
  options: AskComposerOptions;
  onOptionsChange: (next: AskComposerOptions) => void;
}) {
  const form = useForm<ComposerFormValues>({
    defaultValues: {
      question: defaultQuestion ?? '',
    },
  });

  useEffect(() => {
    form.reset({ question: defaultQuestion ?? '' });
  }, [defaultQuestion, form]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-muted/20">
        <CardHeader className="space-y-3 border-b border-border/70 bg-background/60">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-primary" />
            <CardTitle className="text-base">Ask MCP</CardTitle>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Ask in natural language. The planner will pick the tool, explain why, and expose the raw result when needed.
          </p>
        </CardHeader>

        <CardContent className="space-y-4 py-5">
          <Controller
            control={form.control}
            name="question"
            rules={{ required: 'Please enter a question.' }}
            render={({ field }) => (
              <Textarea
                value={field.value}
                onChange={field.onChange}
                placeholder="Example: Which install jobs are scheduled for tomorrow and what is the matched tool?"
                className="min-h-[132px] resize-y"
              />
            )}
          />

          <form className="space-y-3" onSubmit={form.handleSubmit((values) => onSubmit(values.question.trim()))}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5 text-xs font-medium text-muted-foreground" htmlFor="ask-response-mode">
                Response depth
                <select
                  id="ask-response-mode"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  value={options.response_mode}
                  onChange={(event) => onOptionsChange({ ...options, response_mode: event.target.value as McpAskRequestResponseMode })}
                >
                  <option value="brief">Brief</option>
                  <option value="standard">Standard</option>
                  <option value="deep">Deep</option>
                </select>
              </label>

              <label className="space-y-1.5 text-xs font-medium text-muted-foreground" htmlFor="ask-focus">
                Focus
                <select
                  id="ask-focus"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  value={options.focus}
                  onChange={(event) => onOptionsChange({ ...options, focus: event.target.value as McpAskRequestFocus })}
                >
                  <option value="mixed">Mixed</option>
                  <option value="finance">Finance</option>
                  <option value="operations">Operations</option>
                  <option value="dispatch">Dispatch</option>
                  <option value="quality">Quality</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Context pack</p>
                  <p className="text-xs text-muted-foreground">Allow multi-tool context merge</p>
                </div>
                <Switch
                  aria-label="Allow context pack"
                  checked={options.allow_context_pack}
                  onCheckedChange={(checked) => onOptionsChange({ ...options, allow_context_pack: Boolean(checked) })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Prefer SQL</p>
                  <p className="text-xs text-muted-foreground">Hint planner toward SQL path</p>
                </div>
                <Switch
                  aria-label="Prefer SQL"
                  checked={options.prefer_sql}
                  onCheckedChange={(checked) => onOptionsChange({ ...options, prefer_sql: Boolean(checked) })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <Button key={prompt} type="button" variant="outline" size="sm" onClick={() => onSubmit(prompt)}>
                    <Sparkles className="size-4" />
                    {prompt}
                  </Button>
                ))}
              </div>

              <Button type="submit" disabled={isPending} className="shrink-0 sm:min-w-[140px]">
                {isPending ? 'Asking...' : 'Ask MCP'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function RecentQueriesPanel({
  recentQueries,
  onUseRecent,
}: {
  recentQueries: RecentMcpQuestion[];
  onUseRecent: (question: string) => void;
}) {
  const [isRecentDialogOpen, setIsRecentDialogOpen] = useState(false);

  const visibleRecentQueries = useMemo(() => recentQueries.slice(0, INLINE_RECENT_QUERY_LIMIT), [recentQueries]);
  const hiddenRecentQueryCount = Math.max(0, recentQueries.length - INLINE_RECENT_QUERY_LIMIT);

  const renderRecentQueryButton = (item: RecentMcpQuestion) => (
    <button
      key={`${item.createdAt}-${item.question}`}
      type="button"
      onClick={() => {
        setIsRecentDialogOpen(false);
        onUseRecent(item.question);
      }}
      className="w-full rounded-lg border border-border px-3 py-3 text-left transition-colors hover:bg-muted/40"
    >
      <p className="text-sm font-medium text-foreground line-clamp-2">{item.question}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {item.matchedTool ? `Matched ${item.matchedTool}` : 'No matched tool yet'}
      </p>
    </button>
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 py-4">
        <CardTitle className="text-base">Recent queries</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" appearance="light">
            <Clock3 className="size-3.5" />
            {recentQueries.length}
          </Badge>
          {hiddenRecentQueryCount > 0 && (
            <Dialog open={isRecentDialogOpen} onOpenChange={setIsRecentDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  View all
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>All recent queries</DialogTitle>
                </DialogHeader>
                <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                  {recentQueries.map((item) => renderRecentQueryButton(item))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {recentQueries.length > 0 ? (
          <>
            {visibleRecentQueries.map((item) => renderRecentQueryButton(item))}
            {hiddenRecentQueryCount > 0 && (
              <p className="px-1 text-xs text-muted-foreground">
                Showing the latest {INLINE_RECENT_QUERY_LIMIT}. {hiddenRecentQueryCount} more {hiddenRecentQueryCount === 1 ? 'query is' : 'queries are'} available in View all.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Your recent questions will appear here after you ask MCP.</p>
        )}
      </CardContent>
    </Card>
  );
}