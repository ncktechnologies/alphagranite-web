import { useMutation } from '@tanstack/react-query';

import { submitMcpFeedback, type McpFeedbackValue } from '@/lib/mcp';

export function useMcpFeedback() {
  return useMutation({
    mutationFn: (payload: { history_id: number; feedback: McpFeedbackValue }) => submitMcpFeedback(payload),
  });
}
