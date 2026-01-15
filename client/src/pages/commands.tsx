import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppShell from '@/components/layout/app-shell';
import CommandList from '@/components/commands/command-list';
import CommandForm from '@/components/commands/command-form';
import CommandImport from '@/components/commands/command-import';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getCommands } from '@/lib/discord-api';
import { InsertCommand } from '@shared/schema';
import { useAuth } from '@/components/auth/auth-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const Commands: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingCommand, setEditingCommand] = useState<number | null>(null);
  const { botInfo, checkStatus } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Usar o botId como parte da chave de consulta
  const botId = botInfo?.id || sessionStorage.getItem('botId') || localStorage.getItem('botId');
  
  const { data, isLoading, error, refetch, isError } = useQuery({
    queryKey: ['/api/commands', botId],
    queryFn: () => getCommands(),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    enabled: !!botId // Só busca comandos quando há botId
  });

  // Efeito para verificar o status de autenticação se ocorrer um erro
  useEffect(() => {
    if (isError) {
      console.error('Error loading commands:', error);
      // Verificar se o erro é de autenticação
      if (error instanceof Error && error.message.includes('401')) {
        console.log('Authentication error detected, checking status...');
        checkStatus();
      }
    }
  }, [isError, error, checkStatus]);

  const handleCreateCommand = () => {
    setEditingCommand(null);
    setShowCreateForm(true);
  };

  const handleEditCommand = (id: number) => {
    setEditingCommand(id);
    setShowCreateForm(true);
  };

  const handleFormClose = () => {
    setShowCreateForm(false);
    setEditingCommand(null);
  };

  const handleRefresh = async () => {
    try {
      toast({
        title: "Atualizando comandos",
        description: "Buscando dados mais recentes...",
      });
      
      await refetch();
      
      toast({
        title: "Comandos atualizados",
        description: "Lista de comandos atualizada com sucesso",
      });
    } catch (refreshError) {
      console.error('Error refreshing commands:', refreshError);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a lista de comandos",
        variant: "destructive",
      });
    }
  };

  // Convert command to export JSON format
  const commandToExportJson = (command: any) => {
    const exportData: any = {
      name: command.name,
      description: command.description || '',
      response: command.response,
    };

    if (command.webhookUrl) exportData.webhookUrl = command.webhookUrl;
    if (command.webhookFailureMessage) exportData.webhookFailureMessage = command.webhookFailureMessage;
    if (command.requiredPermission && command.requiredPermission !== 'everyone') {
      exportData.requiredPermission = command.requiredPermission;
    }
    if (command.cooldown && command.cooldown > 0) exportData.cooldown = command.cooldown;
    if (command.enabledForAllServers === false) exportData.enabledForAllServers = false;
    if (command.deleteUserMessage === true) exportData.deleteUserMessage = true;
    if (command.logUsage === false) exportData.logUsage = false;
    if (command.active === false) exportData.active = false;
    if (command.requireConfirmation === true) {
      exportData.requireConfirmation = true;
      if (command.confirmationMessage) exportData.confirmationMessage = command.confirmationMessage;
      if (command.cancelMessage) exportData.cancelMessage = command.cancelMessage;
    }
    
    if (command.options && Array.isArray(command.options) && command.options.length > 0) {
      exportData.options = command.options;
    }

    return exportData;
  };

  // Export all commands as JSON file
  const handleExportAll = () => {
    try {
      const commands = data?.commands || [];
      
      if (commands.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Nenhum comando',
          description: 'Não há comandos para exportar',
        });
        return;
      }

      const exportData = {
        commands: commands.map(commandToExportJson)
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `commands-export-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export concluído',
        description: `${commands.length} comando(s) exportado(s) com sucesso`,
      });
    } catch (error) {
      console.error('Export all error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao exportar',
        description: 'Não foi possível exportar os comandos',
      });
    }
  };

  const defaultCommand: InsertCommand = {
    botId: botInfo?.id || '',
    name: '',
    type: 'text',
    description: '',
    response: '',
    webhookUrl: '',
    requiredPermission: 'everyone',
    cooldown: 3,
    enabledForAllServers: true,
    deleteUserMessage: false,
    logUsage: true,
    active: true
  };
  
  const createButton = (
    <div className="flex space-x-2">
      <Button
        onClick={handleRefresh}
        className="bg-discord-bg-tertiary hover:bg-opacity-80 px-3 py-2 rounded-md text-white text-sm flex items-center"
        iconLeft="fas fa-sync-alt"
        animationType="scale"
      >
        Atualizar
      </Button>
      
      <Button
        onClick={() => setShowImportDialog(true)}
        className="bg-discord-bg-tertiary hover:bg-opacity-80 px-3 py-2 rounded-md text-white text-sm flex items-center"
        iconLeft="fas fa-file-import"
        animationType="scale"
      >
        Importar JSON
      </Button>
      
      <Button
        onClick={handleExportAll}
        disabled={!data?.commands || data.commands.length === 0}
        className="bg-discord-bg-tertiary hover:bg-opacity-80 px-3 py-2 rounded-md text-white text-sm flex items-center disabled:opacity-50"
        iconLeft="fas fa-file-export"
        animationType="scale"
      >
        Exportar Todos
      </Button>
      
      <Button
        onClick={handleCreateCommand}
        className="bg-discord-blurple hover:bg-opacity-80 px-4 py-2 rounded-md text-white text-sm flex items-center"
        iconLeft="fas fa-plus"
        animationType="scale"
      >
        Criar Comando
      </Button>
    </div>
  );

  return (
    <AppShell title="Comandos Personalizados" actions={createButton}>
      {/* Mostrar alerta de erro se houver problemas */}
      {isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Erro ao carregar comandos</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ocorreu um erro ao carregar os comandos.'}
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="mt-2"
              animationType="scale"
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Command List */}
      <CommandList 
        isLoading={isLoading} 
        commands={data?.commands || []} 
        onEdit={handleEditCommand}
      />
      
      {/* Create/Edit Command Form in Dialog */}
      <Dialog open={showCreateForm} onOpenChange={(open) => {
        if (!open) handleFormClose();
        else setShowCreateForm(true);
      }}>
        <DialogContent 
          className="bg-discord-bg-secondary border border-gray-700 max-w-4xl w-[95vw] md:w-[90vw] max-h-[85vh] md:max-h-[80vh] p-4 overflow-hidden"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">
              {editingCommand !== null ? 'Editar Comando' : 'Criar Novo Comando'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto pr-2 max-h-[calc(85vh-120px)] md:max-h-[calc(80vh-120px)] discord-scrollbar">
            <CommandForm 
              command={editingCommand !== null 
                ? data?.commands?.find(cmd => cmd.id === editingCommand) 
                : defaultCommand}
              isEditing={editingCommand !== null}
              onClose={handleFormClose}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Import Commands Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent 
          className="bg-discord-bg-secondary border border-gray-700 max-w-3xl w-[95vw] md:w-[90vw] max-h-[85vh] md:max-h-[80vh] p-4 overflow-hidden"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">
              Importar Comandos Slash via JSON
            </DialogTitle>
            <DialogDescription className="text-discord-text-secondary">
              Cole ou faça upload de um arquivo JSON com os comandos slash que deseja importar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto pr-2 max-h-[calc(85vh-150px)] md:max-h-[calc(80vh-150px)] discord-scrollbar">
            <CommandImport onClose={() => setShowImportDialog(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default Commands;
