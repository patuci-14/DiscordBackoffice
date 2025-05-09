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
}

const LogTable: React.FC<LogTableProps> = ({ logs, isLoading, pagination, onPageChange }) => {
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
              {isLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-4 bg-discord-bg-tertiary rounded w-32"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-discord-bg-tertiary rounded w-28"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-discord-bg-tertiary rounded w-20"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-discord-bg-tertiary rounded w-24"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-discord-bg-tertiary rounded w-16"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-discord-bg-tertiary rounded w-20"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-discord-bg-tertiary rounded w-24"></div>
                    </td>
                  </tr>
                ))
              ) : logs.length > 0 ? (
                logs.map((log, index) => (
                  <tr key={index} className="hover:bg-discord-bg-tertiary">
                    <td className="px-4 py-3 text-sm">{formatDate(log.timestamp)}</td>
                    <td className="px-4 py-3 text-sm">{log.serverName}</td>
                    <td className="px-4 py-3 text-sm">#{log.channelName}</td>
                    <td className="px-4 py-3 text-sm">{log.username}</td>
                    <td className="px-4 py-3 text-sm font-mono">{log.commandName}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 ${getStatusBadgeClass(log.status)} rounded-full text-xs`}>
                        {log.status === 'success' ? 'Success' : 
                         log.status === 'failed' ? 'Failed' : 
                         log.status === 'permission_denied' ? 'Permission Denied' : 
                         log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.callbackStatus ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <span className={`px-2 py-0.5 ${getCallbackStatusBadgeClass(log.callbackStatus)} rounded-full text-xs cursor-pointer`}>
                              {log.callbackStatus === 'success' ? 'Success' :
                               log.callbackStatus === 'failed' ? 'Failed' :
                               log.callbackStatus === 'pending' ? 'Pending' :
                               log.callbackStatus}
                            </span>
                          </DialogTrigger>
                          <DialogContent className="bg-discord-bg-secondary border border-gray-700">
                            <DialogHeader>
                              <DialogTitle className="text-discord-text-primary">Callback Details</DialogTitle>
                            </DialogHeader>
                            <div className="mt-4">
                              <div className="space-y-2">
                                <div>
                                  <span className="text-discord-text-secondary">Status: </span>
                                  <span className="text-discord-text-primary">{log.callbackStatus}</span>
                                </div>
                                {log.callbackTimestamp && (
                                  <div>
                                    <span className="text-discord-text-secondary">Timestamp: </span>
                                    <span className="text-discord-text-primary">{formatDate(log.callbackTimestamp as Date)}</span>
                                  </div>
                                )}
                                {log.callbackError && (
                                  <div>
                                    <span className="text-discord-text-secondary">Error: </span>
                                    <pre className="mt-2 bg-discord-bg-tertiary p-4 rounded-lg whitespace-pre-wrap text-discord-text-primary border border-gray-700">
                                      {log.callbackError}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span className="text-discord-text-secondary">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="bg-discord-bg-tertiary hover:bg-discord-bg-primary text-discord-text-secondary hover:text-discord-white px-3 py-1 text-sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            <i className="fas fa-eye mr-2"></i>
                            Ver Parâmetros
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-discord-bg-secondary border border-gray-700">
                          <DialogHeader>
                            <DialogTitle className="text-discord-text-primary">Parâmetros do Comando</DialogTitle>
                          </DialogHeader>
                          <div className="mt-4">
                            <pre className="bg-discord-bg-tertiary p-4 rounded-lg whitespace-pre-wrap text-discord-text-primary border border-gray-700">
                              {formatParameters(log.parameters as Record<string, any>)}
                            </pre>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-center text-discord-text-secondary">
                    No logs found. Try adjusting your filters or run some commands to generate logs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {pagination && logs.length > 0 && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-discord-text-secondary">
              Showing {Math.min(logs.length, limit)} of {total} logs
              {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
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
        )}
      </CardContent>
    </Card>
  );
};

export default LogTable;
