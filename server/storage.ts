import {
  User, InsertUser, 
  BotConfig, InsertBotConfig,
  Server, InsertServer,
  Command, InsertCommand,
  CommandLog, InsertCommandLog,
  Plugin, InsertPlugin,
  BotStat, InsertBotStat
} from "@shared/schema";

// Storage interface for all CRUD operations
export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Bot configuration
  getBotConfig(): Promise<BotConfig | undefined>;
  createBotConfig(config: InsertBotConfig): Promise<BotConfig>;
  updateBotConfig(config: Partial<BotConfig>): Promise<BotConfig | undefined>;
  
  // Server management
  getServers(): Promise<Server[]>;
  getServer(id: number): Promise<Server | undefined>;
  getServerByServerId(serverId: string): Promise<Server | undefined>;
  createServer(server: InsertServer): Promise<Server>;
  updateServer(id: number, update: Partial<Server>): Promise<Server | undefined>;
  deleteServer(id: number): Promise<boolean>;

  // Command management
  getCommands(): Promise<Command[]>;
  getCommand(id: number): Promise<Command | undefined>;
  getCommandByName(name: string): Promise<Command | undefined>;
  createCommand(command: InsertCommand): Promise<Command>;
  updateCommand(id: number, update: Partial<Command>): Promise<Command | undefined>;
  deleteCommand(id: number): Promise<boolean>;
  incrementCommandUsage(id: number): Promise<Command | undefined>;

  // Command logs
  getCommandLogs(limit?: number, offset?: number): Promise<CommandLog[]>;
  getCommandLogsByServer(serverId: string, limit?: number, offset?: number): Promise<CommandLog[]>;
  getCommandLogsByUser(userId: string, limit?: number, offset?: number): Promise<CommandLog[]>;
  getCommandLogsByCommand(commandName: string, limit?: number, offset?: number): Promise<CommandLog[]>;
  createCommandLog(log: InsertCommandLog): Promise<CommandLog>;
  
  // Plugin management
  getPlugins(): Promise<Plugin[]>;
  getPlugin(id: number): Promise<Plugin | undefined>;
  getPluginByName(name: string): Promise<Plugin | undefined>;
  createPlugin(plugin: InsertPlugin): Promise<Plugin>;
  updatePlugin(id: number, update: Partial<Plugin>): Promise<Plugin | undefined>;
  deletePlugin(id: number): Promise<boolean>;

  // Stats
  getBotStats(): Promise<BotStat | undefined>;
  updateBotStats(stats: Partial<BotStat>): Promise<BotStat | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private botConfig: BotConfig | undefined;
  private servers: Map<number, Server>;
  private commands: Map<number, Command>;
  private commandLogs: Map<number, CommandLog>;
  private plugins: Map<number, Plugin>;
  private botStats: BotStat | undefined;
  
  private currentUserId: number = 1;
  private currentServerId: number = 1;
  private currentCommandId: number = 1;
  private currentCommandLogId: number = 1;
  private currentPluginId: number = 1;
  private currentBotStatsId: number = 1;

  constructor() {
    this.users = new Map();
    this.servers = new Map();
    this.commands = new Map();
    this.commandLogs = new Map();
    this.plugins = new Map();
    
    // Initialize with some built-in commands
    this.createCommand({
      name: "help",
      type: "text",
      response: "Displays help information for available commands.",
      requiredPermission: "everyone",
      cooldown: 3,
      enabledForAllServers: true,
      deleteUserMessage: false,
      logUsage: true,
      active: true,
    });
    
    this.createCommand({
      name: "ping",
      type: "text",
      response: "Pong! Bot latency: {ping}ms",
      requiredPermission: "everyone",
      cooldown: 3,
      enabledForAllServers: true,
      deleteUserMessage: false,
      logUsage: true,
      active: true,
    });
    
    // Initialize with some sample plugins
    this.createPlugin({
      name: "Music Player",
      version: "1.2.3",
      description: "Play music from YouTube, Spotify, and SoundCloud in voice channels.",
      author: "MusicDevs",
      enabled: true,
      config: {},
    });
    
    this.createPlugin({
      name: "Leveling System",
      version: "2.1.0",
      description: "Award XP and levels to members based on activity. Includes rank commands and leaderboards.",
      author: "RankMaster",
      enabled: true,
      config: {},
    });
    
    this.createPlugin({
      name: "Auto Moderation",
      version: "3.0.2",
      description: "Automatically moderate chat messages for spam, bad language, and raid protection.",
      author: "SecurityTeam",
      enabled: false,
      config: {},
    });
    
    this.createPlugin({
      name: "Event Scheduler",
      version: "1.0.5",
      description: "Create and manage server events with reminders, sign-ups, and calendar integration.",
      author: "EventManagers",
      enabled: true,
      config: {},
    });
    
    // Initialize stats
    this.botStats = {
      id: this.currentBotStatsId++,
      serverCount: 0,
      commandsUsed: 0,
      activeUsers: 0,
      uptime: "0%",
      lastUpdate: new Date(),
    };
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
  async getBotConfig(): Promise<BotConfig | undefined> {
    return this.botConfig;
  }

  async createBotConfig(config: InsertBotConfig): Promise<BotConfig> {
    const newConfig: BotConfig = {
      ...config,
      id: 1,
      lastConnected: new Date()
    };
    this.botConfig = newConfig;
    return newConfig;
  }

  async updateBotConfig(config: Partial<BotConfig>): Promise<BotConfig | undefined> {
    if (!this.botConfig) return undefined;
    
    this.botConfig = {
      ...this.botConfig,
      ...config,
      lastConnected: new Date()
    };
    
    return this.botConfig;
  }

  // Server management
  async getServers(): Promise<Server[]> {
    return Array.from(this.servers.values());
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
    const newServer: Server = { ...server, id };
    this.servers.set(id, newServer);
    
    // Update server count in stats
    if (this.botStats) {
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
    if (deleted && this.botStats) {
      await this.updateBotStats({ serverCount: this.servers.size });
    }
    
    return deleted;
  }

  // Command management
  async getCommands(): Promise<Command[]> {
    return Array.from(this.commands.values());
  }

  async getCommand(id: number): Promise<Command | undefined> {
    return this.commands.get(id);
  }

  async getCommandByName(name: string): Promise<Command | undefined> {
    return Array.from(this.commands.values()).find(
      (command) => command.name === name
    );
  }

  async createCommand(command: InsertCommand): Promise<Command> {
    const id = this.currentCommandId++;
    const newCommand: Command = { 
      ...command, 
      id,
      usageCount: 0
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

  async incrementCommandUsage(id: number): Promise<Command | undefined> {
    const command = this.commands.get(id);
    if (!command) return undefined;
    
    const updatedCommand: Command = { 
      ...command, 
      usageCount: (command.usageCount || 0) + 1 
    };
    this.commands.set(id, updatedCommand);
    
    // Update commands used in stats
    if (this.botStats) {
      await this.updateBotStats({ 
        commandsUsed: (this.botStats.commandsUsed || 0) + 1 
      });
    }
    
    return updatedCommand;
  }

  // Command logs
  async getCommandLogs(limit: number = 50, offset: number = 0): Promise<CommandLog[]> {
    return Array.from(this.commandLogs.values())
      .sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(offset, offset + limit);
  }

  async getCommandLogsByServer(serverId: string, limit: number = 50, offset: number = 0): Promise<CommandLog[]> {
    return Array.from(this.commandLogs.values())
      .filter(log => log.serverId === serverId)
      .sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(offset, offset + limit);
  }

  async getCommandLogsByUser(userId: string, limit: number = 50, offset: number = 0): Promise<CommandLog[]> {
    return Array.from(this.commandLogs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(offset, offset + limit);
  }

  async getCommandLogsByCommand(commandName: string, limit: number = 50, offset: number = 0): Promise<CommandLog[]> {
    return Array.from(this.commandLogs.values())
      .filter(log => log.commandName === commandName)
      .sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(offset, offset + limit);
  }

  async createCommandLog(log: InsertCommandLog): Promise<CommandLog> {
    const id = this.currentCommandLogId++;
    const newLog: CommandLog = { 
      ...log, 
      id,
      timestamp: new Date()
    };
    this.commandLogs.set(id, newLog);
    
    // Find and increment the command usage count
    const command = Array.from(this.commands.values()).find(
      cmd => cmd.name === log.commandName
    );
    
    if (command) {
      await this.incrementCommandUsage(command.id);
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
    const newPlugin: Plugin = { ...plugin, id };
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
  async getBotStats(): Promise<BotStat | undefined> {
    return this.botStats;
  }

  async updateBotStats(stats: Partial<BotStat>): Promise<BotStat | undefined> {
    if (!this.botStats) return undefined;
    
    this.botStats = {
      ...this.botStats,
      ...stats,
      lastUpdate: new Date()
    };
    
    return this.botStats;
  }
}

export const storage = new MemStorage();
