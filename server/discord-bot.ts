import { Client, GatewayIntentBits, Partials, Collection, Events, EmbedBuilder, 
  ApplicationCommandType, ApplicationCommandOptionType, REST, Routes, Interaction, 
  ChatInputCommandInteraction, TextChannel, DMChannel, VoiceChannel, Channel, BaseGuildTextChannel,
  GuildMember, PartialGuildMember, GuildBasedChannel, AutocompleteInteraction, Role } from 'discord.js';
import axios from 'axios';
import { storage } from './storage';
import { BotConfig, Server, InsertServer, Command, InsertCommandLog, CommandOption } from '@shared/schema';
import { handleMemberJoin, handleMemberLeave } from './features/welcome-messages';
import { handleMessage as handleAutoMod } from './features/auto-moderation';
import { handleMessageDelete, handleMemberUpdate } from './features/logging';
import { eq } from 'drizzle-orm';

class DiscordBot {
  private client: Client;
  private token: string | null = null;
  private commands: Collection<string, Command> = new Collection();
  private startTime: Date | null = null;
  
  private getChannelName(channel: Channel | null): string {
    if (!channel) return 'unknown';
    if (channel instanceof BaseGuildTextChannel) return channel.name;
    if ('isDMBased' in channel && channel.isDMBased()) return 'DM';
    if ('name' in channel && typeof channel.name === 'string') return channel.name;
    return 'unknown';
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
  
  constructor() {
    this.initializeClient();
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
      if (interaction.isChatInputCommand()) {
        await this.handleSlashCommand(interaction);
      } else if (interaction.isAutocomplete()) {
        await this.handleAutocomplete(interaction);
      }
    });
    
