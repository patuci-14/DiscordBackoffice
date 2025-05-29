import { useQuery } from '@tanstack/react-query';
import { getCommandsUsedLast24Hours } from '@/lib/discord-api';

export function useCommandStats(botId: string | undefined) {
  return useQuery({
    queryKey: ['/api/commands/stats', botId],
    queryFn: () => botId ? getCommandsUsedLast24Hours(botId) : Promise.resolve(0),
    enabled: !!botId,
    refetchInterval: 60000 // Refetch every minute
  });
} 