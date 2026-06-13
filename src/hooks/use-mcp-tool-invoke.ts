import { useMutation } from '@tanstack/react-query';
import { invokeMcpTool } from '@/lib/mcp';

export function useMcpToolInvoke(toolName?: string) {
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => invokeMcpTool(toolName ?? '', params),
  });
}
