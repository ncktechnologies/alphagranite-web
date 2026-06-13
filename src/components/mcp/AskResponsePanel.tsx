import { Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { ContextPackPanel } from '@/components/mcp/ContextPackPanel';
import { FeedbackControls } from '@/components/mcp/FeedbackControls';
import { RelatedQaPanel } from '@/components/mcp/RelatedQaPanel';
import { SqlResultPanel } from '@/components/mcp/SqlResultPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDisplayValue, isPlainObject, type McpAdvisorDetails, type McpAskResponse, type McpContextPackResult, type McpSqlResult } from '@/lib/mcp';
import { NarrativeSummary } from './NarrativeSummary';
import { PlannerMetadata } from './PlannerMetadata';
import { ResultRenderer } from './ResultRenderer';

const getResponseMode = (response: McpAskResponse): string => {
  if (typeof response.mode === 'string' && response.mode.trim()) return response.mode;

  if (isPlainObject(response.result) && ('tools_run' in response.result || 'tool_errors' in response.result)) {
    return 'context_pack';
  }

  if (isPlainObject(response.result) && ('rows' in response.result || 'columns' in response.result || 'sql' in response.result)) {
    return 'sql';
  }

  return 'report';
};

const getAdvisorDetails = (advisor: unknown): McpAdvisorDetails | null => {
  if (!isPlainObject(advisor)) return null;
  return advisor as McpAdvisorDetails;
};

const getAdvisorText = (response: McpAskResponse, advisorDetails: McpAdvisorDetails | null) => {
  if (typeof response.advisor === 'string' && response.advisor.trim()) return response.advisor;
  return advisorDetails?.conversation_reply || advisorDetails?.executive_summary || response.rationale || response.question || 'No advisor text was returned.';
};

const getSqlResult = (response: McpAskResponse): McpSqlResult => {
  if (isPlainObject(response.result)) {
    return {
      ...(response.result as Record<string, unknown>),
      row_count: typeof (response.result as Record<string, unknown>).row_count === 'number' ? ((response.result as Record<string, unknown>).row_count as number) : response.row_count,
    } as McpSqlResult;
  }

  return {
    columns: [],
    rows: [],
    row_count: response.row_count,
    sql: typeof response.result === 'string' ? response.result : undefined,
  };
};

export function AskResponsePanel({
  response,
  isLoading,
  onReuseQuestion,
}: {
  response?: McpAskResponse | null;
  isLoading?: boolean;
  onReuseQuestion?: (question: string) => void;
}) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(response ?? {}, null, 2));
    toast.success('Response copied');
  };

  const handleShare = async () => {
    const summary = response?.advisor || response?.rationale || response?.question || 'MCP answer';

    if (navigator.share) {
      await navigator.share({
        title: response?.matched_tool ? `MCP: ${response.matched_tool}` : 'MCP answer',
        text: summary,
      });
      return;
    }

    await navigator.clipboard.writeText(summary);
    toast.success('Answer copied for sharing');
  };

  if (isLoading) {
    return <ResponseSkeleton />;
  }

  if (!response) {
    return (
      <Card className="h-full">
        <CardContent className="flex min-h-[480px] flex-col items-center justify-center gap-3 text-center">
          <p className="text-lg font-semibold text-foreground">Ask a question to get started</p>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            The answer will appear here with the matched tool, confidence, planner candidates, and raw data when available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const responseMode = getResponseMode(response);
  const advisorDetails = getAdvisorDetails(response.advisor);
  const advisorText = getAdvisorText(response, advisorDetails);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="info" appearance="light">
          {responseMode}
        </Badge>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="size-4" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="size-4" />
            Share
          </Button>
        </div>
      </div>

      <PlannerMetadata
        matchedTool={response.matched_tool}
        confidence={response.confidence}
        rationale={response.rationale}
        source={response.source}
        provider={response.provider}
        model={response.model}
        advisor={response.advisor}
        advisorProvider={response.advisor_provider}
        advisorModel={response.advisor_model}
        plannerCandidates={response.planner_candidates}
        resolvedParams={response.resolved_params}
        insights={response.insights}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Answer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <NarrativeSummary value={advisorText} title="Plain-language answer" />
          {advisorDetails && <AdvisorDetailsPanel advisor={advisorDetails} onReuseQuestion={onReuseQuestion} />}
          <FeedbackControls historyId={response.history_id} />
        </CardContent>
      </Card>

      {responseMode === 'context_pack' ? (
        <ContextPackPanel result={(isPlainObject(response.result) ? response.result : {}) as McpContextPackResult} />
      ) : responseMode === 'sql' ? (
        <SqlResultPanel result={getSqlResult(response)} />
      ) : responseMode === 'conversational' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-foreground">{advisorDetails?.conversation_reply || advisorText}</p>
            {advisorDetails?.next_questions && advisorDetails.next_questions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {advisorDetails.next_questions.map((question) => (
                  <Button key={question} type="button" variant="outline" size="sm" onClick={() => onReuseQuestion?.(question)}>
                    {question}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : responseMode === 'report' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tabular data</CardTitle>
          </CardHeader>
          <CardContent>
            <ResultRenderer result={response.result} toolName={response.matched_tool} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">This mode is not recognized yet. Showing generic structured rendering.</p>
            <ResultRenderer result={response.result} toolName={response.matched_tool} />
          </CardContent>
        </Card>
      )}

      <RelatedQaPanel items={response.related_qa} onReuseQuestion={(question) => onReuseQuestion?.(question)} />
    </div>
  );
}

function AdvisorDetailsPanel({ advisor, onReuseQuestion }: { advisor: McpAdvisorDetails; onReuseQuestion?: (question: string) => void }) {
  const keyFindings = Array.isArray(advisor.key_findings) ? advisor.key_findings : [];
  const riskFlags = Array.isArray(advisor.risk_flags) ? advisor.risk_flags : [];
  const recommendedActions = Array.isArray(advisor.recommended_actions) ? advisor.recommended_actions : [];
  const assumptions = Array.isArray(advisor.assumptions_and_gaps) ? advisor.assumptions_and_gaps : [];
  const nextQuestions = Array.isArray(advisor.next_questions) ? advisor.next_questions : [];

  const hasDetails =
    advisor.executive_summary ||
    advisor.what_this_means ||
    keyFindings.length > 0 ||
    riskFlags.length > 0 ||
    recommendedActions.length > 0 ||
    assumptions.length > 0 ||
    nextQuestions.length > 0 ||
    advisor.metric_breakdown ||
    advisor.evidence;

  if (!hasDetails) return null;

  return (
    <div className="space-y-3">
      {advisor.executive_summary && <InfoBlock title="Executive summary" value={advisor.executive_summary} />}
      {advisor.what_this_means && <InfoBlock title="What this means" value={advisor.what_this_means} />}
      {keyFindings.length > 0 && <StringList title="Key findings" values={keyFindings} />}
      {riskFlags.length > 0 && <StringList title="Risk flags" values={riskFlags} />}
      {recommendedActions.length > 0 && <StringList title="Recommended actions" values={recommendedActions} />}
      {assumptions.length > 0 && <StringList title="Assumptions and gaps" values={assumptions} />}

      {advisor.metric_breakdown && <NarrativeSummary value={advisor.metric_breakdown} title="Metric breakdown" />}
      {advisor.evidence && <NarrativeSummary value={advisor.evidence} title="Evidence" />}

      {nextQuestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Next questions</p>
          <div className="flex flex-wrap gap-2">
            {nextQuestions.map((question) => (
              <Button key={question} type="button" variant="outline" size="sm" onClick={() => onReuseQuestion?.(question)}>
                {question}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

function StringList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-foreground">
        {values.map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </div>
  );
}

function ResponseSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="space-y-4 p-5">
        <div className="h-20 animate-pulse rounded-xl bg-muted" />
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      </CardContent>
    </Card>
  );
}