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
    active: true,
  };
  
  const createButton = (
    <Button
      onClick={handleCreateCommand}
      className="bg-discord-blurple hover:bg-opacity-80 px-4 py-2 rounded-md text-white text-sm flex items-center"
    >
      <i className="fas fa-plus mr-2"></i> Create Command
    </Button>
  );

  return (
    <AppShell title="Custom Commands" actions={createButton}>
      {/* Command List */}
      <CommandList 
        isLoading={isLoading} 
        commands={data?.commands || []} 
        onEdit={handleEditCommand}
      />
      
      {/* Create/Edit Command Form */}
      {showCreateForm && (
        <Card className="bg-discord-bg-secondary rounded-lg p-4 shadow mt-6">
          <CommandForm 
            command={editingCommand !== null 
              ? data?.commands?.find(cmd => cmd.id === editingCommand) 
              : defaultCommand}
            isEditing={editingCommand !== null}
            onClose={handleFormClose}
          />
        </Card>
      )}
    </AppShell>
  );
};

export default Commands;
