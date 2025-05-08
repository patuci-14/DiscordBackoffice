import { Client, GatewayIntentBits, Partials, Collection, Events, EmbedBuilder, 
  ApplicationCommandType, ApplicationCommandOptionType, REST, Routes, Interaction, 
  ChatInputCommandInteraction } from 'discord.js';
import axios from 'axios';
import { storage } from './storage';
import { BotConfig, Server, InsertServer, Command, InsertCommandLog } from '@shared/schema';

class DiscordBot {
  private client: Client;
  private token: string | null = null;
  private commands: Collection<string, Command> = new Collection();
  private startTime: Date | null = null;
  
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
      partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember,
      ],
    });
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers() {
    this.client.on(Events.ClientReady, async () => {
      console.log(`Bot is logged in as ${this.client.user?.tag}`);
      this.startTime = new Date();
      
      // Update the bot config with the bot user information
      if (this.client.user) {
        const botConfig = await storage.getBotConfig();
        if (botConfig) {
          await storage.updateBotConfig({
            name: this.client.user.username,
            botId: this.client.user.id,
            avatarUrl: this.client.user.displayAvatarURL(),
          });
        }
      }
      
      // Sync servers
      await this.syncServers();
      
      // Set bot status based on config
      await this.updateBotStatus();
      
      // Load commands
      await this.loadCommands();
      
      // Register slash commands
      await this.registerSlashCommands();
    });
    
    // Handle slash command interactions
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      
      await this.handleSlashCommand(interaction);
    });
    
    this.client.on(Events.MessageCreate, async (message) => {
      // Ignore messages from bots and non-text channels
      if (message.author.bot || !message.guild) return;
      
      const botConfig = await storage.getBotConfig();
      if (!botConfig) return;
      
      const prefix = botConfig.prefix || '!';
      
      // Check if message starts with the prefix
      if (!message.content.startsWith(prefix)) return;
      
      // Check if the bot is enabled for this server
      const server = await storage.getServerByServerId(message.guild.id);
      if (!server || !server.enabled) return;
      
      // Parse the command name
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift()?.toLowerCase();
      
      if (!commandName) return;
      
      // Find the command
      const command = this.commands.get(commandName) || 
                      Array.from(this.commands.values()).find(cmd => 
                        cmd.name.toLowerCase() === commandName
                      );
      
      if (!command || !command.active) return;
      
      // Check permissions
      if (command.requiredPermission !== 'everyone') {
        let hasPermission = false;
        
        if (command.requiredPermission === 'admin' && message.member?.permissions.has('Administrator')) {
          hasPermission = true;
        } else if (command.requiredPermission === 'moderator' && 
                 (message.member?.permissions.has('ManageMessages') || 
                  message.member?.permissions.has('Administrator'))) {
          hasPermission = true;
        } else if (command.requiredPermission === 'server-owner' && 
                 message.guild.ownerId === message.author.id) {
          hasPermission = true;
        }
        
        if (!hasPermission) {
          // Log permission denied
          await storage.createCommandLog({
            serverId: message.guild.id,
            serverName: message.guild.name,
            channelId: message.channel.id,
            channelName: message.channel.name,
            userId: message.author.id,
            username: message.author.tag,
            commandName: command.name,
            status: 'permission_denied'
          });
          
          return message.reply('You do not have permission to use this command.');
        }
      }
      
      try {
        // Process the command
        let response = command.response;
        
        // Replace placeholders with actual values
        response = response
          .replace('{user}', message.author.username)
          .replace('{server}', message.guild.name)
          .replace('{ping}', this.client.ws.ping.toString());
        
        // Log command data for debugging
        console.log(`Command executed: ${command.name}, type: ${command.type}, webhookUrl: ${command.webhookUrl || 'none'}`);
        
        // Send the response based on command type
        if (command.type === 'embed') {
          const embed = new EmbedBuilder()
            .setColor('#7289DA')
            .setDescription(response);
            
          await message.channel.send({ embeds: [embed] });
        } else {
          await message.channel.send(response);
        }
        
        // Call webhook if configured
        if (command.webhookUrl && command.webhookUrl.trim() && /^https?:\/\/.+/i.test(command.webhookUrl)) {
          console.log(`Attempting to call webhook for ${command.name} to URL: ${command.webhookUrl}`);
          try {
            // Prepare webhook payload with rich context information
            const webhookPayload = {
              command: command.name,
              user: {
                id: message.author.id,
                username: message.author.username,
                discriminator: message.author.discriminator,
                avatarUrl: message.author.displayAvatarURL()
              },
              server: {
                id: message.guild.id,
                name: message.guild.name,
              },
              channel: {
                id: message.channel.id,
                name: message.channel.name
              },
              message: {
                content: message.content,
                id: message.id,
                timestamp: message.createdAt
              },
              args: args || [],
              timestamp: new Date()
            };

            // Send webhook request with appropriate timeout and retry
            const webhookResponse = await axios.post(command.webhookUrl, webhookPayload, {
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Discord-Bot-Manager'
              },
              timeout: 5000, // 5 second timeout to prevent hanging
              validateStatus: status => status < 500 // Accept all non-server error responses
            });
            
            if (webhookResponse.status >= 200 && webhookResponse.status < 300) {
              console.log(`Webhook triggered successfully for command ${command.name}`);
            } else {
              console.warn(`Webhook for command ${command.name} returned status: ${webhookResponse.status}`);
            }
          } catch (error) {
            const webhookError = error instanceof Error ? error : new Error('Unknown error');
            console.error(`Error sending webhook for command ${command.name}:`, webhookError.message);
            // Continue execution - webhook errors shouldn't affect the user experience
          }
        } else if (command.webhookUrl) {
          console.warn(`Invalid webhook URL format for command ${command.name}: ${command.webhookUrl}`);
        }
        
        // Delete the user's message if specified
        if (command.deleteUserMessage) {
          await message.delete().catch(() => {
            // Ignore deletion errors
          });
        }
        
        // Log command usage
        if (command.logUsage) {
          await storage.createCommandLog({
            serverId: message.guild.id,
            serverName: message.guild.name,
            channelId: message.channel.id,
            channelName: message.channel.name,
            userId: message.author.id,
            username: message.author.tag,
            commandName: command.name,
            status: 'success'
          });
        }
      } catch (error) {
        console.error(`Error executing command ${command.name}:`, error);
        
        // Log command failure
        await storage.createCommandLog({
          serverId: message.guild.id,
          serverName: message.guild.name,
          channelId: message.channel.id,
          channelName: message.channel.name,
          userId: message.author.id,
          username: message.author.tag,
          commandName: command.name,
          status: 'failed'
        });
        
        message.reply('There was an error executing that command.');
      }
    });
    
    this.client.on(Events.GuildCreate, async (guild) => {
      // Add new server to database
      await this.addServer(guild.id, guild.name, guild.iconURL() || undefined, guild.memberCount);
    });
    
    this.client.on(Events.GuildDelete, async (guild) => {
      // Remove server from database
      const server = await storage.getServerByServerId(guild.id);
      if (server) {
        await storage.deleteServer(server.id);
      }
    });
  }
  
  public async connect(token: string): Promise<boolean> {
    try {
      this.token = token;
      await this.client.login(token);
      return true;
    } catch (error) {
      console.error('Failed to connect to Discord:', error);
      return false;
    }
  }
  
  public async disconnect(): Promise<void> {
    if (this.client) {
      this.client.destroy();
      this.token = null;
      this.startTime = null;
    }
  }
  
  public isConnected(): boolean {
    return this.client?.isReady() || false;
  }
  
  public getUser() {
    return this.client.user;
  }
  
  public getServers() {
    return this.client.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL(),
      memberCount: guild.memberCount
    }));
  }
  
  public getUptime(): string {
    if (!this.startTime || !this.isConnected()) {
      return '0%';
    }
    
    const uptime = this.client.uptime;
    
    if (!uptime) return '0%';
    
    const days = Math.floor(uptime / 86400000);
    const hours = Math.floor((uptime % 86400000) / 3600000);
    const minutes = Math.floor(((uptime % 86400000) % 3600000) / 60000);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
  
  private async syncServers() {
    if (!this.client.isReady()) return;
    
    // Get all servers from Discord
    const discordServers = this.client.guilds.cache;
    
    // Update server count in stats
    await storage.updateBotStats({ 
      serverCount: discordServers.size,
      activeUsers: discordServers.reduce((acc, guild) => acc + guild.memberCount, 0)
    });
    
    // Add all servers to database
    for (const [id, guild] of discordServers) {
      await this.addServer(id, guild.name, guild.iconURL() || undefined, guild.memberCount);
    }
  }
  
  private async addServer(id: string, name: string, iconUrl?: string, memberCount?: number) {
    // Check if server already exists
    const existingServer = await storage.getServerByServerId(id);
    
    if (existingServer) {
      // Update server info
      await storage.updateServer(existingServer.id, {
        name,
        iconUrl: iconUrl || existingServer.iconUrl,
        memberCount: memberCount || existingServer.memberCount
      });
    } else {
      // Add new server
      await storage.createServer({
        serverId: id,
        name,
        iconUrl,
        enabled: true,
        memberCount
      });
    }
  }
  
  private async updateBotStatus() {
    if (!this.client.isReady()) return;
    
    const botConfig = await storage.getBotConfig();
    if (!botConfig) return;
    
    // Set status
    switch (botConfig.status) {
      case 'online':
        this.client.user?.setStatus('online');
        break;
      case 'idle':
        this.client.user?.setStatus('idle');
        break;
      case 'dnd':
        this.client.user?.setStatus('dnd');
        break;
      case 'invisible':
        this.client.user?.setStatus('invisible');
        break;
      default:
        this.client.user?.setStatus('online');
        break;
    }
    
    // Set activity
    if (botConfig.activity) {
      this.client.user?.setActivity(botConfig.activity, { 
        type: botConfig.activityType as any 
      });
    }
  }
  
  private async loadCommands() {
    // Load commands from database
    const dbCommands = await storage.getCommands();
    
    // Clear current commands
    this.commands.clear();
    
    // Add commands to collection
    for (const command of dbCommands) {
      this.commands.set(command.name, command);
    }
    
    console.log(`Loaded ${this.commands.size} commands.`);
  }
  
  public async reloadCommands() {
    await this.loadCommands();
    await this.registerSlashCommands();
  }
  
  public async updateStatus(status: string, activity?: string, activityType?: string) {
    const botConfig = await storage.getBotConfig();
    if (!botConfig) return;
    
    await storage.updateBotConfig({
      status,
      activity,
      activityType
    });
    
    await this.updateBotStatus();
  }
  
  /**
   * Register slash commands with Discord API
   */
  private async registerSlashCommands() {
    if (!this.client.isReady() || !this.token) return;
    
    try {
      console.log('Registering slash commands...');
      
      const botConfig = await storage.getBotConfig();
      if (!botConfig || !botConfig.useSlashCommands) {
        console.log('Slash commands are disabled in config.');
        return;
      }
      
      // Get all active slash commands
      const commands = Array.from(this.commands.values()).filter(cmd => 
        cmd.active && cmd.type === 'slash'
      );
      
      if (commands.length === 0) {
        console.log('No active slash commands to register.');
        return;
      }
      
      console.log(`Found ${commands.length} active slash commands to register.`);
      
      // Create the REST API instance
      const rest = new REST({ version: '10' }).setToken(this.token);
      
      // Format commands for registration
      const slashCommands = commands.map(cmd => {
        const commandData: any = {
          name: cmd.name.toLowerCase(),
          description: cmd.description || `Run the ${cmd.name} command`,
          type: ApplicationCommandType.ChatInput,
        };
        
        // Add options if defined
        if (cmd.options && Object.keys(cmd.options).length > 0) {
          commandData.options = cmd.options;
        }
        
        return commandData;
      });
      
      console.log(`Registering ${slashCommands.length} slash commands...`);
      
      if (this.client.user) {
        // Register commands globally (available in all servers)
        await rest.put(
          Routes.applicationCommands(this.client.user.id),
          { body: slashCommands }
        );
        
        console.log('Successfully registered application commands.');
      }
    } catch (error) {
      console.error('Error registering slash commands:', error);
    }
  }
  
  /**
   * Handle an incoming slash command interaction
   */
  private async handleSlashCommand(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    
    // Check if the server is enabled
    const server = await storage.getServerByServerId(interaction.guild.id);
    if (!server || !server.enabled) {
      return interaction.reply({ 
        content: 'This bot is disabled in this server.', 
        ephemeral: true 
      });
    }
    
    // Get the command name
    const commandName = interaction.commandName.toLowerCase();
    
    // Find the command in our database
    const command = this.commands.get(commandName) || 
                   Array.from(this.commands.values()).find(cmd => 
                     cmd.name.toLowerCase() === commandName
                   );
    
    if (!command || !command.active) {
      return interaction.reply({ 
        content: 'That command no longer exists or is inactive.', 
        ephemeral: true 
      });
    }
    
    // Check permissions
    if (command.requiredPermission !== 'everyone') {
      let hasPermission = false;
      
      if (command.requiredPermission === 'admin' && interaction.memberPermissions?.has('Administrator')) {
        hasPermission = true;
      } else if (command.requiredPermission === 'moderator' && 
               (interaction.memberPermissions?.has('ManageMessages') || 
                interaction.memberPermissions?.has('Administrator'))) {
        hasPermission = true;
      } else if (command.requiredPermission === 'server-owner' && 
               interaction.guild.ownerId === interaction.user.id) {
        hasPermission = true;
      }
      
      if (!hasPermission) {
        // Log permission denied
        await storage.createCommandLog({
          serverId: interaction.guild.id,
          serverName: interaction.guild.name,
          channelId: interaction.channel?.id || '0',
          channelName: interaction.channel?.name || 'unknown',
          userId: interaction.user.id,
          username: interaction.user.tag,
          commandName: command.name,
          status: 'permission_denied'
        });
        
        return interaction.reply({ 
          content: 'You do not have permission to use this command.', 
          ephemeral: true 
        });
      }
    }
    
    try {
      // Defer reply to give us time to process
      await interaction.deferReply({ ephemeral: command.deleteUserMessage || false });
      
      // Process the command
      let response = command.response;
      
      // Replace placeholders with actual values
      response = response
        .replace('{user}', interaction.user.username)
        .replace('{server}', interaction.guild.name)
        .replace('{ping}', this.client.ws.ping.toString());
      
      // Increment usage count
      await storage.incrementCommandUsage(command.id);
      
      // Send the response based on command type
      if (command.type === 'embed') {
        const embed = new EmbedBuilder()
          .setColor('#7289DA')
          .setDescription(response);
          
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply(response);
      }
      
      // Call webhook if configured
      if (command.webhookUrl && command.webhookUrl.trim() && /^https?:\/\/.+/i.test(command.webhookUrl)) {
        console.log(`Attempting to call webhook for ${command.name} to URL: ${command.webhookUrl}`);
        try {
          // Prepare webhook payload with rich context information
          const webhookPayload = {
            command: command.name,
            user: {
              id: interaction.user.id,
              username: interaction.user.username,
              discriminator: interaction.user.discriminator,
              avatarUrl: interaction.user.displayAvatarURL()
            },
            server: {
              id: interaction.guild.id,
              name: interaction.guild.name,
            },
            channel: {
              id: interaction.channel?.id || '0',
              name: interaction.channel?.name || 'unknown'
            },
            interaction: {
              id: interaction.id,
              timestamp: interaction.createdAt
            },
            timestamp: new Date()
          };

          // Send webhook request with appropriate timeout and retry
          const webhookResponse = await axios.post(command.webhookUrl, webhookPayload, {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Discord-Bot-Manager'
            },
            timeout: 5000, // 5 second timeout to prevent hanging
            validateStatus: status => status < 500 // Accept all non-server error responses
          });
          
          if (webhookResponse.status >= 200 && webhookResponse.status < 300) {
            console.log(`Webhook triggered successfully for command ${command.name}`);
          } else {
            console.warn(`Webhook for command ${command.name} returned status: ${webhookResponse.status}`);
          }
        } catch (error) {
          const webhookError = error as Error;
          console.error(`Error sending webhook for command ${command.name}:`, webhookError.message || 'Unknown error');
          // Continue execution - webhook errors shouldn't affect the user experience
        }
      } else if (command.webhookUrl) {
        console.warn(`Invalid webhook URL format for command ${command.name}: ${command.webhookUrl}`);
      }
      
      // Log command usage
      if (command.logUsage) {
        await storage.createCommandLog({
          serverId: interaction.guild.id,
          serverName: interaction.guild.name,
          channelId: interaction.channel?.id || '0',
          channelName: interaction.channel?.name || 'unknown',
          userId: interaction.user.id,
          username: interaction.user.tag,
          commandName: command.name,
          status: 'success'
        });
      }
    } catch (error) {
      console.error(`Error executing slash command ${command.name}:`, error);
      
      // If deferred, edit reply, otherwise send new reply
      const replyMethod = interaction.deferred ? interaction.editReply : interaction.reply;
      await replyMethod.call(interaction, { 
        content: 'There was an error executing that command.', 
        ephemeral: true 
      });
      
      // Log command failure
      await storage.createCommandLog({
        serverId: interaction.guild.id,
        serverName: interaction.guild.name,
        channelId: interaction.channel?.id || '0',
        channelName: interaction.channel?.name || 'unknown',
        userId: interaction.user.id,
        username: interaction.user.tag,
        commandName: command.name,
        status: 'failed'
      });
    }
  }
}

// Create a singleton instance
const discordBot = new DiscordBot();
export default discordBot;
