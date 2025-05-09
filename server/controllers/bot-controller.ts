import { Request, Response } from 'express';
import { storage } from '../storage';
import discordBot from '../discord-bot';

export const getBotInfo = async (req: Request, res: Response) => {
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
    
    const botConfig = await storage.getBotConfig(botId as string);
    
    if (!botConfig) {
      return res.status(404).json({ 
        success: false,
        error: 'Bot configuration not found' 
      });
    }
    
    // Don't include the token in the response
    const { token, ...safeConfig } = botConfig;
    
    return res.status(200).json({
      success: true,
      config: safeConfig
    });
  } catch (error) {
    console.error('Get bot info error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error getting bot information' 
    });
  }
};

export const updateBotConfig = async (req: Request, res: Response) => {
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
    const { 
      prefix, status, activity, activityType, useSlashCommands,
      logCommandUsage, respondToMentions, deleteCommandMessages,
      enableWelcomeMessages, enableGoodbyeMessages, enableAutoRole,
      enableLogging, enableAntiSpam, enableAutoMod
    } = req.body;
    const updates: any = {};
    if (prefix !== undefined) updates.prefix = prefix;
    if (status !== undefined) updates.status = status;
    if (activity !== undefined) updates.activity = activity;
    if (activityType !== undefined) updates.activityType = activityType;
    if (useSlashCommands !== undefined) updates.useSlashCommands = useSlashCommands;
    if (logCommandUsage !== undefined) updates.logCommandUsage = logCommandUsage;
    if (respondToMentions !== undefined) updates.respondToMentions = respondToMentions;
    if (deleteCommandMessages !== undefined) updates.deleteCommandMessages = deleteCommandMessages;
    if (enableWelcomeMessages !== undefined) updates.enableWelcomeMessages = enableWelcomeMessages;
    if (enableGoodbyeMessages !== undefined) updates.enableGoodbyeMessages = enableGoodbyeMessages;
    if (enableAutoRole !== undefined) updates.enableAutoRole = enableAutoRole;
    if (enableLogging !== undefined) updates.enableLogging = enableLogging;
    if (enableAntiSpam !== undefined) updates.enableAntiSpam = enableAntiSpam;
    if (enableAutoMod !== undefined) updates.enableAutoMod = enableAutoMod;
    const updatedConfig = await storage.updateBotConfig(botId as string, updates);
    if (!updatedConfig) {
      return res.status(404).json({ 
        success: false,
        error: 'Bot configuration not found' 
      });
    }
    // Update bot status on Discord
    if (status || activity || activityType) {
      await discordBot.updateStatus(
        status || updatedConfig.status || 'online',
        activity || updatedConfig.activity,
        activityType || updatedConfig.activityType
      );
    }
    // Don't include the token in the response
    const { token, ...safeConfig } = updatedConfig;
    return res.status(200).json({
      success: true,
      config: safeConfig
    });
  } catch (error) {
    console.error('Update bot config error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error updating bot configuration' 
    });
  }
};

export const getServers = async (req: Request, res: Response) => {
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
    const servers = await storage.getServers(botId as string);
    return res.status(200).json({
      success: true,
      servers
    });
  } catch (error) {
    console.error('Get servers error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error getting servers' 
    });
  }
};

export const updateServer = async (req: Request, res: Response) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }
    
    const { id } = req.params;
    const { enabled } = req.body;
    
    if (enabled === undefined) {
      return res.status(400).json({ 
        success: false,
        error: 'No update parameters provided' 
      });
    }
    
    const serverId = parseInt(id);
    
    if (isNaN(serverId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid server ID' 
      });
    }
    
    const updatedServer = await storage.updateServer(serverId, { enabled });
    
    if (!updatedServer) {
      return res.status(404).json({ 
        success: false,
        error: 'Server not found' 
      });
    }
    
    return res.status(200).json({
      success: true,
      server: updatedServer
    });
  } catch (error) {
    console.error('Update server error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error updating server' 
    });
  }
};

export const getBotStats = async (req: Request, res: Response) => {
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
    
    let stats = await storage.getBotStats(botId as string);
    
    if (!stats) {
      return res.status(404).json({ 
        success: false,
        error: 'Bot stats not found' 
      });
    }
    
    // Update uptime
    stats = await storage.updateBotStats({
      botId: botId as string,
      uptime: discordBot.getUptime()
    });
    
    // Get recent activity (command logs)
    const recentLogs = await storage.getCommandLogs(botId as string, 5, 0);
    
    return res.status(200).json({
      success: true,
      stats,
      recentActivity: recentLogs.map(log => ({
        type: log.status === 'success' ? 'command' : 
              log.status === 'permission_denied' ? 'permission' : 'error',
        user: log.username,
        server: log.serverName,
        time: log.timestamp,
        details: `${log.commandName} in #${log.channelName}`
      }))
    });
  } catch (error) {
    console.error('Get bot stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error getting bot stats' 
    });
  }
};
