import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppShell from '@/components/layout/app-shell';
import CommandList from '@/components/commands/command-list';
import CommandForm from '@/components/commands/command-form';
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
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from 'framer-motion';

const Commands: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCommand, setEditingCommand] = useState<number | null>(null);
  const { botInfo } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/commands', botInfo?.id],
    queryFn: () => getCommands(),
    retry: false,
    enabled: !!botInfo?.id // Só busca comandos quando há botId
  });

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
    <Button
      onClick={handleCreateCommand}
      className="bg-discord-blurple hover:bg-opacity-80 px-4 py-2 rounded-md text-white text-sm flex items-center"
      iconLeft="fas fa-plus"
      animationType="scale"
    >
      Criar Comando
    </Button>
  );

  return (
    <AppShell title="Comandos Personalizados" actions={createButton}>
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
    </AppShell>
  );
};

export default Commands;
