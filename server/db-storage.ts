import { eq, and } from 'drizzle-orm';
import { db } from './db';
import { sql } from 'drizzle-orm';
import {
  users,
  botConfigs,
  servers,
  commands,
  commandLogs,
  plugins,
  botStats
} from '../shared/schema';
import type {
  User, InsertUser,
  BotConfig, InsertBotConfig,
  Server, InsertServer,
  Command, InsertCommand,
  CommandLog, InsertCommandLog,
  Plugin, InsertPlugin,
  BotStat, InsertBotStat
} from '@shared/schema';
import type { IStorage } from './storage';

export class DbStorage implements IStorage {
  // User management
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Bot configuration
  async getBotConfig(botId: string): Promise<BotConfig | undefined> {
    const result = await db.select().from(botConfigs).where(eq(botConfigs.botId, botId)).limit(1);
    return result[0];
  }

  async createBotConfig(config: InsertBotConfig): Promise<BotConfig> {
    const result = await db.insert(botConfigs).values(config).returning();
    return result[0];
  }

  async updateBotConfig(botId: string, config: Partial<BotConfig>): Promise<BotConfig | undefined> {
    const result = await db.update(botConfigs)
      .set({ ...config, lastConnected: new Date() })
      .where(eq(botConfigs.botId, botId))
      .returning();
    return result[0];
  }

  // Server management
  async getServers(botId: string): Promise<Server[]> {
    return await db.select().from(servers).where(eq(servers.botId, botId));
  }

  async getServer(id: number): Promise<Server | undefined> {
    const result = await db.select().from(servers).where(eq(servers.id, id));
    return result[0];
  }

  async getServerByServerId(serverId: string): Promise<Server | undefined> {
    const result = await db.select().from(servers).where(eq(servers.serverId, serverId));
    return result[0];
  }

  async createServer(server: InsertServer): Promise<Server> {
    const result = await db.insert(servers).values(server).returning();
    return result[0];
  }

  async updateServer(id: number, update: Partial<Server>): Promise<Server | undefined> {
    const result = await db.update(servers)
      .set(update)
      .where(eq(servers.id, id))
      .returning();
    return result[0];
  }

  async deleteServer(id: number): Promise<boolean> {
    const result = await db.delete(servers).where(eq(servers.id, id)).returning();
    return result.length > 0;
  }

  // Command management
  async getCommands(botId: string): Promise<Command[]> {
    return await db.select().from(commands).where(eq(commands.botId, botId));
  }

  async getCommand(id: number): Promise<Command | undefined> {
    const result = await db.select().from(commands).where(eq(commands.id, id));
    return result[0];
  }

  async getCommandByName(botId: string, name: string): Promise<Command | undefined> {
    const result = await db.select().from(commands)
      .where(and(eq(commands.botId, botId), eq(commands.name, name)));
    return result[0];
  }

  async createCommand(command: InsertCommand): Promise<Command> {
    const result = await db.insert(commands).values(command).returning();
    console.log('Resultado do insert de comando:', result);
    return result[0];
  }

  async updateCommand(id: number, update: Partial<Command>): Promise<Command | undefined> {
    const result = await db.update(commands)
      .set(update)
      .where(eq(commands.id, id))
      .returning();
    return result[0];
  }

  async deleteCommand(id: number): Promise<boolean> {
    console.log('DbStorage: Attempting to delete command with ID:', id);
    try {
      const result = await db.delete(commands).where(eq(commands.id, id)).returning();
      console.log('DbStorage: Delete operation result:', result);
      return result.length > 0;
    } catch (error) {
      console.error('DbStorage: Error deleting command:', error);
      throw error;
    }
  }

  async incrementCommandUsage(id: number): Promise<Command | undefined> {
    const command = await this.getCommand(id);
    if (!command) return undefined;

    // Update command usage count
    const result = await db.update(commands)
      .set({ usageCount: (command.usageCount ?? 0) + 1 })
      .where(eq(commands.id, id))
      .returning();

    // Log para depuração
    console.log('Incrementando usage para botId:', command.botId, 'comando:', command.name);

    // Increment commandsUsed only for the correct bot
    await db.update(botStats)
      .set({ 
        commandsUsed: sql`${botStats.commandsUsed} + 1`,
        lastUpdate: new Date()
      })
      .where(eq(botStats.botId, command.botId))
      .returning();

    return result[0];
  }