    this.client.on(Events.MessageCreate, async (message) => {
      // Ignore messages from bots and non-text channels
      if (message.author.bot || !message.guild) return;
      
      const botConfig = await storage.getBotConfig(this.client.user?.id || 'unknown');
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
          await this.createCommandLogEntry(
            message.guild.id,
            message.guild.name,
            message.channel.id,
            this.getChannelName(message.channel),
            message.author.id,
            message.author.tag,
            command.name,
            'permission_denied',
            {},
            undefined,
            undefined,
            new Date()
          );
          
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
                name: this.getChannelName(message.channel)
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
              // Update command log with callback success
              await this.createCommandLogEntry(
                message.guild.id,
                message.guild.name,
                message.channel.id,
                this.getChannelName(message.channel),
                message.author.id,
                message.author.tag,
                command.name,
                'success',
                {},
                'success',
                undefined,
                new Date()
              );
            } else {
              console.warn(`Webhook for command ${command.name} returned status: ${webhookResponse.status}`);
              // Update command log with callback failure
              await this.createCommandLogEntry(
                message.guild.id,
                message.guild.name,
                message.channel.id,
                this.getChannelName(message.channel),
                message.author.id,
                message.author.tag,
                command.name,
                'success',
                {},
                'failed',
                `HTTP ${webhookResponse.status}`,
                new Date()
              );
            }
          } catch (error) {
            const webhookError = error instanceof Error ? error : new Error('Unknown error');
            console.error(`Error sending webhook for command ${command.name}:`, webhookError.message);
            // Update command log with callback error
            await this.createCommandLogEntry(
              message.guild.id,
              message.guild.name,
              message.channel.id,
              this.getChannelName(message.channel),
              message.author.id,
              message.author.tag,
              command.name,
              'success',
              {},
              'failed',
              webhookError.message,
              new Date()
            );
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
        await this.createCommandLogEntry(
          message.guild.id,
          message.guild.name,
          message.channel.id,
          this.getChannelName(message.channel),
          message.author.id,
          message.author.tag,
          command.name,
          'success',
          {},
          undefined,
          undefined,
          new Date()
        );
      } catch (error) {
        console.error(`Error executing command ${command.name}:`, error);
        
        // Log command failure
        await this.createCommandLogEntry(
          message.guild.id,
          message.guild.name,
          message.channel.id,
          this.getChannelName(message.channel),
          message.author.id,
          message.author.tag,
          command.name,
          'failed',
          {},
          undefined,
          undefined,
          new Date()
        );
        
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

    // Eventos de membros
    this.client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
      await handleMemberJoin(member);
    });

    this.client.on(Events.GuildMemberRemove, async (member: GuildMember | PartialGuildMember) => {
      if (member instanceof GuildMember) {
        await handleMemberLeave(member);
      }
    });

    this.client.on(Events.GuildMemberUpdate, async (oldMember: GuildMember | PartialGuildMember, newMember: GuildMember | PartialGuildMember) => {
      if (oldMember instanceof GuildMember && newMember instanceof GuildMember) {
        await handleMemberUpdate(oldMember, newMember);
      }
    });

    // Eventos de mensagens
    this.client.on(Events.MessageCreate, async (message) => {
      // Ignorar mensagens de bots
      if (message.author.bot) return;

      // Verificar menções ao bot
      const botConfig = await storage.getBotConfig(this.client.user?.id || 'unknown');
      if (botConfig?.respondToMentions && message.mentions.has(this.client.user!)) {
        await message.reply('Olá! Como posso ajudar?');
      }

      // Auto-moderação
      await handleAutoMod(message);

      // Processar comandos
      if (message.content.startsWith(botConfig?.prefix || '!')) {
        // ... existing command handling code ...
      }
    });

    this.client.on(Events.MessageDelete, async (message) => {
      if (message.partial) return;
      await handleMessageDelete(message);
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
      this.initializeClient(); // reinicializa o client
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
    const discordServers = Array.from(this.client.guilds.cache.values());
    
    // Update server count in stats
    await storage.updateBotStats({ 
      botId: this.client.user?.id || "unknown",
      serverCount: discordServers.length,
      activeUsers: discordServers.reduce((acc, guild) => acc + guild.memberCount, 0)
    });
    
    // Add all servers to database
    for (const guild of discordServers) {
      await this.addServer(guild.id, guild.name, guild.iconURL() || undefined, guild.memberCount);
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
        botId: this.client.user?.id || "unknown",
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
    
    const botConfig = await storage.getBotConfig(this.client.user?.id || 'unknown');
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
    const botId = this.client.user?.id;
    if (!botId) {
      console.error('loadCommands: botId indefinido!');
      return;
    }
    const dbCommands = await storage.getCommands(botId);
    
    // Clear current commands
    this.commands.clear();
    
    // Add commands to collection
    for (const command of dbCommands) {
      this.commands.set(command.name, command);
    }
    
    console.log(`Loaded ${this.commands.size} commands for botId ${botId}.`);
  }
  
  public async reloadCommands() {
    await this.loadCommands();
    
    // Clear existing commands before registering new ones
    if (this.client.isReady() && this.client.user && this.token) {
      try {
        const rest = new REST({ version: '10' }).setToken(this.token);
        await rest.put(
          Routes.applicationCommands(this.client.user.id),
          { body: [] }
        );
        console.log('Cleared existing slash commands');
      } catch (error) {
        console.error('Error clearing slash commands:', error);
      }
    }
    
    await this.registerSlashCommands();
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
  
  /**
   * Handle autocomplete interactions
   */
  private async handleAutocomplete(interaction: AutocompleteInteraction) {
    const command = this.commands.get(interaction.commandName);
    if (!command) {
      console.log(`Autocomplete: comando "${interaction.commandName}" não encontrado`);
      return;
    }

    const focusedOption = interaction.options.getFocused(true);
    console.log('Autocomplete interaction:', {
      commandName: interaction.commandName,
      focusedOption,
      commandOptionsType: typeof command.options,
      commandOptionsIsArray: Array.isArray(command.options),
      commandOptionsKeys: command.options ? Object.keys(command.options) : []
    });

    // Busca a opção de forma mais robusta
    let option: CommandOption | undefined;
    
    if (Array.isArray(command.options)) {
      // Se options for um array, busca pelo nome (case insensitive)
      option = command.options.find(opt => 
        opt.name.toLowerCase() === focusedOption.name.toLowerCase()
      );
      console.log(`Opção encontrada no array: ${option ? 'Sim' : 'Não'}`);
    } else if (command.options && typeof command.options === 'object') {
      // Se options for um objeto, tenta acessar diretamente
      option = command.options[focusedOption.name] as CommandOption;
      console.log(`Opção encontrada no objeto: ${option ? 'Sim' : 'Não'}`);
    }
    
    if (!option) {
      console.log('Nenhuma opção encontrada para autocomplete');
      return;
    }

    if (!option.autocomplete?.enabled) {
      console.log('Autocomplete não está habilitado para esta opção');
      return;
    }

    console.log('Configuração de autocomplete:', {
      enabled: option.autocomplete.enabled,
      service: option.autocomplete.service,
      apiUrl: option.autocomplete.apiUrl
    });

    try {
      // Aqui você pode implementar a lógica para buscar as sugestões
      // baseado no serviço especificado em option.autocomplete.service
      const suggestions = await this.getAutocompleteSuggestions(command, option, focusedOption.value);
      console.log(`Retornando ${suggestions.length} sugestões para o Discord`);

      await interaction.respond(
        suggestions.map(suggestion => ({
          name: suggestion.name,
          value: suggestion.value
        }))
      );
    } catch (error) {
      console.error('Error handling autocomplete:', error);
      await interaction.respond([]);
    }
  }

  /**
   * Get autocomplete suggestions from a service
   */
  private async getAutocompleteSuggestions(
    command: Command,
    option: CommandOption,
    input: string
  ): Promise<Array<{ name: string; value: string }>> {
    // Se tiver uma URL de API configurada, usa ela
    if (option.autocomplete?.apiUrl) {
      console.log(`Buscando sugestões da API externa: ${option.autocomplete.apiUrl}`);
      console.log(`Método: ${option.autocomplete.apiMethod || 'GET'}, Input: ${input}`);
      
      try {
        const requestConfig = {
          method: option.autocomplete.apiMethod || 'GET',
          url: option.autocomplete.apiUrl,
          headers: option.autocomplete.apiHeaders || {},
          data: option.autocomplete.apiMethod === 'POST' ? {
            ...option.autocomplete.apiBody,
            input,
            botId: this.client.user?.id
          } : undefined,
          params: option.autocomplete.apiMethod === 'GET' ? {
            ...option.autocomplete.apiBody,
            input,
            botId: this.client.user?.id
          } : undefined,
          timeout: 2500 // Timeout de 2.5 segundos para evitar atrasos longos
        };
        
        console.log('Configuração da requisição:', JSON.stringify(requestConfig, null, 2));
        
        const response = await axios(requestConfig);
        
        console.log(`Resposta da API (status ${response.status}):`, 
          typeof response.data === 'object' ? 
            JSON.stringify(response.data).substring(0, 200) + '...' : 
            response.data
        );

        // Espera que a API retorne um array de objetos com name e value
        if (Array.isArray(response.data)) {
          const validSuggestions = response.data
            .filter(item => item && item.name && item.value)
            .slice(0, 25);
            
          console.log(`Encontradas ${validSuggestions.length} sugestões válidas`);
          return validSuggestions;
        }
        
        // Se a API retornar um formato diferente, tenta adaptar
        if (typeof response.data === 'object' && response.data !== null) {
          const adaptedSuggestions = Object.entries(response.data)
            .map(([key, value]) => ({
              name: String(value),
              value: key
            }))
            .slice(0, 25);
            
          console.log(`Adaptadas ${adaptedSuggestions.length} sugestões do formato de objeto`);
          return adaptedSuggestions;
        }

        console.log('Formato de resposta não reconhecido, retornando array vazio');
        return [];
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error('Erro na chamada à API de autocomplete:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: option.autocomplete.apiUrl
          });
        } else {
          console.error('Erro desconhecido na chamada à API de autocomplete:', error);
        }
        return [];
      }
    }

    console.log(`Usando serviço interno: ${option.autocomplete?.service}`);
    
    // Se não tiver URL de API, usa os serviços internos
    switch (option.autocomplete?.service) {
      case 'servers':
        return this.getServerSuggestions(input);
      case 'channels':
        return this.getChannelSuggestions(input);
      case 'roles':
        return this.getRoleSuggestions(input);
      case 'users':
        return this.getUserSuggestions(input);
      default:
        console.log(`Serviço não reconhecido: ${option.autocomplete?.service}`);
        return [];
    }
  }

  private async getServerSuggestions(input: string): Promise<Array<{ name: string; value: string }>> {
    const servers = await storage.getServers(this.client.user?.id || 'unknown');
    return servers
      .filter(server => server.name.toLowerCase().includes(input.toLowerCase()))
      .map(server => ({
        name: server.name,
        value: server.serverId
      }))
      .slice(0, 25); // Discord limita a 25 sugestões
  }

  private async getChannelSuggestions(input: string): Promise<Array<{ name: string; value: string }>> {
    const guild = this.client.guilds.cache.first();
    if (!guild) return [];
    
    return guild.channels.cache
      .filter(channel => 
        channel.name.toLowerCase().includes(input.toLowerCase()) &&
        channel instanceof TextChannel
      )
      .map(channel => ({
        name: channel.name,
        value: channel.id
      }))
      .slice(0, 25);
  }

  private async getRoleSuggestions(input: string): Promise<Array<{ name: string; value: string }>> {
    const guild = this.client.guilds.cache.first();
    if (!guild) return [];
    
    return guild.roles.cache
      .filter(role => 
        role.name.toLowerCase().includes(input.toLowerCase())
      )
      .map(role => ({
        name: role.name,
        value: role.id
      }))
      .slice(0, 25);
  }

  private async getUserSuggestions(input: string): Promise<Array<{ name: string; value: string }>> {
    const guild = this.client.guilds.cache.first();
    if (!guild) return [];
    
    return guild.members.cache
      .filter(member => 
        member.user.username.toLowerCase().includes(input.toLowerCase())
      )
      .map(member => ({
        name: member.user.username,
        value: member.id
      }))
      .slice(0, 25);
  }

  /**
   * Register slash commands with Discord API
   */
  private async registerSlashCommands() {
    if (!this.client.isReady() || !this.token) return;
    
    try {
      console.log('Registering slash commands...');
      
      const botConfig = await storage.getBotConfig(this.client.user?.id || 'unknown');
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
      
      // Create the REST API instance with non-null token
      const rest = new REST({ version: '10' }).setToken(this.token);
      
      // Format commands for registration with detailed logging
      const slashCommands = commands.map(cmd => {
        console.log(`\nPreparing slash command: "${cmd.name}"`);
        
        const commandData: any = {
          name: cmd.name.toLowerCase(),
          description: cmd.description || `Run the ${cmd.name} command`,
          type: ApplicationCommandType.ChatInput,
        };
        
        // Add options if defined
        if (cmd.options && Array.isArray(cmd.options) && cmd.options.length > 0) {
          console.log(`Command "${cmd.name}" has ${cmd.options.length} options:`, JSON.stringify(cmd.options, null, 2));
          
          commandData.options = cmd.options.map(option => {
            // Ensure option name follows Discord requirements
            const optionName = option.name.toLowerCase().replace(/\s+/g, '_');
            
            // Determine if option is required - explicitly convert to boolean
            let isRequired = false;
            if (option.required === true) {
              isRequired = true;
            }
            
            console.log(`Processing option "${optionName}":
  - type: ${option.type}
  - required: ${isRequired}
  - description: ${option.description || `Option for ${cmd.name}`}
  - autocomplete: ${option.autocomplete?.enabled ? 'enabled' : 'disabled'}`);
            
            const optionData = {
              name: optionName,
              description: option.description || `Option for ${cmd.name}`,
              type: this.getApplicationCommandOptionType(option.type),
              required: isRequired,
              autocomplete: option.autocomplete?.enabled || false
            };
            
            console.log(`Option formatted as: ${JSON.stringify(optionData)}`);
            
            return optionData;
          });
        }
        
        return commandData;
      });
      
      console.log(`\nRegistering ${slashCommands.length} slash commands...`);
      console.log(`Full slash commands data: ${JSON.stringify(slashCommands, null, 2)}`);
      
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
        await this.createCommandLogEntry(
          interaction.guild.id,
          interaction.guild.name,
          interaction.channel?.id || '0',
          this.getChannelName(interaction.channel),
          interaction.user.id,
          interaction.user.tag,
          command.name,
          'permission_denied',
          undefined,
          undefined,
          new Date()
        );
        
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
      
      // Get option values from the interaction
      if (command.options && Array.isArray(command.options) && command.options.length > 0) {
        // Log options for debugging
        console.log('Command has options:', command.options);
        console.log('Interaction options:', interaction.options.data);
        
        // Replace option placeholders in the response
        command.options.forEach(option => {
          const optionName = option.name.toLowerCase().replace(/\s+/g, '_');
          let optionValue = '';
          
          // Get the value based on option type
          if (option.type === 'STRING') {
            optionValue = interaction.options.getString(optionName) || '';
          } else if (option.type === 'INTEGER' || option.type === 'NUMBER') {
            optionValue = String(interaction.options.getNumber(optionName) || '');
          } else if (option.type === 'BOOLEAN') {
            optionValue = String(interaction.options.getBoolean(optionName) || '');
          } else if (option.type === 'USER') {
            const user = interaction.options.getUser(optionName);
            optionValue = user ? user.username : '';
          } else if (option.type === 'CHANNEL') {
            const channel = interaction.options.getChannel(optionName);
            optionValue = channel ? channel.name : '';
          } else if (option.type === 'ROLE') {
            const role = interaction.options.getRole(optionName);
            optionValue = role ? role.name : '';
          }
          
          // Replace the placeholder in the response
          response = response.replace(`{${optionName}}`, optionValue);
        });
      }
      
      // Replace standard placeholders with actual values
      response = response
        .replace('{user}', interaction.user.username)
        .replace('{server}', interaction.guild.name)
        .replace('{ping}', this.client.ws.ping.toString());
      
      // Increment usage count
      await storage.incrementCommandUsageByBotId(this.client.user?.id || 'unknown', command.name);
      
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
          const webhookPayload: any = {
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
              name: this.getChannelName(interaction.channel)
            },
            interaction: {
              id: interaction.id,
              timestamp: interaction.createdAt
            },
            timestamp: new Date(),
            parameters: interaction.options.data.reduce((acc, option) => {
              acc[option.name] = option.value;
              return acc;
            }, {} as Record<string, any>),
            botId: this.client.user?.id || 'unknown'
          };
          
          // Add option values to the webhook payload
          if (interaction.options && interaction.options.data.length > 0) {
            webhookPayload.options = {};
            interaction.options.data.forEach(option => {
              webhookPayload.options[option.name] = option.value;
            });
          }

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
            // Update command log with callback success
            await storage.createCommandLog({
              botId: this.client.user?.id || 'unknown',
              serverId: interaction.guild.id,
              serverName: interaction.guild.name,
              channelId: interaction.channel?.id ?? '0',
              channelName: this.getChannelName(interaction.channel),
              userId: interaction.user.id,
              username: interaction.user.tag,
              commandName: command.name,
              status: 'success',
              timestamp: new Date(),
              parameters: interaction.options.data.reduce((acc, option) => {
                acc[option.name] = option.value;
                return acc;
              }, {} as Record<string, any>),
              callbackStatus: 'success',
              callbackTimestamp: new Date()
            });
          } else {
            console.warn(`Webhook for command ${command.name} returned status: ${webhookResponse.status}`);
            // Update command log with callback failure
            await storage.createCommandLog({
              botId: this.client.user?.id || 'unknown',
              serverId: interaction.guild.id,
              serverName: interaction.guild.name,
              channelId: interaction.channel?.id ?? '0',
              channelName: this.getChannelName(interaction.channel),
              userId: interaction.user.id,
              username: interaction.user.tag,
              commandName: command.name,
              status: 'success',
              timestamp: new Date(),
              parameters: interaction.options.data.reduce((acc, option) => {
                acc[option.name] = option.value;
                return acc;
              }, {} as Record<string, any>),
              callbackStatus: 'failed',
              callbackError: `HTTP ${webhookResponse.status}`,
              callbackTimestamp: new Date()
            });
          }
        } catch (error) {
          const webhookError = error instanceof Error ? error : new Error('Unknown error');
          console.error(`Error sending webhook for command ${command.name}:`, webhookError.message);
          // Update command log with callback error
          await storage.createCommandLog({
            botId: this.client.user?.id || 'unknown',
            serverId: interaction.guild.id,
            serverName: interaction.guild.name,
            channelId: interaction.channel?.id ?? '0',
            channelName: this.getChannelName(interaction.channel),
            userId: interaction.user.id,
            username: interaction.user.tag,
            commandName: command.name,
            status: 'success',
            timestamp: new Date(),
            parameters: interaction.options.data.reduce((acc, option) => {
              acc[option.name] = option.value;
              return acc;
            }, {} as Record<string, any>),
            callbackStatus: 'failed',
            callbackError: webhookError.message,
            callbackTimestamp: new Date()
          });
        }
      } else if (command.webhookUrl) {
        console.warn(`Invalid webhook URL format for command ${command.name}: ${command.webhookUrl}`);
      }
      
      // Se o comando NÃO tem webhook, registrar o log normalmente
      if (!command.webhookUrl) {
        await storage.createCommandLog({
          botId: this.client.user?.id || 'unknown',
          serverId: interaction.guild.id,
          serverName: interaction.guild.name,
          channelId: interaction.channel?.id ?? '0',
          channelName: this.getChannelName(interaction.channel),
          userId: interaction.user.id,
          username: interaction.user.tag,
          commandName: command.name,
          status: 'success',
          timestamp: new Date(),
          parameters: interaction.options.data.reduce((acc, option) => {
            acc[option.name] = option.value;
            return acc;
          }, {} as Record<string, any>)
        });
      }
    } catch (error) {
      console.error(`Error executing slash command ${command.name}:`, error);
      
      // If deferred, edit reply, otherwise send new reply
      const replyMethod = interaction.deferred ? interaction.editReply : interaction.reply;
      await replyMethod({ 
        content: 'There was an error executing that command.', 
        ephemeral: true 
      });
      
      // Log command failure
      await storage.createCommandLog({
        botId: this.client.user?.id || 'unknown',
        serverId: interaction.guild.id,
        serverName: interaction.guild.name,
        channelId: interaction.channel?.id ?? '0',
        channelName: this.getChannelName(interaction.channel),
        userId: interaction.user.id,
        username: interaction.user.tag,
        commandName: command.name,
        status: 'failed',
        timestamp: new Date(),
        parameters: {}
      });
    }
  }
  
  /**
   * Convert string option type to Discord.js ApplicationCommandOptionType
   */
  private getApplicationCommandOptionType(type: string): number {
    // These values match Discord's API requirements
    // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
    const ApplicationCommandOptionType = {
      'STRING': 3,
      'INTEGER': 4,
      'BOOLEAN': 5,
      'USER': 6,
      'CHANNEL': 7,
      'ROLE': 8,
      'MENTIONABLE': 9,
      'NUMBER': 10,
      'ATTACHMENT': 11
    };
    
    return ApplicationCommandOptionType[type as keyof typeof ApplicationCommandOptionType] || 3; // Default to STRING
  }

  private async createCommandLogEntry(
    serverId: string,
    serverName: string,
    channelId: string,
    channelName: string,
    userId: string,
    username: string,
    commandName: string,
    status: 'success' | 'failed' | 'permission_denied',
    parameters: Record<string, any> = {},
    callbackStatus?: string,
    callbackError?: string,
    callbackTimestamp?: Date
  ): Promise<void> {
    await storage.createCommandLog({
      botId: this.client.user?.id || 'unknown',
      serverId,
      serverName,
      channelId,
      channelName,
      userId,
      username,
      commandName,
      status,
      timestamp: new Date(),
      parameters,
      callbackStatus,
      callbackError,
      callbackTimestamp
    });
  }
}

// Create a singleton instance
const discordBot = new DiscordBot();
export default discordBot;
