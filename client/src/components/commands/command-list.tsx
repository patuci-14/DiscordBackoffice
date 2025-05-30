import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Command } from '@shared/schema';
import { PaginationPageSize } from '@/components/ui/pagination';

interface CommandListProps {
  commands: Command[];
  isLoading: boolean;
  onEdit: (commandId: number) => void;
}

const CommandList: React.FC<CommandListProps> = ({ commands, isLoading, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  
  // Filter commands based on search term and type
  const filteredCommands = commands.filter(command => {
    const matchesSearch = command.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || command.type === typeFilter;
    return matchesSearch && matchesType;
  });
  
  // Paginate commands
  const paginatedCommands = filteredCommands.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );
  
  // Determine max pages
  const maxPage = Math.max(0, Math.ceil(filteredCommands.length / pageSize) - 1);
  
  // Get command type badge class
  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'text':
        return 'bg-blue-800 text-blue-100 text-sm font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300';
      case 'slash':
        return 'bg-green-800 text-green-100 text-sm font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300';
      case 'embed':
        return 'bg-yellow-800 text-yellow-100 text-sm font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-yellow-900 dark:text-yellow-300';
      case 'context-menu':
        return 'bg-purple-800 text-purple-100 text-sm font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-blue-800 text-blue-100 text-sm font-medium me-2 px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300';
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(0); // Reset to first page when changing page size
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
                  placeholder="Procurar comandos..."
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
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="text">Comandos de Texto</SelectItem>
                  <SelectItem value="slash">Comandos de Slash</SelectItem>
                  <SelectItem value="embed">Comandos de Embed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center text-discord-text-secondary text-sm">
            <span>Total: {filteredCommands.length} comandos</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-base text-discord-text-primary">Comando</th>
                <th className="px-4 py-2 text-left text-base text-discord-text-primary">Tipo</th>
                <th className="px-4 py-2 text-left text-base text-discord-text-primary">Descrição</th>
                <th className="px-4 py-2 text-left text-base text-discord-text-primary">Resposta</th>
                <th className="px-4 py-2 text-left text-base text-discord-text-primary">Possui Webhook</th>
                <th className="px-4 py-2 text-left text-base text-discord-text-primary">Permissões</th>
                <th className="px-4 py-2 text-left text-base text-discord-text-primary">Qtd. Execuções</th>
                <th className="px-4 py-2 text-left text-base text-discord-text-primary">Status</th>
                <th className="px-4 py-2 text-center text-base text-discord-text-primary">Configurações</th>
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
                      <div className="h-4 bg-discord-bg-tertiary rounded w-36"></div>
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
                      <span className={`px-8 py-1 ${getTypeBadgeClass(command.type)} rounded text-xs`}>
                        {command.type.charAt(0).toUpperCase() + command.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm truncate max-w-[200px]">
                      {command.description || (
                        <span className="text-discord-text-secondary italic">No description</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm truncate max-w-[200px]">{command.response}</td>
                    <td className="px-4 py-3 text-sm">
                      {command.webhookUrl ? (
                        <span className="flex items-center">
                          <span className="h-2 w-2 rounded-full bg-discord-green mr-1"></span>
                          <span className="truncate max-w-[120px]" title={command.webhookUrl}>Sim</span>
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <span className="h-2 w-2 rounded-full bg-discord-red mr-1"></span>
                          <span className="truncate max-w-[120px]">Não</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{command.requiredPermission}</td>
                    <td className="px-4 py-3 text-sm">{command.usageCount || 0}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="flex items-center">
                        <span className={`h-2 w-2 rounded-full ${command.active ? 'bg-discord-green' : 'bg-discord-red'} mr-1`}></span>
                        <span>{command.active ? 'Ativo' : 'Inativo'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
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
                  <td colSpan={9} className="px-4 py-4 text-center text-discord-text-secondary">
                    {searchTerm || typeFilter !== 'all'
                      ? 'Nenhum comando encontrado'
                      : 'Nenhum comando encontrado. Crie seu primeiro comando para começar.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <PaginationPageSize
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[5, 10, 25, 50]}
            />
            <div className="text-sm text-discord-text-secondary">
              {filteredCommands.length > 0 && (
                <>Mostrando {paginatedCommands.length} de {filteredCommands.length} comandos</>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant={currentPage === 0 ? "outline" : "secondary"}
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              className="px-3 py-1 rounded text-sm"
            >
              Anterior
            </Button>
            <Button
              variant={currentPage >= maxPage ? "outline" : "default"}
              disabled={currentPage >= maxPage}
              onClick={() => setCurrentPage(Math.min(maxPage, currentPage + 1))}
              className={`px-3 py-1 rounded text-sm ${currentPage < maxPage ? 'bg-discord-blurple' : 'bg-discord-bg-tertiary text-discord-text-secondary'}`}
            >
              Próximo
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommandList;
