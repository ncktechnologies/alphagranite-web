import { useQuery } from '@tanstack/react-query';
import { fetchMcpTools } from '@/lib/mcp';

export function useMcpTools() {
  return useQuery({
    queryKey: ['mcp', 'tools'],
    queryFn: fetchMcpTools,
    staleTime: 1000 * 60 * 5,
  });
}
