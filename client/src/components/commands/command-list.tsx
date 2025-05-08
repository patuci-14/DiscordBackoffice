import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Command } from '@shared/schema';

interface CommandListProps {
  commands: Command[];
  isLoading: boolean;
  onEdit: (id: number) => void;
}

const CommandList: React.FC<CommandListProps> = ({ commands, isLoading, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;
  
  // Filter commands based on search term and type
  const filteredCommands = commands.filter(command => {
    const matchesSearch = command.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || command.type === typeFilter;
    return matchesSearch && matchesType;
  });
  
  // Paginate commands
  const paginatedCommands = filteredCommands.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );
  
  // Determine max pages
  const maxPage = Math.max(0, Math.ceil(filteredCommands.length / itemsPerPage) - 1);
  
  // Get command type badge class
  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'text':
        return 'bg-discord-blurple bg-opacity-20 text-discord-blurple';
      case 'slash':
        return 'bg-discord-green bg-opacity-20 text-discord-green';
      case 'embed':
        return 'bg-discord-yellow bg-opacity-20 text-discord-yellow';
      default:
        return 'bg-discord-blurple bg-opacity-20 text-discord-blurple';
    }
  };

  return (
    <Card className="bg-discord-bg-secondary rounded-lg shadow mb-6">
      <CardHeader className="pb-0">
        <div className="flex flex-col md:flex-row justify-between mb-4">
          <div className="mb-4 md:mb-0">
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search commands..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(0); // Reset to first page on search
                  }}
                  className="w-full md:w-64 pl-10 pr-4 py-2 bg-discord-bg-tertiary border border-gray-700 rounded"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <i className="fas fa-search text-discord-text-secondary"></i>
                </div>
              </div>
              
              <Select 
                value={typeFilter} 
                onValueChange={(value) => {
                  setTypeFilter(value);
                  setCurrentPage(0); // Reset to first page on filter change
                }}
              >
                <SelectTrigger className="px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded w-full md:w-auto">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="text">Text Commands</SelectItem>
                  <SelectItem value="slash">Slash Commands</SelectItem>
                  <SelectItem value="embed">Embed Commands</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center text-discord-text-secondary text-sm">
            <span>Total: {filteredCommands.length} commands</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs text-discord-text-secondary">Command</th>
                <th className="px-4 py-2 text-left text-xs text-discord-text-secondary">Type</th>
                <th className="px-4 py-2 text-left text-xs text-discord-text-secondary">Response</th>
                <th className="px-4 py-2 text-left text-xs text-discord-text-secondary">Webhook</th>
                <th className="px-4 py-2 text-left text-xs text-discord-text-secondary">Permissions</th>
                <th className="px-4 py-2 text-left text-xs text-discord-text-secondary">Usage</th>
                <th className="px-4 py-2 text-left text-xs text-discord-text-secondary">Status</th>
                <th className="px-4 py-2 text-right text-xs text-discord-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-4 bg-discord-bg-tertiary rounded w-16"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-discord-bg-tertiary rounded w-12"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-discord-bg-tertiary rounded w-32"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-discord-bg-tertiary rounded w-20"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-discord-bg-tertiary rounded w-8"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-discord-bg-tertiary rounded w-16"></div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="h-4 bg-discord-bg-tertiary rounded w-12 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : paginatedCommands.length > 0 ? (
                paginatedCommands.map((command) => (
                  <tr key={command.id} className="hover:bg-discord-bg-tertiary">
                    <td className="px-4 py-3 text-sm font-medium">
                      {command.type === 'slash' ? '/' : '!'}{command.name}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 ${getTypeBadgeClass(command.type)} rounded text-xs`}>
                        {command.type.charAt(0).toUpperCase() + command.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm truncate max-w-[200px]">{command.response}</td>
                    <td className="px-4 py-3 text-sm">
                      {command.webhookUrl ? (
                        <span className="flex items-center">
                          <span className="h-2 w-2 rounded-full bg-discord-green mr-1"></span>
                          <span className="truncate max-w-[120px]" title={command.webhookUrl}>Configured</span>
                        </span>
                      ) : (
                        <span className="text-discord-text-secondary">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{command.requiredPermission}</td>
                    <td className="px-4 py-3 text-sm">{command.usageCount || 0}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="flex items-center">
                        <span className={`h-2 w-2 rounded-full ${command.active ? 'bg-discord-green' : 'bg-discord-red'} mr-1`}></span>
                        <span>{command.active ? 'Active' : 'Disabled'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <Button
                        variant="ghost"
                        onClick={() => onEdit(command.id)}
                        className="text-discord-text-secondary hover:text-white mx-1"
                      >
                        <i className="fas fa-edit"></i>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center text-discord-text-secondary">
                    {searchTerm || typeFilter !== 'all'
                      ? 'No commands match your search or filter'
                      : 'No commands found. Create your first command to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-discord-text-secondary">
            {filteredCommands.length > 0 && (
              <>Showing {paginatedCommands.length} of {filteredCommands.length} commands</>
            )}
          </div>
          <div className="flex space-x-2">
            <Button
              variant={currentPage === 0 ? "outline" : "secondary"}
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              className="px-3 py-1 rounded text-sm"
            >
              Previous
            </Button>
            <Button
              variant={currentPage >= maxPage ? "outline" : "default"}
              disabled={currentPage >= maxPage}
              onClick={() => setCurrentPage(Math.min(maxPage, currentPage + 1))}
              className={`px-3 py-1 rounded text-sm ${currentPage < maxPage ? 'bg-discord-blurple' : 'bg-discord-bg-tertiary text-discord-text-secondary'}`}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommandList;
