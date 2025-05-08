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
    
    // Save the token in the storage (securely on the server only)
    let botConfig = await storage.getBotConfig();
    
    if (botConfig) {
      botConfig = await storage.updateBotConfig({ token });
    } else {
      botConfig = await storage.createBotConfig({ token });
    }
    
    // Return success but don't include the token in the response
    return res.status(200).json({
      success: true,
      bot: {
        name: discordBot.getUser()?.username,
        id: discordBot.getUser()?.id,
        avatar: discordBot.getUser()?.displayAvatarURL({ size: 128 }),
        isConnected: discordBot.isConnected()
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
