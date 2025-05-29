import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getServers, getCommands } from '@/lib/discord-api';

interface Server {
  id: number;
  serverId: string;
  name: string;
}

interface Command {
  id: number;
  name: string;
  type: 'slash' | 'prefix';
}

interface LogFiltersProps {
  onFilterChange: (filters: {
    server?: string;
    command?: string;
    user?: string;
    limit?: number;
  }) => void;
}

const LogFilters: React.FC<LogFiltersProps> = ({ onFilterChange }) => {
  const [server, setServer] = useState('');
  const [command, setCommand] = useState('');
  const [user, setUser] = useState('');
  const [dateRange, setDateRange] = useState('24h');
  
  // Fetch servers for the server dropdown
  const { data: serversData } = useQuery<{ success: boolean; servers?: Server[] }>({
    queryKey: ['/api/bot/servers'],
    retry: false,
  });
  
  // Fetch commands for the command dropdown
  const { data: commandsData } = useQuery<{ success: boolean; commands?: Command[] }>({
    queryKey: ['/api/commands'],
    retry: false,
  });
  
  // Apply filters when the button is clicked
  const handleApplyFilters = () => {
    onFilterChange({
      server,
      command,
      user,
      limit: getLimitFromDateRange(dateRange),
    });
  };
  
  // Helper to convert date range to a limit
  const getLimitFromDateRange = (range: string): number => {
    switch (range) {
      case '24h':
        return 50;
      case '7d':
        return 100;
      case '30d':
        return 200;
      case 'custom':
        return 500;
      default:
        return 50;
    }
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setServer('');
    setCommand('');
    setUser('');
    setDateRange('24h');
    
    onFilterChange({
      server: '',
      command: '',
      user: '',
      limit: 50,
    });
  };
  
  return (
    <Card className="bg-discord-bg-secondary rounded-lg shadow mb-6">
      <CardHeader>
        <h3 className="font-bold">Filtrar Logs</h3>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="block text-discord-text-primary text-sm mb-1">Servidor</Label>
            <Select value={server} onValueChange={setServer}>
              <SelectTrigger className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded">
                <SelectValue placeholder="Todos os Servidores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Servers</SelectItem>
                {serversData?.servers?.map(server => (
                  <SelectItem key={server.id} value={server.serverId}>
                    {server.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="block text-discord-text-primary text-sm mb-1">Comando</Label>
            <Select value={command} onValueChange={setCommand}>
              <SelectTrigger className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded">
                <SelectValue placeholder="Todos os Comandos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Comandos</SelectItem>
                {commandsData?.commands?.map(cmd => (
                  <SelectItem key={cmd.id} value={cmd.name}>
                    {cmd.type === 'slash' ? '/' : '!'}{cmd.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="block text-discord-text-primary text-sm mb-1">Usuário</Label>
            <Input
              type="text"
              placeholder="Filtrar por usuário"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded"
            />
          </div>
          
          <div>
            <Label className="block text-discord-text-primary text-sm mb-1">Faixa de Data</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded">
                <SelectValue placeholder="Selecionar faixa de data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Últimas 24 Horas</SelectItem>
                <SelectItem value="7d">Últimas 7 Dias</SelectItem>
                <SelectItem value="30d">Últimas 30 Dias</SelectItem>
                <SelectItem value="custom">Faixa de Data Personalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="px-3 py-2 bg-discord-bg-tertiary text-discord-text-secondary rounded text-sm"
          >
            Limpar Filtros
          </Button>
          <Button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-discord-blurple text-white rounded hover:bg-opacity-80 text-sm"
          >
            Aplicar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LogFilters;
