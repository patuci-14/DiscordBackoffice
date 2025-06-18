import { Request, Response } from 'express';
import { storage } from '../storage';
import discordBot from '../discord-bot';

// Variável para controlar tentativas de login simultâneas
let isAuthenticating = false;
let lastAuthAttempt = 0;
const AUTH_COOLDOWN = 3000; // 3 segundos entre tentativas

export const authenticate = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        success: false,
        error: 'Bot token is required' 
      });
    }
    
    // Verificar se já existe uma tentativa de autenticação em andamento
    if (isAuthenticating) {
      console.log('Authentication already in progress, rejecting new attempt');
      return res.status(429).json({
        success: false,
        error: 'Authentication already in progress, please wait'
      });
    }
    
    // Verificar cooldown para evitar múltiplas tentativas em sequência
    const now = Date.now();
    if (now - lastAuthAttempt < AUTH_COOLDOWN) {
      console.log('Authentication attempt too soon after previous attempt');
      return res.status(429).json({
        success: false,
        error: 'Too many authentication attempts, please wait'
      });
    }
    
    // Marcar início da autenticação e atualizar timestamp
    isAuthenticating = true;
    lastAuthAttempt = now;
    
    try {
      // Check if already authenticated with the same token
      if (discordBot.isConnected() && discordBot.getToken() === token) {
        console.log('Bot already connected with the same token, reusing connection');
        
        // Obtenha os dados do bot autenticado
        const user = discordBot.getUser();
        if (!user) {
          throw new Error('Failed to get bot user after login');
        }
        
        // Retorne os dados do bot (exceto o token)
        return res.status(200).json({
          success: true,
          bot: {
            id: user.id,
            name: user.username,
            avatar: user.displayAvatarURL({ size: 128 }),
            isConnected: discordBot.isConnected(),
          }
        });
      }
      
      // Check if already authenticated and disconnect if so
      if (discordBot.isConnected()) {
        console.log('Bot already connected with different token, disconnecting first');
        await discordBot.disconnect();
        
        // Pequena pausa para garantir que a desconexão seja concluída
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('Attempting to connect with token');
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
      
      console.log(`Bot connected successfully as ${user.username}`);
      
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
    } finally {
      // Sempre marcar como não autenticando ao finalizar
      isAuthenticating = false;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    // Resetar flag de autenticação em caso de erro
    isAuthenticating = false;
    res.status(500).json({ 
      success: false,
      error: 'Internal server error during authentication' 
    });
  }
};

// Variável para controlar verificações de status simultâneas
let isCheckingStatus = false;
let lastStatusCheck = 0;
const STATUS_CHECK_COOLDOWN = 1000; // 1 segundo entre verificações

export const checkAuthStatus = async (req: Request, res: Response) => {
  try {
    // Verificar cooldown para evitar múltiplas verificações em sequência
    const now = Date.now();
    if (now - lastStatusCheck < STATUS_CHECK_COOLDOWN) {
      // Não bloquear, apenas registrar
      console.log('Status check too soon after previous check');
    }
    
    // Atualizar timestamp
    lastStatusCheck = now;
    
    // Evitar verificações simultâneas
    if (isCheckingStatus) {
      console.log('Status check already in progress');
      // Não bloquear, apenas retornar o status atual
    } else {
      isCheckingStatus = true;
    }
    
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
    } finally {
      isCheckingStatus = false;
    }
  } catch (error) {
    console.error('Auth status check error:', error);
    isCheckingStatus = false;
    res.status(500).json({ 
      success: false,
      error: 'Internal server error checking auth status' 
    });
  }
};

export const disconnect = async (req: Request, res: Response) => {
  try {
    // Verificar se já existe uma tentativa de autenticação em andamento
    if (isAuthenticating) {
      console.log('Authentication in progress, cannot disconnect');
      return res.status(429).json({
        success: false,
        error: 'Authentication in progress, cannot disconnect'
      });
    }
    
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
