import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getServers, getCommands } from '@/lib/discord-api';

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
  const { data: serversData } = useQuery({
    queryKey: ['/api/bot/servers'],
    retry: false,
  });
  
  // Fetch commands for the command dropdown
  const { data: commandsData } = useQuery({
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
        <h3 className="font-bold">Filter Logs</h3>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="block text-discord-text-secondary text-sm mb-1">Server</Label>
            <Select value={server} onValueChange={setServer}>
              <SelectTrigger className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded">
                <SelectValue placeholder="All Servers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Servers</SelectItem>
                {serversData?.servers?.map(server => (
                  <SelectItem key={server.id} value={server.serverId}>
                    {server.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="block text-discord-text-secondary text-sm mb-1">Command</Label>
            <Select value={command} onValueChange={setCommand}>
              <SelectTrigger className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded">
                <SelectValue placeholder="All Commands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Commands</SelectItem>
                {commandsData?.commands?.map(cmd => (
                  <SelectItem key={cmd.id} value={cmd.name}>
                    {cmd.type === 'slash' ? '/' : '!'}{cmd.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="block text-discord-text-secondary text-sm mb-1">User</Label>
            <Input
              type="text"
              placeholder="Filter by user"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded"
            />
          </div>
          
          <div>
            <Label className="block text-discord-text-secondary text-sm mb-1">Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
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
            Clear Filters
          </Button>
          <Button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-discord-blurple text-white rounded hover:bg-opacity-80 text-sm"
          >
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LogFilters;
