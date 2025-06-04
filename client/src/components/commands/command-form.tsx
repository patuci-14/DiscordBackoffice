import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ToggleSwitch from '@/components/ui/toggle-switch';
import { useToast } from '@/hooks/use-toast';
import { createCommand, updateCommand, deleteCommand } from '@/lib/discord-api';
import { queryClient } from '@/lib/queryClient';
import { Command, InsertCommand } from '@shared/schema';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Define custom types that include confirmation fields
type CommandWithConfirmation = Command & {
  requireConfirmation?: boolean | null;
  confirmationMessage?: string | null;
  cancelMessage?: string | null;
};

type InsertCommandWithConfirmation = InsertCommand & {
  requireConfirmation?: boolean | null;
  confirmationMessage?: string | null;
  cancelMessage?: string | null;
};

// Define the structure for slash command options
interface CommandOption {
  name: string;
  description: string;
  type: 'STRING' | 'INTEGER' | 'BOOLEAN' | 'USER' | 'CHANNEL' | 'ROLE' | 'ATTACHMENT';
  required: boolean;
  autocomplete?: {
    enabled: boolean;
    service: string;
    apiUrl?: string;
    apiMethod?: 'GET' | 'POST';
    apiHeaders?: Record<string, string>;
    apiBody?: Record<string, any>;
  };
}

interface CommandFormProps {
  command?: Command | InsertCommand;
  isEditing: boolean;
  onClose: () => void;
}

