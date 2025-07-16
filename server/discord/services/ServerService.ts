import { Client } from 'discord.js';
import { storage } from '../../storage';
import { InsertServer } from '@shared/schema';

export class ServerService {
  /**
   * Sync servers from Discord to the database
   */
  public static async syncServers(client: Client): Promise<void> {
    if (!client.isReady()) return;
    
    // Get all servers from Discord
    const discordServers = Array.from(client.guilds.cache.values());
    
    // Update server count in stats
    await storage.updateBotStats({ 
      botId: client.user?.id || "unknown",
      serverCount: discordServers.length,
      activeUsers: discordServers.reduce((acc, guild) => acc + guild.memberCount, 0)
    });
    
    // Add all servers to database
    for (const guild of discordServers) {
      await this.addServer(
        client.user?.id || "unknown",
        guild.id, 
        guild.name, 
        guild.iconURL() || undefined, 
        guild.memberCount
      );
    }
  }
  
  /**
   * Add or update a server in the database
   */
  public static async addServer(
    botId: string,
    serverId: string, 
    name: string, 
    iconUrl?: string, 
    memberCount?: number
  ): Promise<void> {
    // Check if server already exists
    const existingServer = await storage.getServerByServerId(serverId);
    
    if (existingServer) {
      // Update server info
      await storage.updateServer(existingServer.id, {
        name,
        iconUrl: iconUrl || existingServer.iconUrl,
        memberCount: memberCount || existingServer.memberCount
      });
    } else {
      // Add new server
      const serverData: InsertServer = {
        botId,
        serverId,
        name,
        iconUrl,
        enabled: true,
        memberCount
      };
      await storage.createServer(serverData);
    }
  }
} 