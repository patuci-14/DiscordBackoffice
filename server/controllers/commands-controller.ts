import { Request, Response } from 'express';
import { storage } from '../storage';
import discordBot from '../discord-bot';
import { InsertCommand } from '@shared/schema';
import { z } from 'zod';

const commandValidator = z.object({
  name: z.string().min(1).max(32).transform(val => val.toLowerCase().trim()),
  type: z.enum(['text', 'slash', 'embed', 'context-menu', 'modal']),
  response: z.string().default(''),
  description: z.string().nullable().optional().transform(val => val === null || val === undefined ? null : val.trim() || null),
  webhookUrl: z.string().nullable().optional().or(z.literal('')),
  requiredPermission: z.enum(['everyone', 'moderator', 'admin', 'server-owner']),
  cooldown: z.number().int().min(0),
  enabledForAllServers: z.boolean(),
  deleteUserMessage: z.boolean(),
  logUsage: z.boolean(),
  active: z.boolean(),
  requireConfirmation: z.boolean().optional().default(false),
  confirmationMessage: z.string().nullable().optional(),
  cancelMessage: z.string().nullable().optional(),
  contextMenuType: z.enum(['message', 'user']).optional().nullable(),
  options: z.array(z.object({
    name: z.string().min(1).transform(val => val.toLowerCase().trim()),
    description: z.string().min(1),
    type: z.enum(['STRING', 'INTEGER', 'BOOLEAN', 'USER', 'CHANNEL', 'ROLE', 'ATTACHMENT']),
    required: z.boolean(),
    autocomplete: z.object({
      enabled: z.boolean(),
      service: z.string(),
      apiUrl: z.string().optional(),
      apiMethod: z.enum(['GET', 'POST']).optional(),
      apiHeaders: z.record(z.string()).optional(),
      apiBody: z.record(z.any()).optional(),
      parameters: z.record(z.any()).optional(),
      usePreviousParameters: z.boolean().optional(),
      filterByParameters: z.array(z.string()).optional()
    }).optional()
  })).optional().default([]),
  webhookFailureMessage: z.string().nullable().optional(),
  modalFields: z.object({
    customId: z.string().min(1).max(100),
    title: z.string().min(1).max(100),
    fields: z.array(z.object({
      customId: z.string().min(1).max(100),
      label: z.string().min(1).max(100),
      style: z.enum(['SHORT', 'PARAGRAPH']),
      placeholder: z.string().optional(),
      required: z.boolean().optional(),
      minLength: z.number().int().min(0).max(4000).optional(),
      maxLength: z.number().int().min(1).max(4000).optional(),
      value: z.string().optional()
    })).min(1).max(5)
  }).optional().nullable()
}).refine((data) => {
  // For slash commands, description is required
  if (data.type === 'slash') {
    const desc = data.description;
    if (!desc || (typeof desc === 'string' && desc.trim().length === 0)) {
      return false;
    }
  }
  return true;
}, {
  message: 'Descrição é obrigatória para comandos slash',
  path: ['description']
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
    
    console.log('=== CREATE COMMAND REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const validation = commandValidator.safeParse(req.body);
    
    if (!validation.success) {
      console.error('Validation failed:', JSON.stringify(validation.error.format(), null, 2));
      console.error('Validation errors:', validation.error.errors);
      
      // Criar mensagem de erro mais amigável
      const errorMessages: string[] = [];
      validation.error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (err.code === 'invalid_type') {
          errorMessages.push(`${path}: esperado ${err.expected}, recebido ${err.received}`);
        } else if (err.code === 'too_small') {
          errorMessages.push(`${path}: ${err.message}`);
        } else if (err.code === 'too_big') {
          errorMessages.push(`${path}: ${err.message}`);
        } else {
          errorMessages.push(`${path}: ${err.message}`);
        }
      });
      
      return res.status(400).json({ 
        success: false,
        error: 'Dados do comando inválidos',
        message: errorMessages.length > 0 
          ? `Erros encontrados: ${errorMessages.join('; ')}`
          : 'Verifique os campos obrigatórios e tente novamente.',
        details: validation.error.format()
      });
    }
    
    console.log('Validation successful, processed data:', JSON.stringify(validation.data, null, 2));
    
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
    
    console.log('=== UPDATE COMMAND REQUEST ===');
    console.log('Command ID:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Validate the update data
    const validation = commandValidator.safeParse(req.body);
    
    if (!validation.success) {
      console.error('Validation failed:', JSON.stringify(validation.error.format(), null, 2));
      console.error('Validation errors:', validation.error.errors);
      
      // Criar mensagem de erro mais amigável
      const errorMessages: string[] = [];
      validation.error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (err.code === 'invalid_type') {
          errorMessages.push(`${path}: esperado ${err.expected}, recebido ${err.received}`);
        } else if (err.code === 'too_small') {
          errorMessages.push(`${path}: ${err.message}`);
        } else if (err.code === 'too_big') {
          errorMessages.push(`${path}: ${err.message}`);
        } else {
          errorMessages.push(`${path}: ${err.message}`);
        }
      });
      
      return res.status(400).json({ 
        success: false,
        error: 'Dados do comando inválidos',
        message: errorMessages.length > 0 
          ? `Erros encontrados: ${errorMessages.join('; ')}`
          : 'Verifique os campos obrigatórios e tente novamente.',
        details: validation.error.format()
      });
    }
    
    console.log('Validation successful, processed data:', JSON.stringify(validation.data, null, 2));
    
    const updates = {
      ...validation.data,
      name: validation.data.name.toLowerCase(),
      contextMenuType: validation.data.type === 'context-menu' ? validation.data.contextMenuType : null
    };
    
    // Check if name is being changed and if it already exists
    if (updates.name && updates.name.toLowerCase() !== existingCommand.name.toLowerCase()) {
      const commandWithName = await storage.getCommandByName(existingCommand.botId, updates.name.toLowerCase());
      
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

export const reloadCommands = async (req: Request, res: Response) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }

    console.log('Forcing command reload via API...');
    const response = await discordBot.reloadCommands();
    
    return res.status(200).json({
      success: true,
      message: 'Commands reloaded successfully',
      commandsCount: Array.isArray(response) ? response.length : undefined,
      commands: Array.isArray(response) ? response : undefined
    });
  } catch (error) {
    console.error('Reload commands error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error reloading commands',
      details: error instanceof Error ? error.message : String(error)
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

export const getCommandsStats = async (req: Request, res: Response) => {
  try {
    const { botId } = req.query;
    if (!botId) {
      return res.status(400).json({ success: false, error: 'Missing botId' });
    }
    const count = await storage.getCommandsUsedLast24Hours(botId as string);
    return res.json({ count });
  } catch (error) {
    console.error('Error fetching command stats:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Validator for slash command import (simplified, without type field)
const slashCommandImportValidator = z.object({
  name: z.string().min(1).max(32).transform(val => val.toLowerCase().trim()),
  description: z.string().min(1).max(100),
  response: z.string().default(''),
  webhookUrl: z.string().nullable().optional().or(z.literal('')),
  webhookFailureMessage: z.string().nullable().optional(),
  requiredPermission: z.enum(['everyone', 'moderator', 'admin', 'server-owner']).default('everyone'),
  cooldown: z.number().int().min(0).default(0),
  enabledForAllServers: z.boolean().default(true),
  deleteUserMessage: z.boolean().default(false),
  logUsage: z.boolean().default(true),
  active: z.boolean().default(true),
  requireConfirmation: z.boolean().default(false),
  confirmationMessage: z.string().nullable().optional(),
  cancelMessage: z.string().nullable().optional(),
  options: z.array(z.object({
    name: z.string().min(1).transform(val => val.toLowerCase().trim()),
    description: z.string().min(1),
    type: z.enum(['STRING', 'INTEGER', 'BOOLEAN', 'USER', 'CHANNEL', 'ROLE', 'ATTACHMENT']),
    required: z.boolean().default(false),
    autocomplete: z.object({
      enabled: z.boolean(),
      service: z.string(),
      apiUrl: z.string().optional(),
      apiMethod: z.enum(['GET', 'POST']).optional(),
      apiHeaders: z.record(z.string()).optional(),
      apiBody: z.record(z.any()).optional(),
      usePreviousParameters: z.boolean().optional(),
      filterByParameters: z.array(z.string()).optional()
    }).optional()
  })).optional().default([])
});

const importRequestValidator = z.object({
  commands: z.array(slashCommandImportValidator).min(1),
  skipDuplicates: z.boolean().default(true),
  updateExisting: z.boolean().default(false)
});

interface ImportResult {
  success: boolean;
  name: string;
  error?: string;
  action?: 'created' | 'updated' | 'skipped';
}

export const importCommands = async (req: Request, res: Response) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }

    console.log('=== IMPORT COMMANDS REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Validate the import request
    const validation = importRequestValidator.safeParse(req.body);

    if (!validation.success) {
      console.error('Import validation failed:', JSON.stringify(validation.error.format(), null, 2));
      
      const errorMessages: string[] = [];
      validation.error.errors.forEach((err) => {
        const path = err.path.join('.');
        errorMessages.push(`${path}: ${err.message}`);
      });

      return res.status(400).json({
        success: false,
        error: 'Dados de importação inválidos',
        message: errorMessages.join('; '),
        details: validation.error.format()
      });
    }

    const { commands, skipDuplicates, updateExisting } = validation.data;
    const botId = discordBot.getUser()?.id || "unknown";
    const results: ImportResult[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each command
    for (const commandData of commands) {
      try {
        const commandName = commandData.name.toLowerCase();
        
        // Check if command already exists
        const existingCommand = await storage.getCommandByName(botId, commandName);

        if (existingCommand) {
          if (updateExisting) {
            // Update existing command
            const updateData = {
              ...commandData,
              type: 'slash' as const,
              botId,
              name: commandName
            };
            
            await storage.updateCommand(existingCommand.id, updateData);
            results.push({ success: true, name: commandName, action: 'updated' });
            updatedCount++;
          } else if (skipDuplicates) {
            // Skip duplicate
            results.push({ success: true, name: commandName, action: 'skipped' });
            skippedCount++;
          } else {
            // Error: duplicate found
            results.push({ 
              success: false, 
              name: commandName, 
              error: 'Comando com este nome já existe' 
            });
            errorCount++;
          }
        } else {
          // Create new command
          const newCommandData = {
            ...commandData,
            type: 'slash' as const,
            botId,
            name: commandName
          };

          const newCommand = await storage.createCommand(newCommandData);
          
          if (newCommand) {
            results.push({ success: true, name: commandName, action: 'created' });
            createdCount++;
          } else {
            results.push({ 
              success: false, 
              name: commandName, 
              error: 'Falha ao criar comando' 
            });
            errorCount++;
          }
        }
      } catch (cmdError) {
        console.error(`Error processing command ${commandData.name}:`, cmdError);
        results.push({ 
          success: false, 
          name: commandData.name, 
          error: cmdError instanceof Error ? cmdError.message : 'Erro desconhecido' 
        });
        errorCount++;
      }
    }

    // Reload bot commands if any were created or updated
    if (createdCount > 0 || updatedCount > 0) {
      await discordBot.reloadCommands();
    }

    const overallSuccess = errorCount === 0;

    return res.status(overallSuccess ? 200 : 207).json({
      success: overallSuccess,
      message: `Importação concluída: ${createdCount} criado(s), ${updatedCount} atualizado(s), ${skippedCount} ignorado(s), ${errorCount} erro(s)`,
      summary: {
        total: commands.length,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errorCount
      },
      results
    });

  } catch (error) {
    console.error('Import commands error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error importing commands',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};