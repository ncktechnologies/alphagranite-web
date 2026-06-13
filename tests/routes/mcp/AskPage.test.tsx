import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AskPage } from '@/routes/mcp/AskPage';

const mutateAsyncMock = vi.fn();

vi.mock('@/hooks/use-mcp-ask', () => ({
  useMcpAsk: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/components/common/container', () => ({
  Container: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/mcp/AskResponsePanel', () => ({
  AskResponsePanel: () => <div>response-panel</div>,
}));

describe('AskPage request builder', () => {
  it('submits with user-friendly default controls', async () => {
    mutateAsyncMock.mockResolvedValueOnce({ mode: 'report', matched_tool: 'owner.overview' });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AskPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText(/Which install jobs are scheduled for tomorrow/i), 'How is the business doing overall this month?');
    await user.click(screen.getByRole('button', { name: 'Ask MCP' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        question: 'How is the business doing overall this month?',
        params: {},
        response_mode: 'standard',
        focus: 'mixed',
        allow_context_pack: true,
        prefer_sql: false,
      });
    });
  });

  it('supports Sample A style SQL-oriented controls', async () => {
    mutateAsyncMock.mockResolvedValueOnce({ mode: 'sql', matched_tool: 'owner.sql_fallback' });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AskPage />
      </MemoryRouter>,
    );

    await user.selectOptions(screen.getByLabelText('Response depth'), 'deep');
    await user.selectOptions(screen.getByLabelText('Focus'), 'operations');
    await user.click(screen.getByLabelText('Allow context pack'));

    await user.type(screen.getByPlaceholderText(/Which install jobs are scheduled for tomorrow/i), 'Show average production days by account for the last 90 days');
    await user.click(screen.getByRole('button', { name: 'Ask MCP' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        question: 'Show average production days by account for the last 90 days',
        params: {},
        response_mode: 'deep',
        focus: 'operations',
        allow_context_pack: false,
        prefer_sql: false,
      });
    });
  });
});
