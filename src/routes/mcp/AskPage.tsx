import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Container } from '@/components/common/container';
import { AskComposer, RecentQueriesPanel, type AskComposerOptions, type RecentMcpQuestion } from '@/components/mcp/AskComposer';
import { AskResponsePanel } from '@/components/mcp/AskResponsePanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useMcpAsk } from '@/hooks/use-mcp-ask';
import { type McpAskResponse, MCP_RECENT_QUERY_KEY } from '@/lib/mcp';

const SUGGESTED_PROMPTS = [
  'Which accounts and jobs are driving the most redos?',
  'How long are fabs taking stage-by-stage this month, and which exceed 14 days?',
  'What is our current shop load by stage, and where is work stalling?',
  'Show me last month’s service-level breaches and top bottleneck stages.',
];

const loadRecentQuestions = (): RecentMcpQuestion[] => {
  try {
    const stored = localStorage.getItem(MCP_RECENT_QUERY_KEY);
    return stored ? (JSON.parse(stored) as RecentMcpQuestion[]) : [];
  } catch {
    return [];
  }
};

export function AskPage() {
  const askMutation = useMcpAsk();
  const [response, setResponse] = useState<McpAskResponse | null>(null);
  const [recentQueries, setRecentQueries] = useState<RecentMcpQuestion[]>([]);
  const [draftQuestion, setDraftQuestion] = useState('');
  const [askOptions, setAskOptions] = useState<AskComposerOptions>({
    response_mode: 'standard',
    focus: 'mixed',
    allow_context_pack: true,
    prefer_sql: false,
  });

  useEffect(() => {
    setRecentQueries(loadRecentQuestions());
  }, []);

  useEffect(() => {
    localStorage.setItem(MCP_RECENT_QUERY_KEY, JSON.stringify(recentQueries.slice(0, 12)));
  }, [recentQueries]);

  const handleAsk = async (question: string) => {
    if (!question) {
      toast.error('Enter a question first.');
      return;
    }

    setDraftQuestion(question);

    try {
      const result = await askMutation.mutateAsync({
        question,
        params: {},
        response_mode: askOptions.response_mode,
        focus: askOptions.focus,
        allow_context_pack: askOptions.allow_context_pack,
        prefer_sql: askOptions.prefer_sql,
      });
      setResponse(result);
      setRecentQueries((current) => [
        {
          question,
          matchedTool: result.matched_tool,
          createdAt: new Date().toISOString(),
        },
        ...current.filter((item) => item.question !== question),
      ]);
    } catch {
      // Query-level toast handling already handles the error.
    }
  };

  const handleReuseQuestion = (question: string) => {
    setDraftQuestion(question);
    toast.success('Question loaded into Ask composer');
  };

  return (
    <Container className="pb-8">
      <Toolbar>
        <ToolbarHeading title="MCP Ask" description="Ask natural-language questions and inspect the chosen tool, evidence, and raw result." />
        <ToolbarActions>
          <Button variant="outline" asChild>
            <Link to="/mcp/tools">Browse tools</Link>
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <AskComposer
            onSubmit={handleAsk}
            isPending={askMutation.isPending}
            suggestedPrompts={SUGGESTED_PROMPTS}
            defaultQuestion={draftQuestion}
            options={askOptions}
            onOptionsChange={setAskOptions}
          />

          <RecentQueriesPanel recentQueries={recentQueries} onUseRecent={(question) => handleAsk(question)} />
        </div>

        <AskResponsePanel response={response} isLoading={askMutation.isPending} onReuseQuestion={handleReuseQuestion} />

        <Separator />

        <Card>
          <CardContent className="py-5 text-sm text-muted-foreground">
            The answer is shown first. Planner metadata, the selected tool, and raw evidence are revealed below so you can inspect the decision.
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}