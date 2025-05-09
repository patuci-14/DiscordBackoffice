import { Request, Response } from 'express';
import { storage } from '../storage';
import discordBot from '../discord-bot';

export const getLogs = async (req: Request, res: Response) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }
    
    const { 
      server, command, user, limit = 50, offset = 0, botId 
    } = req.query;
    
    if (!botId) {
      return res.status(400).json({ 
        success: false,
        error: 'Bot ID is required' 
      });
    }
    
    let logs;
    
    if (server) {
      // Filter by server
      logs = await storage.getCommandLogsByServer(
        botId as string,
        server as string, 
        Number(limit), 
        Number(offset)
      );
    } else if (command) {
      // Filter by command
      logs = await storage.getCommandLogsByCommand(
        botId as string,
        command as string, 
        Number(limit), 
        Number(offset)
      );
    } else if (user) {
      // Filter by user
      logs = await storage.getCommandLogsByUser(
        botId as string,
        user as string, 
        Number(limit), 
        Number(offset)
      );
    } else {
      // Get all logs
      logs = await storage.getCommandLogs(
        botId as string,
        Number(limit), 
        Number(offset)
      );
    }
    
    // Get total count for pagination
    const totalLogs = (await storage.getCommandLogs(botId as string)).length;
    
    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        total: totalLogs,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error getting logs' 
    });
  }
};

export const getLogsByServer = async (req: Request, res: Response) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }
    
    const { serverId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const logs = await storage.getCommandLogsByServer(
      serverId,
      Number(limit),
      Number(offset)
    );
    
    return res.status(200).json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Get logs by server error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error getting logs by server' 
    });
  }
};

export const getLogsByCommand = async (req: Request, res: Response) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }
    
    const { commandName } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const logs = await storage.getCommandLogsByCommand(
      commandName,
      Number(limit),
      Number(offset)
    );
    
    return res.status(200).json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Get logs by command error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error getting logs by command' 
    });
  }
};

export const getLogsByUser = async (req: Request, res: Response) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }
    
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const logs = await storage.getCommandLogsByUser(
      userId,
      Number(limit),
      Number(offset)
    );
    
    return res.status(200).json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Get logs by user error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error getting logs by user' 
    });
  }
};
