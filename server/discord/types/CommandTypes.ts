import { ApplicationCommandOptionType, ActivityType } from 'discord.js';

// Define modal field interface
export interface ModalField {
  customId: string;
  label: string;
  style: 'SHORT' | 'PARAGRAPH';
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  value?: string;
}

export interface ModalConfig {
  customId: string;
  title: string;
  fields: ModalField[];
}

export interface AutocompleteConfig {
  enabled: boolean;
  service?: 'servers' | 'channels' | 'roles' | 'users';
  apiUrl?: string;
  apiMethod?: 'GET' | 'POST';
  apiHeaders?: Record<string, string>;
  apiBody?: Record<string, any>;
  usePreviousParameters?: boolean;
  filterByParameters?: string[];
}

export interface CommandOption {
  name: string;
  description?: string;
  type: string;
  required?: boolean;
  autocomplete?: AutocompleteConfig;
}

// Define all possible command types from the database
export type CommandType = 'slash' | 'text' | 'context-menu' | 'modal' | 'embed';

export interface Command {
  id: number;
  botId: string;
  name: string;
  description?: string;
  type: CommandType;
  contextMenuType?: 'user' | 'message';
  options?: CommandOption[] | Record<string, CommandOption>;
  response: string;
  active: boolean;
  requiredPermission: 'everyone' | 'moderator' | 'admin' | 'server-owner';
  deleteUserMessage?: boolean;
  logUsage?: boolean;
  webhookUrl?: string;
  webhookFailureMessage?: string;
  requireConfirmation?: boolean;
  confirmationMessage?: string;
  cancelMessage?: string;
  modalFields?: ModalConfig;
} 