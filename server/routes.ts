import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Import controllers
import * as authController from "./controllers/auth-controller";
import * as botController from "./controllers/bot-controller";
import * as commandsController from "./controllers/commands-controller";
import * as logsController from "./controllers/logs-controller";
import * as pluginsController from "./controllers/plugins-controller";

// Middleware to check if the bot is authenticated
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // For now, this is just a placeholder
  // We'll implement the actual authentication logic in the controllers
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes - prefix all routes with /api
  const apiRouter = express.Router();
  
  // Auth routes
  apiRouter.post('/auth/login', authController.authenticate);
  apiRouter.get('/auth/status', authController.checkAuthStatus);
  apiRouter.post('/auth/logout', authController.disconnect);
  
  // Bot routes
  apiRouter.get('/bot', requireAuth, botController.getBotInfo);
  apiRouter.patch('/bot', requireAuth, botController.updateBotConfig);
  apiRouter.get('/bot/servers', requireAuth, botController.getServers);
  apiRouter.patch('/bot/servers/:id', requireAuth, botController.updateServer);
  apiRouter.get('/bot/stats', requireAuth, botController.getBotStats);
  
  // Commands routes
  apiRouter.get('/commands', requireAuth, commandsController.getCommands);
  apiRouter.get('/commands/:id', requireAuth, commandsController.getCommand);
  apiRouter.post('/commands', requireAuth, commandsController.createCommand);
  apiRouter.patch('/commands/:id', requireAuth, commandsController.updateCommand);
  apiRouter.delete('/commands/:id', requireAuth, commandsController.deleteCommand);
  
  // Logs routes
  apiRouter.get('/logs', requireAuth, logsController.getLogs);
  apiRouter.get('/logs/server/:serverId', requireAuth, logsController.getLogsByServer);
  apiRouter.get('/logs/command/:commandName', requireAuth, logsController.getLogsByCommand);
  apiRouter.get('/logs/user/:userId', requireAuth, logsController.getLogsByUser);
  
  // Plugins routes
  apiRouter.get('/plugins', requireAuth, pluginsController.getPlugins);
  apiRouter.get('/plugins/:id', requireAuth, pluginsController.getPlugin);
  apiRouter.post('/plugins', requireAuth, pluginsController.createPlugin);
  apiRouter.patch('/plugins/:id', requireAuth, pluginsController.updatePlugin);
  apiRouter.delete('/plugins/:id', requireAuth, pluginsController.deletePlugin);
  
  // Mount the API router
  app.use('/api', apiRouter);

  const httpServer = createServer(app);

  return httpServer;
}
