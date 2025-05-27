import {
  User, InsertUser, 
  BotConfig, InsertBotConfig,
  Server, InsertServer,
  Command, InsertCommand,
  CommandLog, InsertCommandLog,
  Plugin, InsertPlugin,
  BotStat, InsertBotStat
} from "@shared/schema";
import { DbStorage } from './db-storage';

// Storage interface for all CRUD operations
export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Bot configuration
  getBotConfig(botId: string): Promise<BotConfig | undefined>;
  createBotConfig(config: InsertBotConfig): Promise<BotConfig>;
  updateBotConfig(botId: string, config: Partial<BotConfig>): Promise<BotConfig | undefined>;
  
  // Server management
  getServers(botId: string): Promise<Server[]>;
  getServer(id: number): Promise<Server | undefined>;
  getServerByServerId(serverId: string): Promise<Server | undefined>;
  createServer(server: InsertServer): Promise<Server>;
  updateServer(id: number, update: Partial<Server>): Promise<Server | undefined>;
  deleteServer(id: number): Promise<boolean>;

  // Command management
  getCommands(botId: string): Promise<Command[]>;
  getCommand(id: number): Promise<Command | undefined>;
  getCommandByName(botId: string, name: string): Promise<Command | undefined>;
  createCommand(command: InsertCommand): Promise<Command>;
  updateCommand(id: number, update: Partial<Command>): Promise<Command | undefined>;
  deleteCommand(id: number): Promise<boolean>;
  incrementCommandUsageByBotId(botId: string, commandName: string): Promise<void>;
  getCommandsUsedLast24Hours(botId: string): Promise<number>;

  // Command logs
  getCommandLogs(botId: string, limit?: number, offset?: number): Promise<CommandLog[]>;
  getCommandLogsCount(botId: string): Promise<number>;
  getCommandLogsByServer(botId: string, serverId: string, limit?: number, offset?: number): Promise<CommandLog[]>;
  getCommandLogsByServerCount(botId: string, serverId: string): Promise<number>;
  getCommandLogsByUser(botId: string, userId: string, limit?: number, offset?: number): Promise<CommandLog[]>;
  getCommandLogsByUserCount(botId: string, userId: string): Promise<number>;
  getCommandLogsByCommand(botId: string, commandName: string, limit?: number, offset?: number): Promise<CommandLog[]>;
  getCommandLogsByCommandCount(botId: string, commandName: string): Promise<number>;
  createCommandLog(log: InsertCommandLog): Promise<CommandLog>;
  
  // Plugin management
  getPlugins(): Promise<Plugin[]>;
  getPlugin(id: number): Promise<Plugin | undefined>;
  getPluginByName(name: string): Promise<Plugin | undefined>;
  createPlugin(plugin: InsertPlugin): Promise<Plugin>;
  updatePlugin(id: number, update: Partial<Plugin>): Promise<Plugin | undefined>;
  deletePlugin(id: number): Promise<boolean>;

  // Stats
  getBotStats(botId: string): Promise<BotStat | undefined>;
  updateBotStats(stats: Partial<BotStat>): Promise<BotStat | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private botConfigs: Map<string, BotConfig>;
  private servers: Map<number, Server>;
  private commands: Map<number, Command>;
  private commandLogs: Map<number, CommandLog>;
  private plugins: Map<number, Plugin>;
  private botStats: Map<string, BotStat>;
  
  private currentUserId: number = 1;
  private currentServerId: number = 1;
  private currentCommandId: number = 1;
  private currentCommandLogId: number = 1;
  private currentPluginId: number = 1;
  private currentBotStatsId: number = 1;

  constructor() {
    this.users = new Map();
    this.botConfigs = new Map();
    this.servers = new Map();
    this.commands = new Map();
    this.commandLogs = new Map();
    this.plugins = new Map();
    this.botStats = new Map();
    
    // Initialize with some built-in commands
    this.createCommand({
      name: "help",
      botId: "default-bot",
      type: "text",
      response: "Displays help information for available commands.",
      requiredPermission: "everyone",
      cooldown: 3,
      enabledForAllServers: true,
      deleteUserMessage: false,
      logUsage: true,
      active: true,
      options: {},
      description: null,
      webhookUrl: null
    });
    
    this.createCommand({
      name: "ping",
      botId: "default-bot",
      type: "text",
      response: "Pong! Bot latency: {ping}ms",
      requiredPermission: "everyone",
      cooldown: 3,
      enabledForAllServers: true,
      deleteUserMessage: false,
      logUsage: true,
      active: true,
      options: {},
      description: null,
      webhookUrl: null
    });
    
    // Initialize with some sample plugins
    this.createPlugin({
      name: "Music Player",
      botId: "default-bot",
      version: "1.2.3",
      description: "Play music from YouTube, Spotify, and SoundCloud in voice channels.",
      author: "MusicDevs",
      enabled: true,
      config: {}
    });
    
    this.createPlugin({
      name: "Leveling System",
      botId: "default-bot",
      version: "2.1.0",
      description: "Award XP and levels to members based on activity. Includes rank commands and leaderboards.",
      author: "RankMaster",
      enabled: true,
      config: {}
    });
    
    this.createPlugin({
      name: "Auto Moderation",
      botId: "default-bot",
      version: "3.0.2",
      description: "Automatically moderate chat messages for spam, bad language, and raid protection.",
      author: "SecurityTeam",
      enabled: false,
      config: {}
    });
    
    this.createPlugin({
      name: "Event Scheduler",
      botId: "default-bot",
      version: "1.0.5",
      description: "Create and manage server events with reminders, sign-ups, and calendar integration.",
      author: "EventManagers",
      enabled: true,
      config: {}
    });
    
    // Initialize default bot config
    this.botConfigs.set("default-bot", {
      id: 1,
      botId: "default-bot",
      name: "Discord Bot",
      prefix: "!",
      status: "online",
      activityType: "PLAYING",
      activity: "with commands",
      useSlashCommands: true,
      logCommandUsage: true,
      respondToMentions: true,
      deleteCommandMessages: false,
      enableWelcomeMessages: true,
      enableGoodbyeMessages: true,
      enableAutoRole: false,
      enableLogging: true,
      enableAntiSpam: true,
      enableAutoMod: true,
      token: "default-token",
      avatarUrl: null,
      lastConnected: new Date()
    });
    
    // Initialize default bot stats
    this.botStats.set("default-bot", {
      id: this.currentBotStatsId++,
      botId: "default-bot",
      serverCount: 0,
      commandsUsed: 0,
      activeUsers: 0,
      uptime: "0%",
      lastUpdate: new Date(),
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  // Bot configuration
  async getBotConfig(botId: string): Promise<BotConfig | undefined> {
    return this.botConfigs.get(botId);
  }

  async createBotConfig(config: InsertBotConfig): Promise<BotConfig> {
    const newConfig: BotConfig = {
      id: 1,
      name: config.name || null,
      activity: config.activity || null,
      status: config.status || null,
      token: config.token,
      botId: config.botId || "default-bot",
      prefix: config.prefix || null,
      activityType: config.activityType || null,
      avatarUrl: config.avatarUrl || null,
      useSlashCommands: config.useSlashCommands ?? true,
      lastConnected: new Date(),
      logCommandUsage: config.logCommandUsage ?? true,
      respondToMentions: config.respondToMentions ?? true,
      deleteCommandMessages: config.deleteCommandMessages ?? false,
      enableWelcomeMessages: config.enableWelcomeMessages ?? true,
      enableGoodbyeMessages: config.enableGoodbyeMessages ?? true,
      enableAutoRole: config.enableAutoRole ?? false,
      enableLogging: config.enableLogging ?? true,
      enableAntiSpam: config.enableAntiSpam ?? true,
      enableAutoMod: config.enableAutoMod ?? true,
    };
    this.botConfigs.set(config.botId || "default-bot", newConfig);
    return newConfig;
  }

  async updateBotConfig(botId: string, config: Partial<BotConfig>): Promise<BotConfig | undefined> {
    const currentConfig = await this.getBotConfig(botId);
    if (!currentConfig) return undefined;
    
    const updatedConfig = {
      ...currentConfig,
      ...config,
      botId
    };
    
    this.botConfigs.set(botId, updatedConfig);
    return updatedConfig;
  }

  // Server management
  async getServers(botId: string): Promise<Server[]> {
    return Array.from(this.servers.values()).filter(server => server.botId === botId);
  }

  async getServer(id: number): Promise<Server | undefined> {
    return this.servers.get(id);
  }

  async getServerByServerId(serverId: string): Promise<Server | undefined> {
    return Array.from(this.servers.values()).find(
      (server) => server.serverId === serverId
    );
  }

  async createServer(server: InsertServer): Promise<Server> {
    const id = this.currentServerId++;
    const newServer: Server = { ...server, id, iconUrl: server.iconUrl ?? null, enabled: server.enabled ?? true, memberCount: server.memberCount ?? null };
    this.servers.set(id, newServer);
    
    // Update server count in stats
    if (this.botStats.has("default-bot")) {
      await this.updateBotStats({ serverCount: this.servers.size });
    }
    
    return newServer;
  }

  async updateServer(id: number, update: Partial<Server>): Promise<Server | undefined> {
    const server = this.servers.get(id);
    if (!server) return undefined;
    
    const updatedServer: Server = { ...server, ...update };
    this.servers.set(id, updatedServer);
    return updatedServer;
  }

  async deleteServer(id: number): Promise<boolean> {
    const deleted = this.servers.delete(id);
    
    // Update server count in stats
    if (deleted && this.botStats.has("default-bot")) {
      await this.updateBotStats({ serverCount: this.servers.size });
    }
    
    return deleted;
  }

  // Command management
  async getCommands(botId: string): Promise<Command[]> {
    return Array.from(this.commands.values()).filter(cmd => cmd.botId === botId);
  }

  async getCommand(id: number): Promise<Command | undefined> {
    return this.commands.get(id);
  }

  async getCommandByName(botId: string, name: string): Promise<Command | undefined> {
    return Array.from(this.commands.values()).find(
      (command) => command.botId === botId && command.name === name
    );
  }

  async createCommand(command: InsertCommand): Promise<Command> {
    const id = this.currentCommandId++;
    const newCommand: Command = { 
      ...command, 
      id,
      usageCount: 0,
      webhookUrl: command.webhookUrl || null,
      options: command.options || {},
      description: command.description ?? null,
      requiredPermission: command.requiredPermission ?? null,
      cooldown: command.cooldown ?? null,
      enabledForAllServers: command.enabledForAllServers ?? true,
      deleteUserMessage: command.deleteUserMessage ?? false,
      logUsage: command.logUsage ?? true,
      active: command.active ?? true,
      type: command.type ?? "text",
      requireConfirmation: command.requireConfirmation ?? false,
      confirmationMessage: command.confirmationMessage ?? null,
      cancelMessage: command.cancelMessage ?? null
    };
    this.commands.set(id, newCommand);
    return newCommand;
  }

  async updateCommand(id: number, update: Partial<Command>): Promise<Command | undefined> {
    const command = this.commands.get(id);
    if (!command) return undefined;
    
    const updatedCommand: Command = { ...command, ...update };
    this.commands.set(id, updatedCommand);
    return updatedCommand;
  }

  async deleteCommand(id: number): Promise<boolean> {
    return this.commands.delete(id);
  }

  async incrementCommandUsageByBotId(botId: string, commandName: string): Promise<void> {
    const command = await this.getCommandByName(botId, commandName);
    if (!command) return;

    // Update command usage count
    const updatedCommand: Command = { 
      ...command, 
      usageCount: (command.usageCount || 0) + 1 
    };
    this.commands.set(command.id, updatedCommand);
    
    // Update commands used in stats
    const currentStats = this.botStats.get(botId);
    if (currentStats) {
      const updatedStats: BotStat = {
        ...currentStats,
        commandsUsed: (currentStats.commandsUsed || 0) + 1,
        lastUpdate: new Date()
      };
      this.botStats.set(botId, updatedStats);
    }
  }

  async getCommandsUsedLast24Hours(botId: string): Promise<number> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return Array.from(this.commandLogs.values())
      .filter(log => 
        log.botId === botId && 
        log.timestamp && 
        new Date(log.timestamp) >= twentyFourHoursAgo &&
        log.status === 'success'
      ).length;
  }

  // Command logs
  async getCommandLogs(botId: string, limit: number = 50, offset: number = 0): Promise<CommandLog[]> {
    return Array.from(this.commandLogs.values())
      .filter(log => log.botId === botId)
      .sort((a, b) => {
        const ta = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        const tb = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        return ta - tb;
      })
      .slice(offset, offset + limit);
  }

  async getCommandLogsCount(botId: string): Promise<number> {
    return Array.from(this.commandLogs.values()).filter(log => log.botId === botId).length;
  }

  async getCommandLogsByServer(botId: string, serverId: string, limit: number = 50, offset: number = 0): Promise<CommandLog[]> {
    return Array.from(this.commandLogs.values())
      .filter(log => log.botId === botId && log.serverId === serverId)
      .sort((a, b) => {
        const ta = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        const tb = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        return ta - tb;
      })
      .slice(offset, offset + limit);
  }

  async getCommandLogsByServerCount(botId: string, serverId: string): Promise<number> {
    return Array.from(this.commandLogs.values()).filter(log => log.botId === botId && log.serverId === serverId).length;
  }

  async getCommandLogsByUser(botId: string, userId: string, limit: number = 50, offset: number = 0): Promise<CommandLog[]> {
    return Array.from(this.commandLogs.values())
      .filter(log => log.botId === botId && log.userId === userId)
      .sort((a, b) => {
        const ta = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        const tb = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        return ta - tb;
      })
      .slice(offset, offset + limit);
  }

  async getCommandLogsByUserCount(botId: string, userId: string): Promise<number> {
    return Array.from(this.commandLogs.values()).filter(log => log.botId === botId && log.userId === userId).length;
  }

  async getCommandLogsByCommand(botId: string, commandName: string, limit: number = 50, offset: number = 0): Promise<CommandLog[]> {
    return Array.from(this.commandLogs.values())
      .filter(log => log.botId === botId && log.commandName === commandName)
      .sort((a, b) => {
        const ta = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        const tb = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        return ta - tb;
      })
      .slice(offset, offset + limit);
  }

  async getCommandLogsByCommandCount(botId: string, commandName: string): Promise<number> {
    return Array.from(this.commandLogs.values()).filter(log => log.botId === botId && log.commandName === commandName).length;
  }

  async createCommandLog(log: InsertCommandLog): Promise<CommandLog> {
    const id = this.currentCommandLogId++;
    const newLog: CommandLog = { 
      ...log, 
      id,
      timestamp: new Date(),
      status: log.status ?? null,
      parameters: log.parameters ?? {},
      callbackStatus: log.callbackStatus ?? null,
      callbackError: log.callbackError ?? null,
      callbackTimestamp: log.callbackTimestamp ?? null
    };
    this.commandLogs.set(id, newLog);
    
    // Find and increment the command usage count
    const command = Array.from(this.commands.values()).find(
      cmd => cmd.name === log.commandName
    );
    
    if (command) {
      await this.incrementCommandUsageByBotId(command.botId, command.name);
    }
    
    return newLog;
  }

  // Plugin management
  async getPlugins(): Promise<Plugin[]> {
    return Array.from(this.plugins.values());
  }

  async getPlugin(id: number): Promise<Plugin | undefined> {
    return this.plugins.get(id);
  }

  async getPluginByName(name: string): Promise<Plugin | undefined> {
    return Array.from(this.plugins.values()).find(
      (plugin) => plugin.name === name
    );
  }

  async createPlugin(plugin: InsertPlugin): Promise<Plugin> {
    const id = this.currentPluginId++;
    const newPlugin: Plugin = { 
      ...plugin, 
      id,
      enabled: plugin.enabled ?? true,
      description: plugin.description ?? null,
      author: plugin.author ?? null,
      config: plugin.config || {}
    };
    this.plugins.set(id, newPlugin);
    return newPlugin;
  }

  async updatePlugin(id: number, update: Partial<Plugin>): Promise<Plugin | undefined> {
    const plugin = this.plugins.get(id);
    if (!plugin) return undefined;
    
    const updatedPlugin: Plugin = { ...plugin, ...update };
    this.plugins.set(id, updatedPlugin);
    return updatedPlugin;
  }

  async deletePlugin(id: number): Promise<boolean> {
    return this.plugins.delete(id);
  }

  // Stats
  async getBotStats(botId: string): Promise<BotStat | undefined> {
    return this.botStats.get(botId);
  }

  async updateBotStats(stats: Partial<BotStat>): Promise<BotStat | undefined> {
    if (!stats.botId) return undefined;
    
    const currentStats = await this.getBotStats(stats.botId);
    if (!currentStats) {
      const newStats: BotStat = {
        id: this.currentBotStatsId++,
        botId: stats.botId,
        serverCount: stats.serverCount || 0,
        commandsUsed: stats.commandsUsed || 0,
        activeUsers: stats.activeUsers || 0,
        uptime: stats.uptime || "0%",
        lastUpdate: new Date()
      };
      // Use a Map to ensure atomic updates
      this.botStats.set(stats.botId, newStats);
      return newStats;
    }
    
    // Only update if there are actual changes or if lastUpdate is older than 1 minute
    const lastUpdate = currentStats.lastUpdate || new Date();
    const now = new Date();
    const timeDiff = now.getTime() - lastUpdate.getTime();
    
    if (timeDiff < 60000 && !Object.keys(stats).some(key => key !== 'lastUpdate' && stats[key as keyof BotStat] !== currentStats[key as keyof BotStat])) {
      return currentStats;
    }
    
    const updatedStats = {
      ...currentStats,
      ...stats,
      lastUpdate: now
    };
    
    // Use a Map to ensure atomic updates
    this.botStats.set(stats.botId, updatedStats);
    return updatedStats;
  }
}

export const storage = new DbStorage();
