import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Import controllers
import * as authController from "./controllers/auth-controller";
import * as userAuthController from "./controllers/user-auth-controller";
import * as botController from "./controllers/bot-controller";
import * as commandsController from "./controllers/commands-controller";
import * as logsController from "./controllers/logs-controller";
import * as pluginsController from "./controllers/plugins-controller";

// Import middleware
import { requireUserAuth } from "./middleware/auth-middleware";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes - prefix all routes with /api
  const apiRouter = express.Router();
  
  // User authentication routes (não protegidas)
  apiRouter.post('/user/login', userAuthController.userLogin);
  apiRouter.get('/user/status', userAuthController.checkUserAuthStatus);
  apiRouter.post('/user/logout', userAuthController.userLogout);
  
  // Bot authentication routes (não protegidas - usadas para inicializar o bot)
  apiRouter.post('/auth/login', authController.authenticate);
  apiRouter.get('/auth/status', authController.checkAuthStatus);
  apiRouter.post('/auth/logout', authController.disconnect);
  
  // Todas as rotas abaixo requerem autenticação de usuário
  // Bot routes
  apiRouter.get('/bot', requireUserAuth, botController.getBotInfo);
  apiRouter.patch('/bot', requireUserAuth, botController.updateBotConfig);
  apiRouter.get('/bot/servers', requireUserAuth, botController.getServers);
  apiRouter.patch('/bot/servers/:id', requireUserAuth, botController.updateServer);
  apiRouter.get('/bot/stats', requireUserAuth, botController.getBotStats);
  
  // Commands routes
  apiRouter.get('/commands/stats', requireUserAuth, commandsController.getCommandsStats);
  apiRouter.get('/commands', requireUserAuth, commandsController.getCommands);
  apiRouter.get('/commands/:id', requireUserAuth, commandsController.getCommand);
  apiRouter.post('/commands', requireUserAuth, commandsController.createCommand);
  apiRouter.patch('/commands/:id', requireUserAuth, commandsController.updateCommand);
  apiRouter.delete('/commands/:id', requireUserAuth, commandsController.deleteCommand);
  apiRouter.post('/commands/reload', requireUserAuth, commandsController.reloadCommands);
  
  // Logs routes
  apiRouter.get('/logs', requireUserAuth, logsController.getLogs);
  apiRouter.get('/logs/server/:serverId', requireUserAuth, logsController.getLogsByServer);
  apiRouter.get('/logs/command/:commandName', requireUserAuth, logsController.getLogsByCommand);
  apiRouter.get('/logs/user/:userId', requireUserAuth, logsController.getLogsByUser);
  
  // Plugins routes
  apiRouter.get('/plugins', requireUserAuth, pluginsController.getPlugins);
  apiRouter.get('/plugins/:id', requireUserAuth, pluginsController.getPlugin);
  apiRouter.post('/plugins', requireUserAuth, pluginsController.createPlugin);
  apiRouter.patch('/plugins/:id', requireUserAuth, pluginsController.updatePlugin);
  apiRouter.delete('/plugins/:id', requireUserAuth, pluginsController.deletePlugin);
  
  // Mount the API router
  app.use('/api', apiRouter);

  const httpServer = createServer(app);

  return httpServer;
}
