import type { ReactNode } from 'react';
import { Minus, ThumbsDown, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';

import { useMcpFeedback } from '@/hooks/use-mcp-feedback';
import { Button } from '@/components/ui/button';
import { type McpFeedbackValue } from '@/lib/mcp';

const FEEDBACK_OPTIONS: Array<{ label: string; value: McpFeedbackValue; icon: ReactNode }> = [
  { label: 'Helpful', value: 1, icon: <ThumbsUp className="size-4" /> },
  { label: 'Neutral', value: 0, icon: <Minus className="size-4" /> },
  { label: 'Not helpful', value: -1, icon: <ThumbsDown className="size-4" /> },
];

export function FeedbackControls({ historyId }: { historyId?: number }) {
  const feedbackMutation = useMcpFeedback();

  const handleFeedback = async (feedback: McpFeedbackValue) => {
    if (!historyId) return;

    try {
      await feedbackMutation.mutateAsync({ history_id: historyId, feedback });
      toast.success('Feedback sent');
    } catch {
      toast.error('Unable to send feedback');
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Answer feedback</p>
      <div className="flex flex-wrap gap-2">
        {FEEDBACK_OPTIONS.map((item) => (
          <Button
            key={item.label}
            type="button"
            size="sm"
            variant="outline"
            disabled={!historyId || feedbackMutation.isPending}
            onClick={() => handleFeedback(item.value)}
          >
            {item.icon}
            {item.label}
          </Button>
        ))}
      </div>
      {!historyId && <p className="text-xs text-muted-foreground">Feedback is unavailable for this answer because no history id was returned.</p>}
    </div>
  );
}
