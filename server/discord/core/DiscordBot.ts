import { 
  Client, GatewayIntentBits, Partials, Collection, Events, 
  ActivityType, AutocompleteInteraction, ChatInputCommandInteraction, 
  ContextMenuCommandInteraction, ModalSubmitInteraction, GuildMember, PartialGuildMember
} from 'discord.js';
import { Command } from '../types/CommandTypes';
import { CommandService } from '../services/CommandService';
import { ServerService } from '../services/ServerService';
import { CommandHandler } from '../handlers/CommandHandler';
import { AutocompleteHandler } from '../handlers/AutocompleteHandler';
import { ContextMenuHandler } from '../handlers/ContextMenuHandler';
import { ModalHandler } from '../handlers/ModalHandler';
import { storage } from '../../storage';
import { handleMemberJoin, handleMemberLeave } from '../../features/welcome-messages';
import { handleMessage as handleAutoMod } from '../../features/auto-moderation';
import { handleMessageDelete, handleMemberUpdate } from '../../features/logging';

class DiscordBot {
  private client!: Client;
  private token: string | null = null;
  private commands: Collection<string, Command> = new Collection();
  private startTime: Date | null = null;
  
  // Handlers
  private commandHandler!: CommandHandler;
  private autocompleteHandler!: AutocompleteHandler;
  private contextMenuHandler!: ContextMenuHandler;
  private modalHandler!: ModalHandler;
  
  constructor() {
    this.initializeClient();
  }
  
  private initializeClient() {
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
        const botId = this.client.user.id;
        let botConfig = await storage.getBotConfig(botId);
        if (botConfig) {
          await storage.updateBotConfig(botId, {
            name: this.client.user.username,
            avatarUrl: this.client.user.displayAvatarURL(),
          });
        } else {
          await storage.createBotConfig({
            botId,
            name: this.client.user.username,
            avatarUrl: this.client.user.displayAvatarURL(),
            token: this.token || '',
            prefix: '!',
            status: 'online',
            activity: '',
            activityType: 'PLAYING',
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
          });
        }
      }
      
      // Sync servers
      await ServerService.syncServers(this.client);
      
      // Set bot status based on config
      await this.updateBotStatus();
      
      // Load commands
      this.commands = await CommandService.loadCommands(this.client);
      
      // Initialize handlers
      this.commandHandler = new CommandHandler(this.client, this.commands);
      this.autocompleteHandler = new AutocompleteHandler(this.client, this.commands);
      this.contextMenuHandler = new ContextMenuHandler(this.client, this.commands);
      this.modalHandler = new ModalHandler(this.client, this.commands);
      
      // Register slash commands
      await CommandService.registerSlashCommands(this.client, this.commands, this.token || '');
    });
    
    // Handle interactions
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isChatInputCommand()) {
        await this.commandHandler.handleSlashCommand(interaction as ChatInputCommandInteraction);
      } else if (interaction.isAutocomplete()) {
        await this.autocompleteHandler.handleAutocomplete(interaction as AutocompleteInteraction);
      } else if (interaction.isContextMenuCommand()) {
        await this.contextMenuHandler.handleContextMenuCommand(interaction as ContextMenuCommandInteraction);
      } else if (interaction.isModalSubmit()) {
        await this.modalHandler.handleModalSubmit(interaction as ModalSubmitInteraction);
      }
    });
    
    this.client.on(Events.MessageCreate, async (message) => {
      // Ignore messages from bots
      if (message.author.bot) return;

      // Check for mentions to the bot
      const botConfig = await storage.getBotConfig(this.client.user?.id || 'unknown');
      
      // Check if the bot should respond to mentions and if the message mentions the bot directly
      if (botConfig?.respondToMentions && message.mentions.has(this.client.user!)) {
        await message.reply('Olá! Como posso ajudar?');
      }
      
      // Don't respond to @everyone if the respond to mentions setting is disabled
      if (!botConfig?.respondToMentions && message.mentions.everyone) {
        return;
      }

      // Auto-moderation
      await handleAutoMod(message);

      // Process commands
      if (message.content.startsWith(botConfig?.prefix || '!')) {
        // ... existing command handling code ...
      }
    });

    this.client.on(Events.MessageDelete, async (message) => {
      if (message.partial) return;
      await handleMessageDelete(message);
    });

    // Add more event handlers as needed
    this.client.on(Events.GuildMemberAdd, async (member: GuildMember | PartialGuildMember) => {
      // Check if member is partial and fetch if needed
      if (member.partial) {
        try {
          member = await member.fetch();
        } catch (error) {
          console.error('Error fetching partial member:', error);
          return;
        }
      }
      await handleMemberJoin(member as GuildMember);
    });

    this.client.on(Events.GuildMemberRemove, async (member: GuildMember | PartialGuildMember) => {
      // Check if member is partial and fetch if needed
      if (member.partial) {
        try {
          member = await member.fetch();
        } catch (error) {
          console.error('Error fetching partial member:', error);
          return;
        }
      }
      await handleMemberLeave(member as GuildMember);
    });

    this.client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
      await handleMemberUpdate(oldMember, newMember);
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
      this.initializeClient(); // reinitialize the client
    }
  }
  
  public isConnected(): boolean {
    return this.client?.isReady() || false;
  }
  
  public getUser() {
    return this.client.user;
  }
  
  public getToken(): string | null {
    return this.token;
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
  
  public async updateStatus(status: string, activity?: string, activityType?: string) {
    const botConfig = await storage.getBotConfig(this.client.user?.id || 'unknown');
    if (!botConfig) return;
    
    await storage.updateBotConfig(this.client.user?.id || 'unknown', {
      status,
      activity,
      activityType
    });
    
    await this.updateBotStatus();
  }
  
  private async updateBotStatus() {
    if (!this.client.isReady()) return;
    
    const botConfig = await storage.getBotConfig(this.client.user?.id || 'unknown');
    if (!botConfig) return;
    
    console.log('botConfigStatus', botConfig.status);

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
    
    console.log('botConfigActivity', botConfig.activity);
    console.log('botConfigActivityType', botConfig.activityType);
    // Set activity
    if (botConfig.activity) {
      this.client.user?.setActivity(botConfig.activity, { 
        type: (botConfig.activityType as unknown as ActivityType) || ActivityType.Playing
      });
    }
  }
  
  public async reloadCommands() {
    console.log('Starting command reload process...');
    
    if (!this.client.isReady() || !this.token) {
      console.log('Cannot reload commands - bot is not ready or missing token');
      return;
    }

    try {
      // Load commands from database
      this.commands = await CommandService.loadCommands(this.client);
      console.log(`Loaded ${this.commands.size} commands from database`);
      
      // Register commands with Discord API
      const response = await CommandService.registerSlashCommands(this.client, this.commands, this.token);
      
      // Reinitialize handlers with new commands
      this.commandHandler = new CommandHandler(this.client, this.commands);
      this.autocompleteHandler = new AutocompleteHandler(this.client, this.commands);
      this.contextMenuHandler = new ContextMenuHandler(this.client, this.commands);
      this.modalHandler = new ModalHandler(this.client, this.commands);
      
      return response;
    } catch (error) {
      console.error('Error during command reload:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      throw error;
    }
  }
  
  public getBotId(): string | undefined {
    return this.client.user?.id;
  }
}

// Create a singleton instance
const discordBot = new DiscordBot();
export default discordBot; 