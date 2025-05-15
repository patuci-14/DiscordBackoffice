import { Request, Response, NextFunction } from 'express';
import discordBot from '../discord-bot';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!discordBot.isConnected()) {
      return res.status(401).json({ 
        success: false,
        error: 'Bot is not connected' 
      });
    }

    // Adiciona o botId ao request se não estiver presente
    const botUser = discordBot.getUser();
    if (botUser && !req.query.botId) {
      req.query.botId = botUser.id;
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error in auth middleware' 
    });
  }
}; 