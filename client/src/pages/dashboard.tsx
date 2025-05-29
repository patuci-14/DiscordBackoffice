import React from 'react';
import { useQuery } from '@tanstack/react-query';
import AppShell from '@/components/layout/app-shell';
import StatsCard from '@/components/ui/stats-card';
import BotInfoCard from '@/components/discord/bot-info-card';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getBotInfo, getBotStats } from '@/lib/discord-api';
import { useToast } from '@/hooks/use-toast';
import { BotConfig, BotStat, RecentActivity } from '@shared/schema';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useAuth } from '@/components/auth/auth-provider';
import { useCommandStats } from '@/hooks/use-command-stats';

dayjs.extend(utc);
dayjs.extend(timezone);

const Dashboard: React.FC = () => {
  const { toast } = useToast();
  const { botInfo } = useAuth();

  if (!botInfo?.id) {
    return <div>Carregando informações do bot...</div>;
  }

  const { data: botInfoData, isLoading: isBotInfoLoading, refetch: refetchBotInfo } = useQuery<{ success: boolean; config?: BotConfig }>({
    queryKey: ['/api/bot', botInfo?.id],
    queryFn: () => getBotInfo(),
    retry: false,
    enabled: !!botInfo?.id // Only run query when we have a botId
  });

  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useQuery<{ success: boolean; stats?: BotStat; recentActivity?: RecentActivity[] }>({
    queryKey: ['/api/bot/stats', botInfo?.id],
    queryFn: () => getBotStats(),
    retry: false,
    enabled: !!botInfo?.id
  });

  const { data: commandStats } = useCommandStats(botInfo?.id);

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchBotInfo(), refetchStats()]);
      toast({
        title: 'Dashboard Recarregado',
        description: 'Os dados mais recentes do bot foram carregados.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Falha ao Recarregar',
        description: 'Falha ao recarregar os dados do dashboard.',
      });
    }
  };

  const getActivityIcon = (activity: RecentActivity) => {
    switch (activity.type) {
      case 'command':
        return <i className="fas fa-terminal text-discord-blurple mr-2"></i>;
      case 'server':
        return <i className="fas fa-server text-discord-green mr-2"></i>;
      case 'permission':
        return <i className="fas fa-lock text-discord-yellow mr-2"></i>;
      case 'error':
        return <i className="fas fa-exclamation-circle text-discord-red mr-2"></i>;
      default:
        return <i className="fas fa-info-circle text-discord-text-secondary mr-2"></i>;
    }
  };

  const formatTime = (timeStr: string) => {
    const time = dayjs(new Date(timeStr)).tz('America/Sao_Paulo');
    const now = dayjs().tz('America/Sao_Paulo');
    const diffInSeconds = now.diff(time, 'second');
    if (diffInSeconds < 60) return 'Agora mesmo';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutos atrás`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} horas atrás`;
    return `${Math.floor(diffInSeconds / 86400)} dias atrás`;
  };

  const refreshButton = (
    <Button 
      variant="outline" 
      onClick={handleRefresh} 
      className="bg-discord-bg-secondary hover:bg-discord-bg-tertiary px-3 py-1 rounded-md text-sm inline-flex items-center"
    >
      <i className="fas fa-sync-alt mr-2"></i> Recarregar
    </Button>
  );

  return (
    <AppShell title="Dashboard" actions={refreshButton}>
      
      {/* Bot Info Card */}
      {isBotInfoLoading ? (
        <div className="bg-discord-bg-secondary rounded-lg p-4 shadow mb-6 animate-pulse">
          <div className="h-16 flex items-center">
            <div className="h-12 w-12 bg-discord-bg-tertiary rounded-full mr-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-discord-bg-tertiary rounded w-32"></div>
              <div className="h-3 bg-discord-bg-tertiary rounded w-24"></div>
            </div>
          </div>
        </div>
      ) : botInfoData?.config ? (
        <BotInfoCard config={botInfoData.config} />
      ) : (
        <div className="bg-discord-bg-secondary rounded-lg p-4 shadow mb-6">
          <p className="text-center text-discord-text-secondary">
            Informações do bot não disponíveis
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Servidores"
          value={isStatsLoading ? "..." : statsData?.stats?.serverCount ?? 0}
          icon="fas fa-server"
          iconColor="text-discord-blurple"
          iconSize="text-4xl"
          subtitle={
            statsData?.stats?.serverCount && statsData.stats.serverCount > 0
              ? `Ativos em ${statsData.stats.serverCount} servidores`
              : "Nenhum servidor conectado"
          }
        />

        <StatsCard
          title="Comandos Usados"
          value={isStatsLoading ? "..." : statsData?.stats?.commandsUsed ?? 0}
          icon="fas fa-terminal"
          iconColor="text-discord-green"
          iconSize="text-4xl"
          subtitle={
            commandStats
              ? `${commandStats} nas últimos 24 horas`
              : "Nenhum comando usado nas últimas 24 horas"
          }
        />

        <StatsCard
          title="Usuários Ativos"
          value={isStatsLoading ? "..." : statsData?.stats?.activeUsers ?? 0}
          icon="fas fa-users"
          iconColor="text-discord-yellow"
          iconSize="text-4xl"
          subtitle={
            statsData?.stats?.activeUsers && statsData.stats.activeUsers > 0
              ? `Em todos os servidores`
              : "Nenhum usuário ativo ainda"
          }
        />

        <StatsCard
          title="Tempo em operação"
          value={isStatsLoading ? "..." : statsData?.stats?.uptime ?? "0%"}
          icon="fas fa-chart-line"
          iconColor="text-discord-red"
          iconSize="text-4xl"
          subtitle={
            botInfoData?.config?.lastConnected
              ? `Último login: ${dayjs(botInfoData.config.lastConnected)
                  .tz("America/Sao_Paulo")
                  .format("DD/MM/YYYY HH:mm")}`
              : "Recém-iniciado"
          }
        />
      </div>

      {/* Recent Activity */}
      <Card className="bg-discord-bg-secondary shadow">
        <CardHeader className="pb-2">
          <h3 className="font-bold">Atividade Recente</h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-base text-discord-text-primary">
                    Evento
                  </th>
                  <th className="px-4 py-2 text-left text-base text-discord-text-primary">
                    Usuário
                  </th>
                  <th className="px-4 py-2 text-left text-base text-discord-text-primary">
                    Servidor
                  </th>
                  <th className="px-4 py-2 text-left text-base text-discord-text-primary">
                    Dt. Hora
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {isStatsLoading ? (
                  Array(4)
                    .fill(0)
                    .map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-4 py-3">
                          <div className="h-4 bg-discord-bg-tertiary rounded w-32"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 bg-discord-bg-tertiary rounded w-24"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 bg-discord-bg-tertiary rounded w-28"></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 bg-discord-bg-tertiary rounded w-20"></div>
                        </td>
                      </tr>
                    ))
                ) : statsData?.recentActivity &&
                  statsData.recentActivity.length > 0 ? (
                  statsData.recentActivity.map(
                    (activity: RecentActivity, index: number) => (
                      <tr key={index} className="hover:bg-discord-bg-tertiary">
                        <td className="px-4 py-2 text-sm text-discord-text-primary">
                          <div className="flex items-center">
                            {getActivityIcon(activity)}
                            <span>
                              {activity.type === "command"
                                ? `Comando: ${activity.details}`
                                : activity.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-discord-text-primary">
                          {activity.user}
                        </td>
                        <td className="px-4 py-2 text-sm text-discord-text-primary">
                          {activity.server}
                        </td>
                        <td className="px-4 py-2 text-sm text-discord-text-primary">
                          {formatTime(activity.time)}
                          <br />
                          <span className="text-xs">
                            {dayjs(activity.time)
                              .tz("America/Sao_Paulo")
                              .format("DD/MM/YYYY HH:mm")}
                          </span>
                        </td>
                      </tr>
                    )
                  )
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-4 text-center text-discord-text-secondary"
                    >
                      Nenhuma atividade recente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-center">
            <Button
              variant="link"
              className="text-discord-blurple text-sm hover:underline"
            >
              <a href="/logs">Ver todas as atividades</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
};

export default Dashboard;