const CommandForm: React.FC<CommandFormProps> = ({ command, isEditing, onClose }) => {
  const { toast } = useToast();
  
  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'slash' | 'embed' | 'context-menu' | 'modal'>('text');
  const [description, setDescription] = useState('');
  const [response, setResponse] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [requiredPermission, setRequiredPermission] = useState<'everyone' | 'moderator' | 'admin' | 'server-owner'>('everyone');
  const [cooldown, setCooldown] = useState(3);
  const [enabledForAllServers, setEnabledForAllServers] = useState(true);
  const [deleteUserMessage, setDeleteUserMessage] = useState(false);
  const [logUsage, setLogUsage] = useState(true);
  const [active, setActive] = useState(true);
  const [options, setOptions] = useState<CommandOption[]>([]);
  const [showOptionsPanel, setShowOptionsPanel] = useState(false);
  const [contextMenuType, setContextMenuType] = useState<'message' | 'user'>('message');
  
  // Add confirmation settings
  const [requireConfirmation, setRequireConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('Are you sure you want to proceed with this action?');
  const [cancelMessage, setCancelMessage] = useState('Action cancelled.');
  
  // Add state for webhookFailureMessage
  const [webhookFailureMessage, setWebhookFailureMessage] = useState('');
  
  // Add modal fields
  const [modalFields, setModalFields] = useState<{
    customId: string;
    title: string;
    fields: Array<{
      customId: string;
      label: string;
      style: 'SHORT' | 'PARAGRAPH';
      placeholder?: string;
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      value?: string;
    }>;
  }>({
    customId: '',
    title: '',
    fields: []
  });
  
  // Adicionar botId do localStorage (ou contexto)
  const botId = localStorage.getItem('botId') || '';
  
  // Initialize form with command data if provided
  useEffect(() => {
    if (command) {
      setName(command.name || '');
      setType(command.type as 'text' | 'slash' | 'embed' | 'context-menu' | 'modal');
      setDescription(command.description || '');
      setResponse(command.response || '');
      setWebhookUrl(command.webhookUrl || '');
      setRequiredPermission(command.requiredPermission as 'everyone' | 'moderator' | 'admin' | 'server-owner');
      setCooldown(command.cooldown || 3);
      setEnabledForAllServers(command.enabledForAllServers || true);
      setDeleteUserMessage(command.deleteUserMessage || false);
      setLogUsage(command.logUsage || true);
      setActive(command.active || true);
      
      // Set options if available
      if ('options' in command && command.options) {
        setOptions(command.options as CommandOption[]);
        if (Array.isArray(command.options) && command.options.length > 0) {
          setShowOptionsPanel(true);
        }
      }
      
      // Set confirmation settings if available
      if ('requireConfirmation' in command) {
        setRequireConfirmation(Boolean(command.requireConfirmation));
        if (command.confirmationMessage) {
          setConfirmationMessage(command.confirmationMessage);
        }
        if (command.cancelMessage) {
          setCancelMessage(command.cancelMessage);
        }
      }
      
      // Initialize webhookFailureMessage if editing
      if ('webhookFailureMessage' in command && command.webhookFailureMessage) {
        setWebhookFailureMessage(command.webhookFailureMessage);
      }
      
      // Initialize modal fields if available
      if ('modalFields' in command && command.modalFields) {
        setModalFields(command.modalFields);
      }
    }
  }, [command]);
  
  // Create command mutation
  const createCommandMutation = useMutation({
    mutationFn: (newCommand: InsertCommandWithConfirmation) => createCommand(newCommand as any),
    onSuccess: () => {
      toast({
        title: 'Command Created',
        description: 'New command has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/commands'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: error.message || 'Failed to create command. It may already exist.',
      });
    }
  });
  
  // Update command mutation
  const updateCommandMutation = useMutation({
    mutationFn: ({ id, update }: { id: number, update: Partial<CommandWithConfirmation> }) => updateCommand(id, update as any),
    onSuccess: () => {
      toast({
        title: 'Command Updated',
        description: 'Command has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/commands'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Failed to update command.',
      });
    }
  });
  
  // Delete command mutation
  const deleteCommandMutation = useMutation({
    mutationFn: (id: number) => deleteCommand(id),
    onSuccess: () => {
      toast({
        title: 'Command Deleted',
        description: 'Command has been deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/commands'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: error.message || 'Failed to delete command.',
      });
    }
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!name.trim() || !response.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Command name and response are required.',
      });
      return;
    }
    
    // For slash commands, description is required
    if (type === 'slash' && !description.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Description is required for slash commands.',
      });
      return;
    }
    
    // Validate webhook URL if provided
    if (webhookUrl && !webhookUrl.trim().match(/^https?:\/\/.+/i)) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Webhook URL must be a valid HTTP or HTTPS URL.',
      });
      return;
    }
    
    // Create the command data with type assertion to include confirmation fields
    const commandData = {
      botId,
      name,
      type,
      description,
      response,
      webhookUrl: webhookUrl.trim() || null,
      requiredPermission,
      cooldown,
      enabledForAllServers,
      deleteUserMessage,
      logUsage,
      active,
      options: type === 'slash' && options.length > 0 ? options : [],
      requireConfirmation,
      confirmationMessage: requireConfirmation ? confirmationMessage : null,
      cancelMessage: requireConfirmation ? cancelMessage : null,
      contextMenuType: type === 'context-menu' ? contextMenuType : undefined,
      webhookFailureMessage: webhookFailureMessage || null,
      modalFields: type === 'modal' ? modalFields : undefined,
    };
    
    if (isEditing && command && 'id' in command) {
      updateCommandMutation.mutate({ id: command.id, update: commandData as any });
    } else {
      createCommandMutation.mutate(commandData as any);
    }
  };
  
  // Handle command deletion
  const handleDelete = () => {
    if (isEditing && command && 'id' in command) {
      if (window.confirm('Are you sure you want to delete this command?')) {
        deleteCommandMutation.mutate(command.id);
      }
    }
  };
  
  const isProcessing = createCommandMutation.isPending || updateCommandMutation.isPending || deleteCommandMutation.isPending;
  
  // Functions to handle slash command options
  const addOption = () => {
    setOptions([
      ...options,
      {
        name: '',
        description: '',
        type: 'STRING',
        required: false
      }
    ]);
  };

  const removeOption = (index: number) => {
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const updateOption = (index: number, field: keyof CommandOption, value: any) => {
    const newOptions = [...options];
    newOptions[index] = {
      ...newOptions[index],
      [field]: value
    };
    setOptions(newOptions);
  };

  // Add modal field functions
  const addModalField = () => {
    setModalFields(prev => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          customId: '',
          label: '',
          style: 'SHORT',
          required: false
        }
      ]
    }));
  };

  const removeModalField = (index: number) => {
    setModalFields(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
  };

  const updateModalField = (index: number, field: string, value: any) => {
    setModalFields(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => 
        i === index ? { ...f, [field]: value } : f
      )
    }));
  };

  // Inside the CommandForm component, add the sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Add handleDragEnd function
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setOptions((items) => {
        const oldIndex = items.findIndex((_, i) => i === active.id);
        const newIndex = items.findIndex((_, i) => i === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div>
      <h3 className="font-bold mb-4">{isEditing ? 'Editar Comando' : 'Criar Novo Comando'}</h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <Label className="block text-discord-text-secondary text-sm mb-1">Nome do Comando</Label>
            <Input
              type="text"
              placeholder="nome-do-comando"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded"
            />
            <p className="text-xs text-discord-text-secondary mt-1">
              {type === 'text' ? 'Use ! antes do nome para executar o comando (ex: !nome-do-comando)' : 
               type === 'modal' ? 'Use / antes do nome para executar o comando (ex: /nome-do-comando)' :
               'Use / antes do nome para executar o comando (ex: /nome-do-comando)'}
            </p>
          </div>
          
          <div>
            <Label className="block text-discord-text-secondary text-sm mb-1">Tipo de Comando</Label>
            <Select value={type} onValueChange={(value: 'text' | 'slash' | 'embed' | 'context-menu' | 'modal') => setType(value)}>
              <SelectTrigger className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded">
                <SelectValue placeholder="Select command type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Comando de Texto</SelectItem>
                <SelectItem value="slash">Comando de Slash</SelectItem>
                <SelectItem value="embed">Mensagem de Embed</SelectItem>
                <SelectItem value="context-menu">Comando de Menu de Contexto</SelectItem>
                <SelectItem value="modal">Modal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="mb-6">
          <Label className="block text-discord-text-secondary text-sm mb-1">Descrição {type === 'slash' && <span className="text-discord-blurple">*</span>}</Label>
          <Input
            type="text"
            placeholder="Descrição breve do que o comando faz..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded"
          />
          <p className="text-xs text-discord-text-secondary mt-1">
            {type === 'slash' ? 'Obrigatório para comandos de slash. Isso será mostrado no Discord quando os usuários digitarem "/" e verem os comandos disponíveis.' : 'Descrição opcional para fins de documentação.'}
          </p>
        </div>
        
        {type === 'context-menu' && (
          <div className="mb-6">
            <Label className="block text-discord-text-secondary text-sm mb-1">Tipo de Menu de Contexto</Label>
            <Select value={contextMenuType} onValueChange={(value: 'message' | 'user') => setContextMenuType(value)}>
              <SelectTrigger className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded">
                <SelectValue placeholder="Selecione o tipo de menu de contexto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="message">Menu de Contexto de Mensagem</SelectItem>
                <SelectItem value="user">Menu de Contexto de Usuário</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-discord-text-secondary mt-1">
              O menu de contexto de mensagem aparece quando você clica com o botão direito em uma mensagem.
              O menu de contexto de usuário aparece quando você clica com o botão direito em um usuário.
            </p>
          </div>
        )}
        
        <div className="mb-6">
          <Label className="block text-discord-text-secondary text-sm mb-1">Resposta</Label>
          <Textarea
            rows={4}
            placeholder="Digite a mensagem de resposta para este comando..."
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded"
          />
          <p className="text-xs text-discord-text-secondary mt-1">
            Você pode usar {'{user}'} para o nome do usuário, {'{server}'} para o nome do servidor.
            {type === 'context-menu' && (
              <>
                <br />
                Para comandos de menu de contexto, você também pode usar {'{target}'} para o nome do usuário ou mensagem alvo.
              </>
            )}
          </p>
        </div>
        
        <div className="mb-6">
          <Label className="block text-discord-text-secondary text-sm mb-1">URL do Webhook (Opcional)</Label>
          <Input
            type="text"
            placeholder="https://seu-webhook-url.com/caminho"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded"
          />
          <p className="text-xs text-discord-text-secondary mt-1">Quando este comando é usado, uma solicitação de webhook será enviada para esta URL.</p>
        </div>
        
        <div className="mb-6">
          <Label className="block text-discord-text-secondary text-sm mb-1">Mensagem de falha do Webhook (Opcional)</Label>
          <Textarea
            rows={2}
            placeholder="Mensagem a ser exibida ao usuário caso a chamada do webhook falhe."
            value={webhookFailureMessage}
            onChange={(e) => setWebhookFailureMessage(e.target.value)}
            className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded"
          />
          <p className="text-xs text-discord-text-secondary mt-1">Se preenchido, esta mensagem será enviada ao usuário caso o webhook retorne erro ou esteja fora do ar.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <Label className="block text-discord-text-secondary text-sm mb-1">Permissão Requerida</Label>
            <Select value={requiredPermission} onValueChange={(value: 'everyone' | 'moderator' | 'admin' | 'server-owner') => setRequiredPermission(value)}>
              <SelectTrigger className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded">
                <SelectValue placeholder="Selecione a permissão requerida" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Todos</SelectItem>
                <SelectItem value="moderator">Moderador</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="server-owner">Proprietário do Servidor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="block text-discord-text-secondary text-sm mb-1">Cooldown (segundos)</Label>
            <Input
              type="number"
              placeholder="0"
              min="0"
              value={cooldown}
              onChange={(e) => setCooldown(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded"
            />
          </div>
        </div>
        
        <div className="mb-6">
          <Label className="block text-discord-text-secondary text-sm mb-3">Opções do Comando</Label>
          
          <div className="space-y-3">
            <ToggleSwitch
              checked={enabledForAllServers}
              onChange={setEnabledForAllServers}
              label="Ativar para todos os servidores"
            />
            
            <ToggleSwitch
              checked={deleteUserMessage}
              onChange={setDeleteUserMessage}
              label="Excluir mensagem do usuário após o comando"
            />
            
            <ToggleSwitch
              checked={logUsage}
              onChange={setLogUsage}
              label="Registrar logs quando o comando é usado"
            />
            
            <ToggleSwitch
              checked={active}
              onChange={setActive}
              label="Comando ativo"
            />
            
            {/* Add confirmation toggle and settings */}
            <div className="pt-2 border-t border-gray-700">
              <ToggleSwitch
                checked={requireConfirmation}
                onChange={(checked) => {
                  setRequireConfirmation(checked);
                }}
                label="Requer confirmação antes de executar o comando"
              />
              
              {requireConfirmation && (
                <div className="mt-3 ml-6 space-y-3">
                  <div>
                    <Label className="block text-discord-text-secondary text-xs mb-1">Mensagem de Confirmação</Label>
                    <Textarea
                      value={confirmationMessage}
                      onChange={(e) => setConfirmationMessage(e.target.value)}
                      placeholder="Tem certeza que deseja prosseguir com esta ação?"
                      className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded"
                      rows={3}
                    />
                    <p className="text-xs text-discord-text-secondary mt-1">
                      Você pode usar {'{user}'} para o nome do usuário, {'{server}'} para o nome do servidor e {'{params}'} para incluir todos os parâmetros do comando.
                      <br />
                      Para parâmetros específicos, use {'{param:name}'} onde "name" é o nome do parâmetro.
                      <br />
                      Para anexos de arquivo, você pode usar {'{param:file.name}'}, {'{param:file.extension}'}, {'{param:file.url}'} e {'{param:file.size}'}.
                    </p>
                  </div>
                  <div>
                    <Label className="block text-discord-text-secondary text-xs mb-1">Mensagem de Cancelamento</Label>
                    <Input
                      value={cancelMessage}
                      onChange={(e) => setCancelMessage(e.target.value)}
                      placeholder="Ação cancelada."
                      className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {type === 'slash' && (
          <div className="mb-6 border border-gray-700 rounded-md p-4 bg-discord-bg-secondary">
            <div className="flex justify-between items-center mb-3">
              <Label className="text-discord-text-secondary text-sm font-medium">
                Parâmetros do Comando em Barra (Slash)
              </Label>
              
              <Button
                type="button"
                onClick={() => setShowOptionsPanel(!showOptionsPanel)}
                className="text-xs py-1 px-2 bg-discord-bg-tertiary text-discord-text hover:bg-opacity-80"
              >
                {showOptionsPanel ? 'Ocultar Opções' : 'Mostrar Opções'}
              </Button>
            </div>
            
            {showOptionsPanel && (
              <div className="space-y-4">
                <p className="text-xs text-discord-text-secondary">
                  Define parâmetros que os usuários fornecerão ao usar este comando em barra (slash). 
                  Eles aparecerão como opções no Discord quando os usuários digitarem o comando.
                </p>
                
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={options.map((_, index) => index)}
                    strategy={verticalListSortingStrategy}
                  >
                    {options.map((option, index) => (
                      <SortableParameter
                        key={index}
                        option={option}
                        index={index}
                        updateOption={updateOption}
                        removeOption={removeOption}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                
                <Button
                  type="button"
                  onClick={addOption}
                  className="w-full py-2 mt-2 border border-dashed border-discord-blurple bg-discord-bg-secondary text-discord-blurple hover:bg-discord-blurple hover:bg-opacity-10"
                >
                  + Adicionar Parâmetro
                </Button>
              </div>
            )}
          </div>
        )}
        
        {type === 'modal' && (
          <div className="mb-6 border border-gray-700 rounded-md p-4 bg-discord-bg-secondary">
            <div className="flex justify-between items-center mb-3">
              <Label className="text-discord-text-secondary text-sm font-medium">
                Configuração do Modal
              </Label>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="block text-discord-text-secondary text-xs mb-1">ID do Modal</Label>
                <Input
                  value={modalFields.customId}
                  onChange={(e) => setModalFields(prev => ({ ...prev, customId: e.target.value }))}
                  placeholder="modal_id"
                  className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded"
                />
                <p className="text-xs text-discord-text-secondary mt-1">
                  ID único para identificar este modal. Use apenas letras minúsculas, números e underscores.
                </p>
              </div>
              
              <div>
                <Label className="block text-discord-text-secondary text-xs mb-1">Título do Modal</Label>
                <Input
                  value={modalFields.title}
                  onChange={(e) => setModalFields(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título do Modal"
                  className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-discord-text-secondary text-sm">Campos do Modal</Label>
                  <Button
                    type="button"
                    onClick={addModalField}
                    className="text-xs py-1 px-2 bg-discord-bg-tertiary text-discord-text hover:bg-opacity-80"
                  >
                    + Adicionar Campo
                  </Button>
                </div>
                
                {modalFields.fields.map((field, index) => (
                  <div key={index} className="border border-gray-700 rounded p-3 space-y-3">
                    <div className="flex justify-between">
                      <h4 className="text-sm font-medium text-discord-text">Campo #{index + 1}</h4>
                      <Button
                        type="button"
                        onClick={() => removeModalField(index)}
                        className="text-xs py-1 px-2 text-discord-red bg-transparent hover:bg-discord-red hover:bg-opacity-10"
                      >
                        Remover
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="block text-discord-text-secondary text-xs mb-1">ID do Campo</Label>
                        <Input
                          value={field.customId}
                          onChange={(e) => updateModalField(index, 'customId', e.target.value)}
                          placeholder="field_id"
                          className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded"
                        />
                      </div>
                      
                      <div>
                        <Label className="block text-discord-text-secondary text-xs mb-1">Estilo</Label>
                        <Select
                          value={field.style}
                          onValueChange={(value: 'SHORT' | 'PARAGRAPH') => updateModalField(index, 'style', value)}
                        >
                          <SelectTrigger className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded">
                            <SelectValue placeholder="Selecione o estilo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SHORT">Campo Curto</SelectItem>
                            <SelectItem value="PARAGRAPH">Campo Longo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="block text-discord-text-secondary text-xs mb-1">Rótulo</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateModalField(index, 'label', e.target.value)}
                        placeholder="Rótulo do campo"
                        className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded"
                      />
                    </div>
                    
                    <div>
                      <Label className="block text-discord-text-secondary text-xs mb-1">Placeholder</Label>
                      <Input
                        value={field.placeholder || ''}
                        onChange={(e) => updateModalField(index, 'placeholder', e.target.value)}
                        placeholder="Texto de exemplo"
                        className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="block text-discord-text-secondary text-xs mb-1">Tamanho Mínimo</Label>
                        <Input
                          type="number"
                          value={field.minLength || ''}
                          onChange={(e) => updateModalField(index, 'minLength', e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="0"
                          min="0"
                          className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded"
                        />
                      </div>
                      
                      <div>
                        <Label className="block text-discord-text-secondary text-xs mb-1">Tamanho Máximo</Label>
                        <Input
                          type="number"
                          value={field.maxLength || ''}
                          onChange={(e) => updateModalField(index, 'maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="4000"
                          min="1"
                          max="4000"
                          className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <ToggleSwitch
                        checked={field.required || false}
                        onChange={(checked) => updateModalField(index, 'required', checked)}
                        label="Campo obrigatório"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-3">
          {isEditing && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isProcessing}
              className="px-4 py-2 bg-discord-red text-white rounded hover:bg-opacity-80"
            >
              {deleteCommandMutation.isPending ? (
                <i className="fas fa-circle-notch spin mr-2"></i>
              ) : (
                <i className="fas fa-trash-alt mr-2"></i>
              )}
              Excluir
            </Button>
          )}
          
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-discord-bg-tertiary text-discord-text-secondary rounded hover:bg-opacity-80"
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            disabled={isProcessing}
            className="px-4 py-2 bg-discord-blurple text-white rounded hover:bg-opacity-80"
          >
            {isProcessing && <i className="fas fa-circle-notch spin mr-2"></i>}
            {isEditing ? 'Atualizar' : 'Criar'} Comando
          </Button>
        </div>
      </form>
    </div>
  );
};

// Add SortableParameter component
const SortableParameter = ({ option, index, updateOption, removeOption }: {
  option: CommandOption;
  index: number;
  updateOption: (index: number, field: keyof CommandOption, value: any) => void;
  removeOption: (index: number) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Move placeholders inside the component
  const headersPlaceholder = '{\n  "Authorization": "Bearer ..."\n}';
  const bodyPlaceholder = '{\n  "filtro": "valor"\n}';

  return (
    <div ref={setNodeRef} style={style} className="border border-gray-700 rounded p-3 space-y-3">
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab text-discord-text-secondary hover:text-discord-text"
            {...attributes}
            {...listeners}
          >
            <i className="fas fa-grip-vertical"></i>
          </button>
          <h4 className="text-sm font-medium text-discord-text">Parameter #{index + 1}</h4>
        </div>
        <Button
          type="button"
          onClick={() => removeOption(index)}
          className="text-xs py-1 px-2 text-discord-red bg-transparent hover:bg-discord-red hover:bg-opacity-10"
        >
          Remover
        </Button>
      </div>
      
      {/* Rest of the parameter form fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="block text-discord-text-secondary text-xs mb-1">Nome</Label>
          <Input
            value={option.name}
            onChange={(e) => updateOption(index, 'name', e.target.value)}
            placeholder="parameter_name"
            className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded"
          />
        </div>
        
        <div>
          <Label className="block text-discord-text-secondary text-xs mb-1">Tipo</Label>
          <Select value={option.type} onValueChange={(value) => updateOption(index, 'type', value)}>
            <SelectTrigger className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded">
            <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STRING">Texto</SelectItem>
              <SelectItem value="INTEGER">Inteiro</SelectItem>
              <SelectItem value="BOOLEAN">Booleano</SelectItem>
              <SelectItem value="USER">Usuário</SelectItem>
              <SelectItem value="CHANNEL">Canal</SelectItem>
              <SelectItem value="ROLE">Cargo</SelectItem>
              <SelectItem value="ATTACHMENT">Anexo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label className="block text-discord-text-secondary text-xs mb-1">Descrição</Label>
        <Input
          value={option.description}
          onChange={(e) => updateOption(index, 'description', e.target.value)}
          placeholder="O que este parâmetro faz..."
          className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded"
        />
      </div>
      
      <div>
        <ToggleSwitch
          checked={option.required}
          onChange={(checked) => updateOption(index, 'required', checked)}
          label="Parâmetro obrigatório (afeta a interface do Discord)"
        />
      </div>
      
      {/* Autocomplete config */}
      <div className="mt-2">
        <ToggleSwitch
          checked={option.autocomplete?.enabled || false}
          onChange={(checked) => {
            updateOption(index, 'autocomplete', {
              ...option.autocomplete,
              enabled: checked,
              service: checked ? (option.autocomplete?.service || '') : '',
              apiUrl: checked ? (option.autocomplete?.apiUrl || '') : '',
              apiMethod: checked ? (option.autocomplete?.apiMethod || 'GET') : 'GET',
              apiHeaders: checked ? (option.autocomplete?.apiHeaders || {}) : {},
              apiBody: checked ? (option.autocomplete?.apiBody || {}) : {},
            });
          }}
          label="Ativar autocompletar para este parâmetro"
        />
        {option.autocomplete?.enabled && (
          <div className="mt-6 space-y-2 border-discord-blurple">
            <div>
              <Label className="block text-discord-text-secondary text-xs mb-1">Serviço (Ex: servers, channels, roles, users, external)</Label>
              <Input
                value={option.autocomplete.service || ''}
                onChange={e => updateOption(index, 'autocomplete', {
                  ...option.autocomplete,
                  service: e.target.value
                })}
                placeholder="external"
                className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded"
              />
            </div>
            <div>
              <Label className="block text-discord-text-secondary text-xs mb-1">URL da API externa (opcional)</Label>
              <Input
                value={option.autocomplete.apiUrl || ''}
                onChange={e => updateOption(index, 'autocomplete', {
                  ...option.autocomplete,
                  apiUrl: e.target.value
                })}
                placeholder="https://sua-api.com/autocomplete"
                className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded"
              />
            </div>
            <div>
              <Label className="block text-discord-text-secondary text-xs mb-1">Método HTTP</Label>
              <Select value={option.autocomplete.apiMethod || 'GET'} onValueChange={value => updateOption(index, 'autocomplete', {
                ...option.autocomplete,
                apiMethod: value as 'GET' | 'POST'
              })}>
                <SelectTrigger className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded">
                  <SelectValue placeholder="GET" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="block text-discord-text-secondary text-xs mb-1">Headers (JSON)</Label>
              <Textarea
                value={JSON.stringify(option.autocomplete?.apiHeaders || {}, null, 2)}
                onChange={e => {
                  let val = {};
                  try { val = JSON.parse(e.target.value); } catch {}
                  updateOption(index, 'autocomplete', {
                    ...option.autocomplete,
                    apiHeaders: val
                  });
                }}
                placeholder={headersPlaceholder}
                className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded"
                rows={2}
              />
            </div>
            <div>
              <Label className="block text-discord-text-secondary text-xs mb-1">Corpo (JSON, para POST)</Label>
              <Textarea
                value={JSON.stringify(option.autocomplete?.apiBody || {}, null, 2)}
                onChange={e => {
                  let val = {};
                  try { val = JSON.parse(e.target.value); } catch {}
                  updateOption(index, 'autocomplete', {
                    ...option.autocomplete,
                    apiBody: val
                  });
                }}
                placeholder={bodyPlaceholder}
                className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded"
                rows={2}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommandForm;
