import { beforeEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.fn();
const getMock = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: postMock,
      get: getMock,
      interceptors: {
        request: {
          use: vi.fn(),
        },
      },
    })),
  },
}));

describe('mcp ask API contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends Sample A ask payload with explicit controls', async () => {
    postMock.mockResolvedValueOnce({ data: { data: { mode: 'sql' } } });

    const { askMcp } = await import('@/lib/mcp');

    await askMcp({
      question: 'Show average production days by account for the last 90 days',
      allow_context_pack: false,
      response_mode: 'deep',
      focus: 'operations',
    });

    expect(postMock).toHaveBeenCalledWith('/api/v1/mcp/ask', {
      question: 'Show average production days by account for the last 90 days',
      params: {},
      allow_context_pack: false,
      response_mode: 'deep',
      focus: 'operations',
      prefer_sql: undefined,
    });
  });

  it('sends Sample B ask payload with context pack path controls', async () => {
    postMock.mockResolvedValueOnce({ data: { data: { mode: 'context_pack' } } });

    const { askMcp } = await import('@/lib/mcp');

    await askMcp({
      question: 'How is the business doing overall this month?',
      allow_context_pack: true,
      response_mode: 'standard',
      focus: 'mixed',
    });

    expect(postMock).toHaveBeenCalledWith('/api/v1/mcp/ask', {
      question: 'How is the business doing overall this month?',
      params: {},
      allow_context_pack: true,
      response_mode: 'standard',
      focus: 'mixed',
      prefer_sql: undefined,
    });
  });

  it('sends feedback payload with history_id and feedback value', async () => {
    postMock.mockResolvedValueOnce({ data: { ok: true } });

    const { submitMcpFeedback } = await import('@/lib/mcp');

    await submitMcpFeedback({ history_id: 123, feedback: 1 });

    expect(postMock).toHaveBeenCalledWith('/api/v1/mcp/feedback', {
      history_id: 123,
      feedback: 1,
    });
  });
});
