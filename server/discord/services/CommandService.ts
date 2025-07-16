import { Client, Collection, REST, Routes, ApplicationCommandType } from 'discord.js';
import { storage } from '../../storage';
import { Command, CommandOption, CommandType } from '../types/CommandTypes';
import { getApplicationCommandOptionType } from '../utils/DiscordTypeUtils';

export class CommandService {
  /**
   * Load commands from the database
   */
  public static async loadCommands(client: Client): Promise<Collection<string, Command>> {
    try {
      console.log('Starting command loading process...');
      
      // Create a new collection for commands
      const commands = new Collection<string, Command>();
      
      // Load commands from database
      const botId = client.user?.id;
      if (!botId) {
        console.error('loadCommands: botId is undefined!');
        return commands;
      }
      
      console.log(`Fetching commands for botId: ${botId}`);
      const dbCommands = await storage.getCommands(botId);
      console.log(`Retrieved ${dbCommands.length} commands from database`);
      
      // Add commands to collection
      for (const command of dbCommands) {
        try {
          console.log(`Processing command: ${command.name}`);
          // Convert database command to our Command type
          const commandData: Command = {
            id: command.id,
            botId: command.botId,
            name: command.name,
            description: command.description || undefined,
            type: command.type as CommandType,
            contextMenuType: command.contextMenuType as 'user' | 'message' | undefined,
            options: command.options as CommandOption[] || undefined,
            response: command.response,
            active: command.active === false ? false : true, // Ensure it's a boolean
            requiredPermission: (command.requiredPermission as 'everyone' | 'moderator' | 'admin' | 'server-owner') || 'everyone',
            deleteUserMessage: command.deleteUserMessage || false,
            logUsage: command.logUsage || false,
            webhookUrl: command.webhookUrl || undefined,
            webhookFailureMessage: command.webhookFailureMessage || undefined,
            requireConfirmation: command.requireConfirmation || false,
            confirmationMessage: command.confirmationMessage || undefined,
            cancelMessage: command.cancelMessage || undefined,
            modalFields: command.modalFields || undefined
          };
          commands.set(command.name, commandData);
        } catch (error) {
          console.error(`Error processing command ${command.name}:`, error);
        }
      }
      
      console.log(`Successfully loaded ${commands.size} commands`);
      return commands;
    } catch (error) {
      console.error('Error in loadCommands:', error);
      throw error;
    }
  }
  
  /**
   * Register slash commands with Discord API
   */
  public static async registerSlashCommands(client: Client, commands: Collection<string, Command>, token: string): Promise<any> {
    if (!client.isReady() || !token) {
      console.log('Cannot register slash commands - bot is not ready or missing token');
      return;
    }
    
    try {
      console.log('Starting command registration...');
      
      const botConfig = await storage.getBotConfig(client.user?.id || 'unknown');
      if (!botConfig || !botConfig.useSlashCommands) {
        console.log('Slash commands are disabled in config.');
        return;
      }
      
      // Get all active commands
      const activeCommands = Array.from(commands.values()).filter(cmd => 
        cmd.active && (cmd.type === 'slash' || cmd.type === 'context-menu' || cmd.type === 'modal')
      );
      
      if (activeCommands.length === 0) {
        console.log('No active commands to register.');
        return;
      }
      
      console.log(`Found ${activeCommands.length} active commands to register.`);
      
      // Create the REST API instance
      const rest = new REST({ version: '10' }).setToken(token);
      
      // Format commands for registration
      const applicationCommands = activeCommands.map(cmd => {
        console.log(`\nPreparing command: "${cmd.name}"`);
        
        if (cmd.type === 'context-menu') {
          return {
            name: cmd.name.toLowerCase(),
            type: cmd.contextMenuType === 'message' ? 
              ApplicationCommandType.Message : 
              ApplicationCommandType.User
          };
        }
        
        const commandData: any = {
          name: cmd.name.toLowerCase(),
          description: cmd.description || `Run the ${cmd.name} command`,
          type: ApplicationCommandType.ChatInput,
        };
        
        // Add options if defined
        if (cmd.options && Array.isArray(cmd.options) && cmd.options.length > 0) {
          console.log(`Command "${cmd.name}" has ${cmd.options.length} options`);
          
          commandData.options = cmd.options.map(option => {
            const optionName = option.name.toLowerCase().replace(/\s+/g, '_');
            const isRequired = option.required === true;
            
            console.log(`Processing option "${optionName}":
  - type: ${option.type}
  - required: ${isRequired}
  - description: ${option.description || `Option for ${cmd.name}`}
  - autocomplete: ${option.autocomplete?.enabled ? 'enabled' : 'disabled'}`);
            
            return {
              name: optionName,
              description: option.description || `Option for ${cmd.name}`,
              type: getApplicationCommandOptionType(option.type.toUpperCase()),
              required: isRequired,
              autocomplete: option.autocomplete?.enabled || false
            };
          });
        }
        
        return commandData;
      });
      
      console.log(`\nRegistering ${applicationCommands.length} commands...`);
      
      if (client.user) {
        // Register commands globally
        const response = await rest.put(
          Routes.applicationCommands(client.user.id),
          { body: applicationCommands }
        );
        
        console.log('Successfully registered application commands:', response);
        return response;
      }
    } catch (error) {
      console.error('Error registering commands:', error);
      throw error;
    }
  }
} 