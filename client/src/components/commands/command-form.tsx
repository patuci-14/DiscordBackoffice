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

// Define the structure for slash command options
interface CommandOption {
  name: string;
  description: string;
  type: 'STRING' | 'INTEGER' | 'BOOLEAN' | 'USER' | 'CHANNEL' | 'ROLE';
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
  const [type, setType] = useState<'text' | 'slash' | 'embed'>('text');
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
  
  // Adicionar botId do localStorage (ou contexto)
  const botId = localStorage.getItem('botId') || '';
  
  // Initialize form with command data if provided
  useEffect(() => {
    if (command) {
      setName(command.name || '');
      setType(command.type as 'text' | 'slash' | 'embed');
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
    }
  }, [command]);
  
  // Create command mutation
  const createCommandMutation = useMutation({
    mutationFn: (newCommand: InsertCommand) => createCommand(newCommand),
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
    mutationFn: ({ id, update }: { id: number, update: Partial<Command> }) => updateCommand(id, update),
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
    
    const commandData: InsertCommand = {
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
      options: type === 'slash' && options.length > 0 ? options : []
    };
    
    if (isEditing && command && 'id' in command) {
      updateCommandMutation.mutate({ id: command.id, update: commandData });
    } else {
      createCommandMutation.mutate(commandData);
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
      <h3 className="font-bold mb-4">{isEditing ? 'Edit Command' : 'Create New Command'}</h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <Label className="block text-discord-text-secondary text-sm mb-1">Command Name</Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-discord-bg-tertiary border border-r-0 border-gray-700 rounded-l text-discord-text-secondary">
                {type === 'slash' ? '/' : '!'}
              </span>
              <Input
                type="text"
                placeholder="command"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded-r"
              />
            </div>
          </div>
          
          <div>
            <Label className="block text-discord-text-secondary text-sm mb-1">Command Type</Label>
            <Select value={type} onValueChange={(value: 'text' | 'slash' | 'embed') => setType(value)}>
              <SelectTrigger className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded">
                <SelectValue placeholder="Select command type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Command</SelectItem>
                <SelectItem value="slash">Slash Command</SelectItem>
                <SelectItem value="embed">Embed Message</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="mb-6">
          <Label className="block text-discord-text-secondary text-sm mb-1">Description {type === 'slash' && <span className="text-discord-blurple">*</span>}</Label>
          <Input
            type="text"
            placeholder="Brief description of what this command does..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded"
          />
          <p className="text-xs text-discord-text-secondary mt-1">
            {type === 'slash' ? 'Required for slash commands. This will be shown in Discord when users type "/" and see available commands.' : 'Optional description for documentation purposes.'}
          </p>
        </div>
        
        <div className="mb-6">
          <Label className="block text-discord-text-secondary text-sm mb-1">Response</Label>
          <Textarea
            rows={4}
            placeholder="Enter the response message for this command..."
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded"
          />
          <p className="text-xs text-discord-text-secondary mt-1">You can use {'{user}'} for the user's name, {'{server}'} for the server name.</p>
        </div>
        
        <div className="mb-6">
          <Label className="block text-discord-text-secondary text-sm mb-1">Webhook URL (Optional)</Label>
          <Input
            type="text"
            placeholder="https://your-webhook-url.com/path"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded"
          />
          <p className="text-xs text-discord-text-secondary mt-1">When this command is used, a webhook request will be sent to this URL.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <Label className="block text-discord-text-secondary text-sm mb-1">Required Permission</Label>
            <Select value={requiredPermission} onValueChange={(value: 'everyone' | 'moderator' | 'admin' | 'server-owner') => setRequiredPermission(value)}>
              <SelectTrigger className="w-full px-3 py-2 bg-discord-bg-tertiary border border-gray-700 rounded">
                <SelectValue placeholder="Select required permission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="server-owner">Server Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="block text-discord-text-secondary text-sm mb-1">Cooldown (seconds)</Label>
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
          <Label className="block text-discord-text-secondary text-sm mb-3">Command Options</Label>
          
          <div className="space-y-3">
            <ToggleSwitch
              checked={enabledForAllServers}
              onChange={setEnabledForAllServers}
              label="Enable for all servers"
            />
            
            <ToggleSwitch
              checked={deleteUserMessage}
              onChange={setDeleteUserMessage}
              label="Delete user's message after command"
            />
            
            <ToggleSwitch
              checked={logUsage}
              onChange={setLogUsage}
              label="Log command usage"
            />
            
            <ToggleSwitch
              checked={active}
              onChange={setActive}
              label="Command active"
            />
          </div>
        </div>
        
        {type === 'slash' && (
          <div className="mb-6 border border-gray-700 rounded-md p-4 bg-discord-bg-secondary">
            <div className="flex justify-between items-center mb-3">
              <Label className="text-discord-text-secondary text-sm font-medium">
                Slash Command Parameters
              </Label>
              
              <Button
                type="button"
                onClick={() => setShowOptionsPanel(!showOptionsPanel)}
                className="text-xs py-1 px-2 bg-discord-bg-tertiary text-discord-text hover:bg-opacity-80"
              >
                {showOptionsPanel ? 'Hide Options' : 'Show Options'}
              </Button>
            </div>
            
            {showOptionsPanel && (
              <div className="space-y-4">
                <p className="text-xs text-discord-text-secondary">
                  Define parameters that users will provide when using this slash command. 
                  These will appear as options in Discord when users type the command.
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
                  + Add Parameter
                </Button>
              </div>
            )}
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
              Delete
            </Button>
          )}
          
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-discord-bg-tertiary text-discord-text-secondary rounded hover:bg-opacity-80"
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            disabled={isProcessing}
            className="px-4 py-2 bg-discord-blurple text-white rounded hover:bg-opacity-80"
          >
            {isProcessing && <i className="fas fa-circle-notch spin mr-2"></i>}
            {isEditing ? 'Update' : 'Create'} Command
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
          Remove
        </Button>
      </div>
      
      {/* Rest of the parameter form fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="block text-discord-text-secondary text-xs mb-1">Name</Label>
          <Input
            value={option.name}
            onChange={(e) => updateOption(index, 'name', e.target.value)}
            placeholder="parameter_name"
            className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded"
          />
        </div>
        
        <div>
          <Label className="block text-discord-text-secondary text-xs mb-1">Type</Label>
          <Select value={option.type} onValueChange={(value) => updateOption(index, 'type', value)}>
            <SelectTrigger className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STRING">String</SelectItem>
              <SelectItem value="INTEGER">Integer</SelectItem>
              <SelectItem value="BOOLEAN">Boolean</SelectItem>
              <SelectItem value="USER">User</SelectItem>
              <SelectItem value="CHANNEL">Channel</SelectItem>
              <SelectItem value="ROLE">Role</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label className="block text-discord-text-secondary text-xs mb-1">Description</Label>
        <Input
          value={option.description}
          onChange={(e) => updateOption(index, 'description', e.target.value)}
          placeholder="What this parameter does..."
          className="w-full text-sm px-2 py-1 bg-discord-bg-tertiary border border-gray-700 rounded"
        />
      </div>
      
      <div>
        <ToggleSwitch
          checked={option.required}
          onChange={(checked) => updateOption(index, 'required', checked)}
          label="Required parameter (affects the Discord command UI)"
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
          label="Ativar autocomplete para este parâmetro"
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
              <Label className="block text-discord-text-secondary text-xs mb-1">Body (JSON, para POST)</Label>
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
