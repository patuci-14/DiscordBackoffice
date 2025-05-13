import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppShell from '@/components/layout/app-shell';
import LogFilters from '@/components/logs/log-filters';
import LogTable from '@/components/logs/log-table';
import { Button } from '@/components/ui/button';
import { getLogs } from '@/lib/discord-api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/auth-provider';

const Logs: React.FC = () => {
  const { toast } = useToast();
  const { botInfo } = useAuth();
  const [filterParams, setFilterParams] = useState({
    server: 'all',
    command: 'all',
    user: '',
    limit: 50,
    offset: 0
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/logs', filterParams, botInfo?.id],
    queryFn: () => getLogs({
      ...filterParams,
      server: filterParams.server === 'all' ? '' : filterParams.server,
      command: filterParams.command === 'all' ? '' : filterParams.command
    }),
    retry: false,
    enabled: !!botInfo?.id // Only run query when we have a botId
  });

  const handleExportLogs = () => {
    // This would typically generate a CSV or JSON file of the logs
    toast({
      title: 'Export Feature',
      description: 'Log export functionality would be implemented here.'
    });
  };

  const handleFilterChange = (newFilters: any) => {
    setFilterParams({
      ...filterParams,
      ...newFilters,
      offset: 0 // Reset to first page when filters change
    });
  };

  const handlePageChange = (offset: number) => {
    setFilterParams({
      ...filterParams,
      offset
    });
  };

  const handlePageSizeChange = (limit: number) => {
    setFilterParams({
      ...filterParams,
      limit,
      offset: 0 // Reset to first page when changing page size
    });
  };

  const exportButton = (
    <Button
      variant="outline"
      onClick={handleExportLogs}
      className="bg-discord-bg-secondary hover:bg-discord-bg-tertiary px-4 py-2 rounded-md text-sm inline-flex items-center"
    >
      <i className="fas fa-download mr-2"></i> Export Logs
    </Button>
  );

  return (
    <AppShell title="Command Logs" actions={exportButton}>
      {/* Filters */}
      <LogFilters onFilterChange={handleFilterChange} />
      
      {/* Logs Table */}
      <LogTable 
        logs={data?.logs || []} 
        isLoading={isLoading}
        pagination={data?.pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </AppShell>
  );
};

export default Logs;
