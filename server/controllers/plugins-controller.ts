import { Request, Response } from 'express';
import { storage } from '../storage';
import discordBot from '../discord-bot';
import { z } from 'zod';

const pluginValidator = z.object({
  name: z.string().min(1).max(64),
  version: z.string().min(1).max(16),
  description: z.string().optional(),
  author: z.string().optional(),
  enabled: z.boolean(),
  config: z.any().optional()
});

export const getPlugins = async (req: Request, res: Response) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }
    
    const plugins = await storage.getPlugins();
    
    return res.status(200).json({
      success: true,
      plugins
    });
  } catch (error) {
    console.error('Get plugins error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error getting plugins' 
    });
  }
};

export const getPlugin = async (req: Request, res: Response) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }
    
    const { id } = req.params;
    const pluginId = parseInt(id);
    
    if (isNaN(pluginId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid plugin ID' 
      });
    }
    
    const plugin = await storage.getPlugin(pluginId);
    
    if (!plugin) {
      return res.status(404).json({ 
        success: false,
        error: 'Plugin not found' 
      });
    }
    
    return res.status(200).json({
      success: true,
      plugin
    });
  } catch (error) {
    console.error('Get plugin error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error getting plugin' 
    });
  }
};

export const createPlugin = async (req: Request, res: Response) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }
    
    const validation = pluginValidator.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid plugin data',
        details: validation.error.format()
      });
    }
    
    const pluginData = validation.data;
    
    // Check if plugin already exists
    const existingPlugin = await storage.getPluginByName(pluginData.name);
    
    if (existingPlugin) {
      return res.status(409).json({ 
        success: false,
        error: 'Plugin with this name already exists' 
      });
    }
    
    const newPlugin = await storage.createPlugin(pluginData);
    
    return res.status(201).json({
      success: true,
      plugin: newPlugin
    });
  } catch (error) {
    console.error('Create plugin error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error creating plugin' 
    });
  }
};

export const updatePlugin = async (req: Request, res: Response) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }
    
    const { id } = req.params;
    const pluginId = parseInt(id);
    
    if (isNaN(pluginId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid plugin ID' 
      });
    }
    
    // Get existing plugin
    const existingPlugin = await storage.getPlugin(pluginId);
    
    if (!existingPlugin) {
      return res.status(404).json({ 
        success: false,
        error: 'Plugin not found' 
      });
    }
    
    // Validate the updates
    const { name, version, description, author, enabled, config } = req.body;
    
    const updates: any = {};
    
    if (name !== undefined) updates.name = name;
    if (version !== undefined) updates.version = version;
    if (description !== undefined) updates.description = description;
    if (author !== undefined) updates.author = author;
    if (enabled !== undefined) updates.enabled = enabled;
    if (config !== undefined) updates.config = config;
    
    // Check if name is being changed and if it already exists
    if (name && name !== existingPlugin.name) {
      const pluginWithName = await storage.getPluginByName(name);
      
      if (pluginWithName) {
        return res.status(409).json({ 
          success: false,
          error: 'Plugin with this name already exists' 
        });
      }
    }
    
    const updatedPlugin = await storage.updatePlugin(pluginId, updates);
    
    return res.status(200).json({
      success: true,
      plugin: updatedPlugin
    });
  } catch (error) {
    console.error('Update plugin error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error updating plugin' 
    });
  }
};

export const deletePlugin = async (req: Request, res: Response) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }
    
    const { id } = req.params;
    const pluginId = parseInt(id);
    
    if (isNaN(pluginId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid plugin ID' 
      });
    }
    
    const deleted = await storage.deletePlugin(pluginId);
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false,
        error: 'Plugin not found' 
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Plugin deleted successfully'
    });
  } catch (error) {
    console.error('Delete plugin error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error deleting plugin' 
    });
  }
};
