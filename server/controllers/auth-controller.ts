import { Request, Response } from 'express';
import { storage } from '../storage';
import discordBot from '../discord-bot';

export const authenticate = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        success: false,
        error: 'Bot token is required' 
      });
    }
    
    // Check if already authenticated and disconnect if so
    if (discordBot.isConnected()) {
      await discordBot.disconnect();
    }
    
    // Try to connect with the token
    const connected = await discordBot.connect(token);
    
    if (!connected) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid bot token or connection failed' 
      });
    }
    
    // Obtenha os dados do bot autenticado
    const user = discordBot.getUser();
    if (!user) {
      return res.status(500).json({ success: false, error: 'Failed to get bot user after login' });
    }
    
    // Atualize ou crie o botConfig com todos os dados relevantes
    let botConfig = await storage.getBotConfig(user.id);
    const botData = {
      botId: user.id,
      name: user.username,
      avatarUrl: user.displayAvatarURL(),
      token,
      lastConnected: new Date(),
    };
    
    if (botConfig) {
      botConfig = await storage.updateBotConfig(botData.botId, botData);
    } else {
      botConfig = await storage.createBotConfig(botData);
    }

    let stats = await storage.getBotStats(botData.botId as string);

    stats = await storage.updateBotStats({
      botId: botData.botId as string,
      lastUpdate: new Date()
    });
    
    // Retorne os dados do bot (exceto o token)
    return res.status(200).json({
      success: true,
      bot: {
        id: user.id,
        name: user.username,
        avatar: user.displayAvatarURL({ size: 128 }),
        isConnected: discordBot.isConnected(),
      },
      config: {
        ...botConfig,
        token: undefined, // nunca envie o token para o frontend
      }
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error during authentication' 
    });
  }
};

export const checkAuthStatus = async (req: Request, res: Response) => {
  try {
    const isConnected = discordBot.isConnected();
    
    if (!isConnected) {
      return res.status(401).json({ 
        success: false,
        authenticated: false,
        error: 'Bot is not connected' 
      });
    }
    
    return res.status(200).json({
      success: true,
      authenticated: true,
      bot: {
        name: discordBot.getUser()?.username,
        id: discordBot.getUser()?.id,
        avatar: discordBot.getUser()?.displayAvatarURL({ size: 128 })
      }
    });
  } catch (error) {
    console.error('Auth status check error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error checking auth status' 
    });
  }
};

export const disconnect = async (req: Request, res: Response) => {
  try {
    await discordBot.disconnect();
    
    return res.status(200).json({
      success: true,
      message: 'Bot disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error during disconnect' 
    });
  }
};
