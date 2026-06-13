import { useQuery } from '@tanstack/react-query';
import { fetchMcpToolDetails } from '@/lib/mcp';

export function useMcpToolDetails(toolName?: string, enabled = true) {
  return useQuery({
    queryKey: ['mcp', 'tools', toolName],
    queryFn: () => fetchMcpToolDetails(toolName ?? ''),
    enabled: Boolean(toolName) && enabled,
    staleTime: 1000 * 60 * 5,
  });
}
