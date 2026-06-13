import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AskResponsePanel } from '@/components/mcp/AskResponsePanel';

vi.mock('@/components/mcp/FeedbackControls', () => ({
  FeedbackControls: ({ historyId }: { historyId?: number }) => <div>feedback-{historyId ?? 'none'}</div>,
}));

describe('AskResponsePanel mode rendering', () => {
  it('renders sql mode with row metadata and generated sql section', () => {
    render(
      <AskResponsePanel
        response={{
          mode: 'sql',
          question: 'sql question',
          history_id: 10,
          advisor: 'SQL answer',
          result: {
            columns: ['account'],
            rows: [['A1']],
            row_count: 1,
            truncated: true,
            sql: 'select account from jobs',
          },
        }}
      />,
    );

    expect(screen.getByText(/SQL result/i)).toBeInTheDocument();
    expect(screen.getByText(/Truncated/i)).toBeInTheDocument();
    expect(screen.getByText(/Generated SQL/i)).toBeInTheDocument();
  });

  it('renders context_pack mode with related qa and tool errors', async () => {
    const onReuseQuestion = vi.fn();
    const user = userEvent.setup();

    render(
      <AskResponsePanel
        onReuseQuestion={onReuseQuestion}
        response={{
          mode: 'context_pack',
          question: 'broad question',
          advisor: { executive_summary: 'Business is improving.' },
          related_qa: [
            {
              question: 'How were margins last week?',
              answer_summary: 'Margins held steady.',
              mode: 'report',
              relevance: 0.78,
            },
          ],
          result: {
            merged: { summary: 'Merged insight summary' },
            tools_run: [{ tool_name: 'owner.overview', summary: 'Used monthly metrics' }],
            tool_errors: ['dispatch delayed due to timeout'],
          },
        }}
      />,
    );

    expect(screen.getByText(/Tool errors/i)).toBeInTheDocument();
    expect(screen.getByText(/Related Q&A/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Reuse in Ask/i }));
    expect(onReuseQuestion).toHaveBeenCalledWith('How were margins last week?');
  });

  it('renders conversational mode with next-question chips', async () => {
    const onReuseQuestion = vi.fn();
    const user = userEvent.setup();

    render(
      <AskResponsePanel
        onReuseQuestion={onReuseQuestion}
        response={{
          mode: 'conversational',
          advisor: {
            conversation_reply: 'Things are stable this month with a few quality risks.',
            next_questions: ['Which shops are trending red this week?'],
          },
        }}
      />,
    );

    expect(screen.getAllByText(/Things are stable this month/i).length).toBeGreaterThan(0);

    const nextQuestionButtons = screen.getAllByRole('button', { name: 'Which shops are trending red this week?' });
    await user.click(nextQuestionButtons[0]);
    expect(onReuseQuestion).toHaveBeenCalledWith('Which shops are trending red this week?');
  });

  it('handles unknown mode safely with generic rendering fallback', () => {
    render(
      <AskResponsePanel
        response={{
          mode: 'unexpected_mode',
          advisor: 'Fallback answer',
          result: { message: 'Unknown mode payload' },
        }}
      />,
    );

    expect(screen.getByText(/not recognized yet/i)).toBeInTheDocument();
  });
});