  async incrementCommandUsageByBotId(botId: string, commandName: string): Promise<void> {
    // Busca o comando do bot correto
    const command = await db.select().from(commands)
      .where(and(eq(commands.botId, botId), eq(commands.name, commandName)))
      .then(res => res[0]);
    if (!command) return;

    // Atualiza o usageCount do comando
    await db.update(commands)
      .set({ usageCount: (command.usageCount ?? 0) + 1 })
      .where(eq(commands.id, command.id))
      .returning();

    // Incrementa o contador de comandos usados do bot correto
    await db.update(botStats)
      .set({ 
        commandsUsed: sql`${botStats.commandsUsed} + 1`,
        lastUpdate: new Date()
      })
      .where(eq(botStats.botId, botId))
      .returning();
  }

  // Command logs
  async getCommandLogs(botId: string, limit: number = 50, offset: number = 0): Promise<CommandLog[]> {
    return await db.select().from(commandLogs)
      .where(eq(commandLogs.botId, botId))
      .orderBy(commandLogs.timestamp)
      .limit(limit)
      .offset(offset);
  }

  async getCommandLogsByServer(botId: string, serverId: string, limit: number = 50, offset: number = 0): Promise<CommandLog[]> {
    return await db.select().from(commandLogs)
      .where(and(eq(commandLogs.botId, botId), eq(commandLogs.serverId, serverId)))
      .orderBy(commandLogs.timestamp)
      .limit(limit)
      .offset(offset);
  }

  async getCommandLogsByUser(botId: string, userId: string, limit: number = 50, offset: number = 0): Promise<CommandLog[]> {
    return await db.select().from(commandLogs)
      .where(and(eq(commandLogs.botId, botId), eq(commandLogs.userId, userId)))
      .orderBy(commandLogs.timestamp)
      .limit(limit)
      .offset(offset);
  }

  async getCommandLogsByCommand(botId: string, commandName: string, limit: number = 50, offset: number = 0): Promise<CommandLog[]> {
    return await db.select().from(commandLogs)
      .where(and(eq(commandLogs.botId, botId), eq(commandLogs.commandName, commandName)))
      .orderBy(commandLogs.timestamp)
      .limit(limit)
      .offset(offset);
  }

  async createCommandLog(log: InsertCommandLog): Promise<CommandLog> {
    const result = await db.insert(commandLogs).values(log).returning();
    return result[0];
  }

  // Plugin management
  async getPlugins(): Promise<Plugin[]> {
    return await db.select().from(plugins);
  }

  async getPlugin(id: number): Promise<Plugin | undefined> {
    const result = await db.select().from(plugins).where(eq(plugins.id, id));
    return result[0];
  }

  async getPluginByName(name: string): Promise<Plugin | undefined> {
    const result = await db.select().from(plugins).where(eq(plugins.name, name));
    return result[0];
  }

  async createPlugin(plugin: InsertPlugin): Promise<Plugin> {
    const result = await db.insert(plugins).values(plugin).returning();
    return result[0];
  }

  async updatePlugin(id: number, update: Partial<Plugin>): Promise<Plugin | undefined> {
    const result = await db.update(plugins)
      .set(update)
      .where(eq(plugins.id, id))
      .returning();
    return result[0];
  }

  async deletePlugin(id: number): Promise<boolean> {
    const result = await db.delete(plugins).where(eq(plugins.id, id)).returning();
    return result.length > 0;
  }

  // Stats
  async getBotStats(botId: string): Promise<BotStat | undefined> {
    const result = await db.select().from(botStats).where(eq(botStats.botId, botId)).limit(1);
    return result[0];
  }

  async updateBotStats(stats: Partial<BotStat>): Promise<BotStat | undefined> {
    if (!stats.botId) throw new Error('botId is required for updateBotStats');
    const currentStats = await this.getBotStats(stats.botId);
    if (!currentStats) {
      const result = await db.insert(botStats).values(stats as InsertBotStat).returning();
      return result[0];
    }
    const result = await db.update(botStats)
      .set({ ...stats, lastUpdate: new Date() })
      .where(eq(botStats.botId, stats.botId))
      .returning();
    return result[0];
  }
} 