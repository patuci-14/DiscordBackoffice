import { eq, and, desc, gte } from 'drizzle-orm';
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
    const result = await db.select().from(botConfigs).where(eq(botConfigs.botId, botId));
    return result[0];
  }

  async createBotConfig(config: InsertBotConfig): Promise<BotConfig> {
    const result = await db.insert(botConfigs).values(config).returning();
    return result[0];
  }

  async updateBotConfig(botId: string, config: Partial<BotConfig>): Promise<BotConfig | undefined> {
    if (!config || typeof config !== 'object') {
      return undefined;
    }

    // Filter out undefined values and ensure we have a valid object
    const updateData = Object.fromEntries(
      Object.entries(config).filter(([_, value]) => value !== undefined && value !== null)
    );

    if (Object.keys(updateData).length === 0) {
      return undefined;
    }

    const result = await db.update(botConfigs)
      .set(updateData)
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
    const result = await db.select()
      .from(commands)
      .where(and(
        eq(commands.botId, botId),
        eq(commands.name, name)
      ));
    return result[0];
  }

  async createCommand(command: InsertCommand): Promise<Command> {
    const result = await db.insert(commands).values({
      ...command,
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
      cancelMessage: command.cancelMessage ?? null,
      contextMenuType: command.contextMenuType ?? null
    }).returning();
    return result[0];
  }

  async updateCommand(id: number, updates: Partial<InsertCommand>): Promise<Command> {
    const updateData = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined && value !== null)
    );

    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid updates provided');
    }

    const result = await db
      .update(commands)
      .set(updateData)
      .where(eq(commands.id, id))
      .returning();

    if (!result.length) {
      throw new Error('Command not found');
    }

    return result[0];
  }

  async deleteCommand(id: number): Promise<boolean> {
    const result = await db.delete(commands).where(eq(commands.id, id)).returning();
    return result.length > 0;
  }

  async incrementCommandUsageByBotId(botId: string, commandName: string): Promise<void> {
    await db.update(commands)
      .set({
        usageCount: sql`${commands.usageCount} + 1`
      })
      .where(and(
        eq(commands.botId, botId),
        eq(commands.name, commandName)
      ));
  }

  async getCommandsUsedLast24Hours(botId: string): Promise<number> {
    const result = await db.select({
      count: sql<number>`count(*)`
    })
    .from(commandLogs)
    .where(and(
      eq(commandLogs.botId, botId),
      gte(commandLogs.timestamp, sql`now() - interval '24 hours'`)
    ));
    return result[0].count;
  }

  // Command logs
  async getCommandLogs(botId: string, limit?: number, offset?: number): Promise<CommandLog[]> {
    const query = db.select().from(commandLogs).where(eq(commandLogs.botId, botId));
    if (limit !== undefined) query.limit(limit);
    if (offset !== undefined) query.offset(offset);
    return await query;
  }

  async getCommandLogsCount(botId: string): Promise<number> {
    const result = await db.select({
      count: sql<number>`count(*)`
    })
    .from(commandLogs)
    .where(eq(commandLogs.botId, botId));
    return result[0].count;
  }

  async getCommandLogsByServer(botId: string, serverId: string, limit?: number, offset?: number): Promise<CommandLog[]> {
    const query = db.select()
      .from(commandLogs)
      .where(and(
        eq(commandLogs.botId, botId),
        eq(commandLogs.serverId, serverId)
      ));
    if (limit !== undefined) query.limit(limit);
    if (offset !== undefined) query.offset(offset);
    return await query;
  }

  async getCommandLogsByServerCount(botId: string, serverId: string): Promise<number> {
    const result = await db.select({
      count: sql<number>`count(*)`
    })
    .from(commandLogs)
    .where(and(
      eq(commandLogs.botId, botId),
      eq(commandLogs.serverId, serverId)
    ));
    return result[0].count;
  }

  async getCommandLogsByUser(botId: string, userId: string, limit?: number, offset?: number): Promise<CommandLog[]> {
    const query = db.select()
      .from(commandLogs)
      .where(and(
        eq(commandLogs.botId, botId),
        eq(commandLogs.userId, userId)
      ));
    if (limit !== undefined) query.limit(limit);
    if (offset !== undefined) query.offset(offset);
    return await query;
  }

  async getCommandLogsByUserCount(botId: string, userId: string): Promise<number> {
    const result = await db.select({
      count: sql<number>`count(*)`
    })
    .from(commandLogs)
    .where(and(
      eq(commandLogs.botId, botId),
      eq(commandLogs.userId, userId)
    ));
    return result[0].count;
  }

  async getCommandLogsByCommand(botId: string, commandName: string, limit?: number, offset?: number): Promise<CommandLog[]> {
    const query = db.select()
      .from(commandLogs)
      .where(and(
        eq(commandLogs.botId, botId),
        eq(commandLogs.commandName, commandName)
      ));
    if (limit !== undefined) query.limit(limit);
    if (offset !== undefined) query.offset(offset);
    return await query;
  }

  async getCommandLogsByCommandCount(botId: string, commandName: string): Promise<number> {
    const result = await db.select({
      count: sql<number>`count(*)`
    })
    .from(commandLogs)
    .where(and(
      eq(commandLogs.botId, botId),
      eq(commandLogs.commandName, commandName)
    ));
    return result[0].count;
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
    const result = await db.select().from(botStats).where(eq(botStats.botId, botId));
    return result[0];
  }

  async updateBotStats(stats: Partial<BotStat> & { botId: string }): Promise<BotStat | undefined> {
    const result = await db.update(botStats)
      .set(stats)
      .where(eq(botStats.botId, stats.botId))
      .returning();
    return result[0];
  }
} 