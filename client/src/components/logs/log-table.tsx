import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CommandLog } from '@shared/schema';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PaginationPageSize } from '@/components/ui/pagination';
dayjs.extend(utc);
dayjs.extend(timezone);

interface LogTableProps {
  logs: CommandLog[];
  isLoading: boolean;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
  onPageChange: (offset: number) => void;
  onPageSizeChange: (limit: number) => void;
}

const LogTable: React.FC<LogTableProps> = ({ logs, isLoading, pagination, onPageChange, onPageSizeChange }) => {
  const [selectedLog, setSelectedLog] = useState<CommandLog | null>(null);

  // Function to format the date
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return '-';
    return dayjs(dateString).tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm:ss');
  };
  
  // Function to get the status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-discord-green bg-opacity-20 text-discord-white';
      case 'failed':
        return 'bg-discord-red bg-opacity-20 text-discord-white';
      case 'permission_denied':
        return 'bg-discord-yellow bg-opacity-20 text-discord-white';
      default:
        return 'bg-discord-text-secondary bg-opacity-20 text-discord-white';
    }
  };

  // Function to get the callback status badge class
  const getCallbackStatusBadgeClass = (status: string | null | undefined) => {
    if (!status) return 'bg-discord-text-secondary bg-opacity-20 text-discord-white';
    switch (status) {
      case 'success':
        return 'bg-discord-green bg-opacity-20 text-discord-white';
      case 'failed':
        return 'bg-discord-red bg-opacity-20 text-discord-white';
      case 'pending':
        return 'bg-discord-yellow bg-opacity-20 text-discord-white';
      default:
        return 'bg-discord-text-secondary bg-opacity-20 text-discord-white';
    }
  };

  // Function to format parameters
  const formatParameters = (parameters: Record<string, any> | null | undefined) => {
    if (!parameters || Object.keys(parameters).length === 0) {
      return 'Nenhum parâmetro';
    }
    return Object.entries(parameters)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  };
  
  // Calculate pagination
  const total = pagination?.total || 0;
  const limit = pagination?.limit || 50;
  const offset = pagination?.offset || 0;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const hasPrevious = offset > 0;
  const hasNext = offset + limit < total;
  
  // Handle page change
  const goToPage = (newOffset: number) => {
    onPageChange(newOffset);
  };

  return (
    <Card className="bg-discord-bg-secondary rounded-lg shadow">
      <CardContent className="p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-discord-blurple"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-discord-text-secondary">
            No logs found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-discord-text-secondary">Timestamp</th>
                    <th className="px-4 py-2 text-left text-xs text-discord-text-secondary">Server</th>
                    <th className="px-4 py-2 text-left text-xs text-discord-text-secondary">Channel</th>
                    <th className="px-4 py-2 text-left text-xs text-discord-text-secondary">User</th>
                    <th className="px-4 py-2 text-left text-xs text-discord-text-secondary">Command</th>
                    <th className="px-4 py-2 text-left text-xs text-discord-text-secondary">Status</th>
                    <th className="px-4 py-2 text-left text-xs text-discord-text-secondary">Callback</th>
                    <th className="px-4 py-2 text-left text-xs text-discord-text-secondary">Parâmetros</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {logs.map((log, index) => (
                    <tr key={log.id || index} className="hover:bg-discord-bg-tertiary">
                      <td className="px-4 py-2 text-sm whitespace-nowrap">{formatDate(log.timestamp)}</td>
                      <td className="px-4 py-2 text-sm whitespace-nowrap">{log.serverName}</td>
                      <td className="px-4 py-2 text-sm whitespace-nowrap">{log.channelName}</td>
                      <td className="px-4 py-2 text-sm whitespace-nowrap">{log.username}</td>
                      <td className="px-4 py-2 text-sm whitespace-nowrap">{log.commandName}</td>
                      <td className="px-4 py-2 text-sm whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeClass(log.status || '')}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${getCallbackStatusBadgeClass(log.callbackStatus || '')}`}>
                          {log.callbackStatus || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <i className="fas fa-eye"></i>
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Command Parameters</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <pre className="whitespace-pre-wrap bg-discord-bg-tertiary p-4 rounded-md">
                                {formatParameters(log.parameters as Record<string, any> | null | undefined)}
                              </pre>
                              {log.callbackError && (
                                <div className="text-discord-red">
                                  <strong>Error:</strong> {log.callbackError}
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <PaginationPageSize
                  pageSize={limit}
                  onPageSizeChange={onPageSizeChange}
                  pageSizeOptions={[10, 25, 50, 100]}
                />
                <div className="text-sm text-discord-text-secondary">
                  Showing {offset + 1} to {Math.min(offset + logs.length, total)} of {total} logs
                  {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  disabled={!hasPrevious}
                  onClick={() => goToPage(Math.max(0, offset - limit))}
                  className="px-3 py-1 bg-discord-bg-tertiary rounded text-sm text-discord-text-secondary"
                >
                  Previous
                </Button>
                <Button
                  variant={hasNext ? "default" : "outline"}
                  disabled={!hasNext}
                  onClick={() => goToPage(offset + limit)}
                  className={`px-3 py-1 rounded text-sm ${hasNext ? 'bg-discord-blurple' : 'bg-discord-bg-tertiary text-discord-text-secondary'}`}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LogTable;
