import { useMutation } from '@tanstack/react-query';
import { askMcp } from '@/lib/mcp';

export function useMcpAsk() {
  return useMutation({
    mutationFn: askMcp,
  });
}
