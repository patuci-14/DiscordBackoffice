import { Request, Response } from 'express';
import { storage } from '../storage';
import discordBot from '../discord-bot';
import { InsertCommand } from '@shared/schema';
import { z } from 'zod';

const commandValidator = z.object({
  name: z.string().min(1).max(32).transform(val => val.toLowerCase()),
  type: z.enum(['text', 'slash', 'embed']),
  response: z.string().optional(),
  description: z.string().nullable().optional(),
  webhookUrl: z.string().nullable().optional().or(z.literal('')),
  requiredPermission: z.enum(['everyone', 'moderator', 'admin', 'server-owner']),
  cooldown: z.number().int().min(0),
  enabledForAllServers: z.boolean(),
  deleteUserMessage: z.boolean(),
  logUsage: z.boolean(),
  active: z.boolean(),
  requireConfirmation: z.boolean().optional(),
  confirmationMessage: z.string().nullable().optional(),
  cancelMessage: z.string().nullable().optional(),
  options: z.array(z.object({
    name: z.string().transform(val => val.toLowerCase()),
    description: z.string(),
    type: z.enum(['STRING', 'INTEGER', 'BOOLEAN', 'USER', 'CHANNEL', 'ROLE', 'ATTACHMENT']),
    required: z.boolean(),
    autocomplete: z.object({
      enabled: z.boolean(),
      service: z.string(),
      apiUrl: z.string().optional(),
      apiMethod: z.enum(['GET', 'POST']).optional(),
      apiHeaders: z.record(z.string()).optional(),
      apiBody: z.record(z.any()).optional(),
      parameters: z.record(z.any()).optional()
    }).optional()
  })).optional()
});

export const getCommands = async (req: Request, res: Response) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }

    const { botId } = req.query;
    if (!botId) {
      return res.status(400).json({ 
        success: false,
        error: 'Bot ID is required' 
      });
    }

    const commands = await storage.getCommands(botId as string);

    return res.status(200).json({
      success: true,
      commands
    });
  } catch (error) {
    console.error('Get commands error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error getting commands' 
    });
  }
};

export const getCommand = async (req: Request, res: Response) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }
    
    const { id } = req.params;
    const commandId = parseInt(id);
    
    if (isNaN(commandId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid command ID' 
      });
    }
    
    const command = await storage.getCommand(commandId);
    
    if (!command) {
      return res.status(404).json({ 
        success: false,
        error: 'Command not found' 
      });
    }
    
    return res.status(200).json({
      success: true,
      command
    });
  } catch (error) {
    console.error('Get command error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error getting command' 
    });
  }
};

export const createCommand = async (req: Request, res: Response) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }
    
    const validation = commandValidator.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid command data',
        details: validation.error.format()
      });
    }
    
    const commandData = {
      ...validation.data,
      botId: discordBot.getUser()?.id || "unknown",
      response: validation.data.response ?? '',
      name: validation.data.name.toLowerCase()
    };
    
    // Check if command already exists
    const existingCommand = await storage.getCommandByName(commandData.botId, commandData.name.toLowerCase());
    
    if (existingCommand) {
      return res.status(409).json({ 
        success: false,
        error: 'Command with this name already exists' 
      });
    }
    
    const newCommand = await storage.createCommand(commandData);
    console.log('Novo comando criado:', newCommand);
    
    if (!newCommand) {
      console.error('Falha ao criar comando:', commandData);
      return res.status(500).json({
        success: false,
        error: 'Failed to create command'
      });
    }
    
    // Reload the bot's commands
    await discordBot.reloadCommands();
    
    return res.status(201).json({
      success: true,
      command: newCommand
    });
  } catch (error) {
    console.error('Create command error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error creating command' 
    });
  }
};

export const updateCommand = async (req: Request, res: Response) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }
    
    const { id } = req.params;
    const commandId = parseInt(id);
    
    if (isNaN(commandId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid command ID' 
      });
    }
    
    // Get existing command
    const existingCommand = await storage.getCommand(commandId);
    
    if (!existingCommand) {
      return res.status(404).json({ 
        success: false,
        error: 'Command not found' 
      });
    }
    
    // Validate the update data
    const { 
      name, type, response, description, webhookUrl, requiredPermission, 
      cooldown, enabledForAllServers, deleteUserMessage, 
      logUsage, active, options, requireConfirmation, confirmationMessage, cancelMessage
    } = req.body;
    
    const updates: Partial<InsertCommand> = {};
    
    if (name !== undefined) updates.name = name.toLowerCase();
    if (type !== undefined) updates.type = type;
    if (response !== undefined) updates.response = response;
    if (description !== undefined) updates.description = description;
    if (webhookUrl !== undefined) updates.webhookUrl = webhookUrl;
    if (requiredPermission !== undefined) updates.requiredPermission = requiredPermission;
    if (cooldown !== undefined) updates.cooldown = cooldown;
    if (enabledForAllServers !== undefined) updates.enabledForAllServers = enabledForAllServers;
    if (deleteUserMessage !== undefined) updates.deleteUserMessage = deleteUserMessage;
    if (logUsage !== undefined) updates.logUsage = logUsage;
    if (active !== undefined) updates.active = active;
    if (requireConfirmation !== undefined) updates.requireConfirmation = requireConfirmation;
    if (confirmationMessage !== undefined) updates.confirmationMessage = confirmationMessage;
    if (cancelMessage !== undefined) updates.cancelMessage = cancelMessage;
    if (options !== undefined) {
      updates.options = options.map((option: { name: string; description: string; type: string; required: boolean }) => ({
        ...option,
        name: option.name.toLowerCase()
      }));
    }
    
    // Check if name is being changed and if it already exists
    if (name && name.toLowerCase() !== existingCommand.name.toLowerCase()) {
      const commandWithName = await storage.getCommandByName(existingCommand.botId, name.toLowerCase());
      
      if (commandWithName) {
        return res.status(409).json({ 
          success: false,
          error: 'Command with this name already exists' 
        });
      }
    }
    
    const updatedCommand = await storage.updateCommand(commandId, updates);
    
    // Reload the bot's commands
    await discordBot.reloadCommands();
    
    return res.status(200).json({
      success: true,
      command: updatedCommand
    });
  } catch (error) {
    console.error('Update command error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error updating command' 
    });
  }
};

export const deleteCommand = async (req: Request, res: Response) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }
    
    const { id } = req.params;
    const commandId = parseInt(id);
    
    console.log('Attempting to delete command with ID:', commandId);
    
    if (isNaN(commandId)) {
      console.log('Invalid command ID provided:', id);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid command ID' 
      });
    }
    
    // Verificar se o comando existe antes de tentar deletar
    const existingCommand = await storage.getCommand(commandId);
    if (!existingCommand) {
      console.log('Command not found with ID:', commandId);
      return res.status(404).json({ 
        success: false,
        error: 'Command not found' 
      });
    }
    
    console.log('Found command to delete:', existingCommand);
    
    const deleted = await storage.deleteCommand(commandId);
    console.log('Delete operation result:', deleted);
    
    if (!deleted) {
      console.log('Delete operation returned false for command ID:', commandId);
      return res.status(404).json({ 
        success: false,
        error: 'Command not found' 
      });
    }
    
    // Reload the bot's commands
    console.log('Reloading bot commands after deletion');
    await discordBot.reloadCommands();
    
    return res.status(200).json({
      success: true,
      message: 'Command deleted successfully'
    });
  } catch (error) {
    console.error('Delete command error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error deleting command' 
    });
  }
};
