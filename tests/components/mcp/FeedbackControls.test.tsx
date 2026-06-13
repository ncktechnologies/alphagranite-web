import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FeedbackControls } from '@/components/mcp/FeedbackControls';

const mutateAsyncMock = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/use-mcp-feedback', () => ({
  useMcpFeedback: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

describe('FeedbackControls', () => {
  it('submits thumbs up feedback payload when history id is present', async () => {
    mutateAsyncMock.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();

    render(<FeedbackControls historyId={123} />);

    await user.click(screen.getByRole('button', { name: 'Helpful' }));

    expect(mutateAsyncMock).toHaveBeenCalledWith({ history_id: 123, feedback: 1 });
  });

  it('disables feedback controls when history id is missing', () => {
    render(<FeedbackControls />);

    expect(screen.getByRole('button', { name: 'Helpful' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Neutral' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Not helpful' })).toBeDisabled();
    expect(screen.getByText(/no history id was returned/i)).toBeInTheDocument();
  });
});
