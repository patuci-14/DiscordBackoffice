import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model (for bot admins)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Discord Bot Configuration
export const botConfigs = pgTable("bot_configs", {
  id: serial("id").primaryKey(),
  token: text("token").notNull(),
  name: text("name"),
  botId: text("bot_id"),
  prefix: text("prefix").default("!"),
  status: text("status").default("online"),
  activity: text("activity"),
  activityType: text("activity_type").default("PLAYING"),
  avatarUrl: text("avatar_url"),
  useSlashCommands: boolean("use_slash_commands").default(true),
  lastConnected: timestamp("last_connected"),
});

export const insertBotConfigSchema = createInsertSchema(botConfigs).pick({
  token: true,
  name: true,
  botId: true,
  prefix: true,
  status: true,
  activity: true,
  activityType: true,
  avatarUrl: true,
  useSlashCommands: true,
});

// Server model for Discord servers where the bot is present
export const servers = pgTable("servers", {
  id: serial("id").primaryKey(),
  serverId: text("server_id").notNull().unique(),
  name: text("name").notNull(),
  iconUrl: text("icon_url"),
  enabled: boolean("enabled").default(true),
  memberCount: integer("member_count"),
});

export const insertServerSchema = createInsertSchema(servers).pick({
  serverId: true,
  name: true,
  iconUrl: true,
  enabled: true,
  memberCount: true,
});

// Custom Commands
export const commands = pgTable("commands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("text"), // text, slash, embed
  response: text("response").notNull(),
  webhookUrl: text("webhook_url"), // URL to be called when command is triggered
  requiredPermission: text("required_permission").default("everyone"),
  cooldown: integer("cooldown").default(0),
  enabledForAllServers: boolean("enabled_for_all_servers").default(true),
  deleteUserMessage: boolean("delete_user_message").default(false),
  logUsage: boolean("log_usage").default(true),
  active: boolean("active").default(true),
  usageCount: integer("usage_count").default(0),
});

export const insertCommandSchema = createInsertSchema(commands).pick({
  name: true,
  type: true,
  response: true,
  webhookUrl: true,
  requiredPermission: true,
  cooldown: true,
  enabledForAllServers: true,
  deleteUserMessage: true,
  logUsage: true,
  active: true,
});

// Command Logs
export const commandLogs = pgTable("command_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow(),
  serverId: text("server_id").notNull(),
  serverName: text("server_name").notNull(),
  channelId: text("channel_id").notNull(),
  channelName: text("channel_name").notNull(),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  commandName: text("command_name").notNull(),
  status: text("status").default("success"), // success, failed, permission_denied
});

export const insertCommandLogSchema = createInsertSchema(commandLogs).pick({
  serverId: true,
  serverName: true,
  channelId: true,
  channelName: true,
  userId: true,
  username: true,
  commandName: true,
  status: true,
});

// Plugins
export const plugins = pgTable("plugins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  version: text("version").notNull(),
  description: text("description"),
  author: text("author"),
  enabled: boolean("enabled").default(true),
  config: json("config"),
});

export const insertPluginSchema = createInsertSchema(plugins).pick({
  name: true,
  version: true,
  description: true,
  author: true,
  enabled: true,
  config: true,
});

// Stats
export const botStats = pgTable("bot_stats", {
  id: serial("id").primaryKey(),
  serverCount: integer("server_count").default(0),
  commandsUsed: integer("commands_used").default(0),
  activeUsers: integer("active_users").default(0),
  uptime: text("uptime").default("0%"),
  lastUpdate: timestamp("last_update").defaultNow(),
});

export const insertBotStatsSchema = createInsertSchema(botStats).pick({
  serverCount: true,
  commandsUsed: true,
  activeUsers: true,
  uptime: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type BotConfig = typeof botConfigs.$inferSelect;
export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;

export type Server = typeof servers.$inferSelect;
export type InsertServer = z.infer<typeof insertServerSchema>;

export type Command = typeof commands.$inferSelect;
export type InsertCommand = z.infer<typeof insertCommandSchema>;

export type CommandLog = typeof commandLogs.$inferSelect;
export type InsertCommandLog = z.infer<typeof insertCommandLogSchema>;

export type Plugin = typeof plugins.$inferSelect;
export type InsertPlugin = z.infer<typeof insertPluginSchema>;

export type BotStat = typeof botStats.$inferSelect;
export type InsertBotStat = z.infer<typeof insertBotStatsSchema>;

// Discord API Related Types
export type BotUser = {
  id: string;
  username: string;
  avatar?: string;
  discriminator?: string;
};

export type DiscordServer = {
  id: string;
  name: string;
  icon?: string;
  owner?: boolean;
  permissions?: string;
  features?: string[];
  memberCount?: number;
};

export type BotActivity = {
  name: string;
  type: string;
};

export type BotStatus = 'online' | 'idle' | 'dnd' | 'invisible';

export type ServerChannel = {
  id: string;
  name: string;
  type: number;
};

export type DiscordUser = {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
};

export type RecentActivity = {
  type: string;
  user: string;
  server: string;
  time: string;
  details?: string;
};
