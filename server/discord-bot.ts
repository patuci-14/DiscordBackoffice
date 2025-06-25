import { Client, GatewayIntentBits, Partials, Collection, Events, EmbedBuilder, 
  ApplicationCommandType, ApplicationCommandOptionType, REST, Routes, Interaction, 
  ChatInputCommandInteraction, TextChannel, DMChannel, VoiceChannel, Channel, BaseGuildTextChannel,
  GuildMember, PartialGuildMember, GuildBasedChannel, AutocompleteInteraction, Role,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ButtonInteraction, ActivityType,
  ContextMenuCommandInteraction, User, ModalBuilder, TextInputBuilder, TextInputStyle, ModalSubmitInteraction, MessageFlags } from 'discord.js';
import axios from 'axios';
import { storage } from './storage';
import { BotConfig, Server, InsertServer, Command, InsertCommandLog, CommandOption, BotStat } from '@shared/schema';
import { handleMemberJoin, handleMemberLeave } from './features/welcome-messages';
import { handleMessage as handleAutoMod } from './features/auto-moderation';
import { handleMessageDelete, handleMemberUpdate } from './features/logging';
import { eq } from 'drizzle-orm';

// Define modal field interface
interface ModalField {
  customId: string;
  label: string;
  style: 'SHORT' | 'PARAGRAPH';
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  value?: string;
}

class DiscordBot {
  private client!: Client;
  private token: string | null = null;
  private commands: Collection<string, Command> = new Collection();
  private startTime: Date | null = null;
  private autocompleteCache: Map<string, { data: any[], timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds cache TTL
  
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
      } else if (interaction.isContextMenuCommand()) {
        await this.handleContextMenuCommand(interaction);
      } else if (interaction.isModalSubmit()) {
        await this.handleModalSubmit(interaction);
      }
    });
    
    this.client.on(Events.MessageCreate, async (message) => {
      // Ignorar mensagens de bots
      if (message.author.bot) return;

      // Verificar menções ao bot
      const botConfig = await storage.getBotConfig(this.client.user?.id || 'unknown');
      
      // Verificar se o bot deve responder a menções e se a mensagem menciona o bot diretamente
      if (botConfig?.respondToMentions && message.mentions.has(this.client.user!)) {
        await message.reply('Olá! Como posso ajudar?');
      }
      
      // Não responder a @everyone se a configuração de responder a menções estiver desativada
      if (!botConfig?.respondToMentions && message.mentions.everyone) {
        return;
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
  
  private async loadCommands() {
    try {
      console.log('Starting command loading process...');
      
      // Load commands from database
      const botId = this.client.user?.id;
      if (!botId) {
        console.error('loadCommands: botId is undefined!');
        return;
      }
      
      console.log(`Fetching commands for botId: ${botId}`);
      const dbCommands = await storage.getCommands(botId);
      console.log(`Retrieved ${dbCommands.length} commands from database`);
      
      // Clear current commands
      this.commands.clear();
      console.log('Cleared existing commands collection');
      
      // Add commands to collection
      for (const command of dbCommands) {
        try {
          console.log(`Processing command: ${command.name}`);
          this.commands.set(command.name, command);
        } catch (error) {
          console.error(`Error processing command ${command.name}:`, error);
        }
      }
      
      console.log(`Successfully loaded ${this.commands.size} commands`);
    } catch (error) {
      console.error('Error in loadCommands:', error);
      throw error;
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
      await this.loadCommands();
      console.log(`Loaded ${this.commands.size} commands from database`);
      
      const rest = new REST({ version: '10' }).setToken(this.token);
      
      // Get all active commands
      const commands = Array.from(this.commands.values()).filter(cmd => 
        cmd.active && (cmd.type === 'slash' || cmd.type === 'context-menu' || cmd.type === 'modal')
      );
      
      console.log(`Found ${commands.length} active commands to register`);
      
      if (commands.length === 0) {
        console.log('No active commands to register');
        return;
      }

      // Format commands for registration - otimizado para ser mais rápido
      console.log('Formatting commands for registration...');
      const slashCommands = commands.map(cmd => {
        const commandData = {
          name: cmd.name.toLowerCase(),
          description: cmd.description || `Run the ${cmd.name} command`,
          type: ApplicationCommandType.ChatInput,
          options: cmd.options
        };

        if (cmd.options && Array.isArray(cmd.options) && cmd.options.length > 0) {
          commandData.options = cmd.options.map(option => ({
            name: option.name.toLowerCase().replace(/\s+/g, '_'),
            description: option.description || `Option for ${cmd.name}`,
            type: this.getApplicationCommandOptionType(option.type.toUpperCase()),
            required: option.required === true,
            autocomplete: option.autocomplete?.enabled || false
          }));
        }

        return commandData;
      });

      console.log('Registering commands with Discord API...');
      
      // Configuração do REST para ser mais rápido
      const restConfig = {
        body: slashCommands,
        timeout: 10000, // 10 segundos de timeout
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Precision': 'millisecond'
        }
      };

      // Registra os comandos em uma única chamada
      const response = await rest.put(
        Routes.applicationCommands(this.client.user!.id),
        restConfig
      );

      console.log(`Successfully registered ${slashCommands.length} commands`);
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
    try {
      // Verifica se a interação ainda é válida
      if (!interaction.isAutocomplete()) {
        console.log('Interaction is not an autocomplete');
        return;
      }

      // Verifica se o bot está pronto
      if (!this.client.isReady()) {
        console.log('Bot is not ready');
        return;
      }

      console.log('Handling autocomplete interaction...');
      const command = this.commands.get(interaction.commandName);
      if (!command) {
        console.log(`Autocomplete: command "${interaction.commandName}" not found`);
        return;
      }

      const focusedOption = interaction.options.getFocused(true);
      console.log('Processing autocomplete for:', {
        commandName: interaction.commandName,
        focusedOption: focusedOption.name,
        value: focusedOption.value
      });

      // Busca a opção de forma mais robusta
      let option: CommandOption | undefined;
      
      if (Array.isArray(command.options)) {
        option = command.options.find(opt => 
          opt.name.toLowerCase() === focusedOption.name.toLowerCase()
        );
        console.log(`Option found in array: ${option ? 'Yes' : 'No'}`);
      } else if (command.options && typeof command.options === 'object') {
        option = command.options[focusedOption.name as keyof typeof command.options] as CommandOption;
        console.log(`Option found in object: ${option ? 'Yes' : 'No'}`);
      }
      
      if (!option) {
        console.log('No option found for autocomplete');
        return;
      }

      if (!option.autocomplete?.enabled) {
        console.log('Autocomplete not enabled for this option');
        return;
      }

      // Verifica se a interação ainda é válida antes de buscar sugestões
      if (!interaction.isAutocomplete()) {
        console.log('Interaction expired before getting suggestions');
        return;
      }

      console.log('Getting autocomplete suggestions...');
      const suggestions = await this.getAutocompleteSuggestions(command, option, focusedOption.value, interaction);
      console.log(`Retrieved ${suggestions.length} suggestions`);

      // Verifica se a interação ainda é válida antes de responder
      if (!interaction.isAutocomplete()) {
        console.log('Interaction expired before responding');
        return;
      }

      // Adiciona um timeout de 1.5 segundos para garantir que respondemos antes do limite do Discord
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Autocomplete timeout')), 1500);
      });

      console.log('Responding to autocomplete interaction...');
      await Promise.race([
        interaction.respond(
          suggestions.map(suggestion => ({
            name: suggestion.name,
            value: suggestion.value
          }))
        ),
        timeoutPromise
      ]);
      console.log('Successfully responded to autocomplete interaction');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Autocomplete timeout') {
          console.log('Autocomplete timeout - could not respond in time');
          return;
        }
        if (error.message.includes('Unknown interaction')) {
          console.log('Interaction expired - could not respond in time');
          return;
        }
      }
      console.error('Error handling autocomplete:', error);
      try {
        if (interaction.isAutocomplete()) {
          await interaction.respond([]);
        }
      } catch (e) {
        console.log('Could not respond to interaction after error');
      }
    }
  }

  /**
   * Get autocomplete suggestions from a service
   */
  private async getAutocompleteSuggestions(
    command: Command,
    option: CommandOption,
    input: string,
    interaction: AutocompleteInteraction
  ): Promise<Array<{ name: string; value: string }>> {
    const cacheKey = `${command.name}_${option.name}_${input}`;
    const cached = this.autocompleteCache.get(cacheKey);
    
    // Check cache first
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('Using cached autocomplete suggestions');
      return cached.data;
    }

    // Coletar todos os parâmetros já informados para usar como filtros
    const previousParameters: Record<string, any> = {};
    
    if (command.options && Array.isArray(command.options)) {
      command.options.forEach(cmdOption => {
        if (cmdOption.name !== option.name) { // Não incluir o parâmetro atual
          try {
            // Verificar se deve usar este parâmetro como filtro
            const shouldUseAsFilter = option.autocomplete?.usePreviousParameters && 
              (!option.autocomplete?.filterByParameters || 
               option.autocomplete?.filterByParameters.length === 0 ||
               option.autocomplete?.filterByParameters.includes(cmdOption.name));
            
            if (!shouldUseAsFilter) {
              return; // Pular este parâmetro se não deve ser usado como filtro
            }
            
            // Normalizar o nome da opção para corresponder ao que o Discord envia
            const normalizedOptionName = cmdOption.name.toLowerCase().replace(/\s+/g, '_');
            
            // Tentar obter o valor do parâmetro usando apenas métodos disponíveis em autocomplete
            let value: any = null;
            
            // Tentar acessar via data (método mais confiável para autocomplete)
            const optionData = interaction.options.data.find(opt => 
              opt.name === normalizedOptionName || opt.name === cmdOption.name
            );
            
            if (optionData && optionData.value !== undefined) {
              switch (cmdOption.type) {
                case 'STRING':
                case 'INTEGER':
                case 'BOOLEAN':
                  value = optionData.value;
                  break;
                case 'USER':
                  if (optionData.user) {
                    value = { id: optionData.user.id, username: optionData.user.username };
                  } else if (optionData.value) {
                    // Se apenas o ID estiver disponível
                    value = { id: optionData.value, username: 'Unknown User' };
                  }
                  break;
                case 'CHANNEL':
                  if (optionData.channel) {
                    value = { id: optionData.channel.id, name: optionData.channel.name };
                  } else if (optionData.value) {
                    // Se apenas o ID estiver disponível
                    value = { id: optionData.value, name: 'Unknown Channel' };
                  }
                  break;
                case 'ROLE':
                  if (optionData.role) {
                    value = { id: optionData.role.id, name: optionData.role.name };
                  } else if (optionData.value) {
                    // Se apenas o ID estiver disponível
                    value = { id: optionData.value, name: 'Unknown Role' };
                  }
                  break;
                case 'ATTACHMENT':
                  if (optionData.attachment) {
                    value = {
                      id: optionData.attachment.id,
                      name: optionData.attachment.name,
                      url: optionData.attachment.url,
                      size: optionData.attachment.size
                    };
                  }
                  break;
              }
            }
            
            // Tentar usando os métodos básicos disponíveis em autocomplete
            if (value === null || value === undefined) {
              try {
                switch (cmdOption.type) {
                  case 'STRING':
                    value = interaction.options.getString(normalizedOptionName);
                    break;
                  case 'INTEGER':
                    value = interaction.options.getInteger(normalizedOptionName);
                    break;
                  case 'BOOLEAN':
                    value = interaction.options.getBoolean(normalizedOptionName);
                    break;
                }
              } catch (getError) {
                // Método não disponível em autocomplete, isso é esperado
                console.log(`Method not available for ${normalizedOptionName} in autocomplete context`);
              }
            }
            
            if (value !== null && value !== undefined) {
              previousParameters[cmdOption.name] = value;
              console.log(`Added parameter ${cmdOption.name} with value:`, value);
            }
          } catch (error) {
            // Parâmetro não foi informado ainda, ignorar
            console.log(`Parameter ${cmdOption.name} not provided yet or error accessing:`, error);
          }
        }
      });
    }

    console.log('Previous parameters for autocomplete filtering:', previousParameters);
    console.log('All interaction options data:', interaction.options.data);
    console.log('Command options being checked:', Array.isArray(command.options) ? command.options.map((opt: CommandOption) => ({
      name: opt.name,
      type: opt.type,
      normalizedName: opt.name.toLowerCase().replace(/\s+/g, '_')
    })) : 'No options array');

    // Se tiver uma URL de API configurada, usa ela
    if (option.autocomplete?.apiUrl) {
      console.log(`Fetching suggestions from external API: ${option.autocomplete.apiUrl}`);
      
      try {
        const requestConfig = {
          method: option.autocomplete.apiMethod || 'GET',
          url: option.autocomplete.apiUrl,
          headers: option.autocomplete.apiHeaders || {},
          data: option.autocomplete.apiMethod === 'POST' ? {
            ...option.autocomplete.apiBody,
            input,
            botId: this.client.user?.id,
            previousParameters, // Adicionar parâmetros anteriores
            currentParameter: option.name // Nome do parâmetro atual
          } : undefined,
          params: option.autocomplete.apiMethod === 'GET' ? {
            ...option.autocomplete.apiBody,
            input,
            botId: this.client.user?.id,
            previousParameters: JSON.stringify(previousParameters), // Para GET, serializar como string
            currentParameter: option.name
          } : undefined,
          timeout: 1500 // Reduced timeout to 1.5 seconds
        };
        
        const response = await axios(requestConfig);
        
        let suggestions: Array<{ name: string; value: string }> = [];
        
        // Process response data
        if (Array.isArray(response.data)) {
          suggestions = response.data
            .filter(item => item && item.name && item.value)
            .slice(0, 25);
        } else if (typeof response.data === 'object' && response.data !== null) {
          suggestions = Object.entries(response.data)
            .map(([key, value]) => ({
              name: String(value),
              value: key
            }))
            .slice(0, 25);
        }

        // Cache the results
        this.autocompleteCache.set(cacheKey, {
          data: suggestions,
          timestamp: Date.now()
        });
        
        return suggestions;
      } catch (error) {
        console.error('Error fetching autocomplete suggestions:', error);
        return [];
      }
    }

    // Se não tiver URL de API, usa os serviços internos com filtros
    let suggestions: Array<{ name: string; value: string }> = [];
    
    switch (option.autocomplete?.service) {
      case 'servers':
        suggestions = await this.getServerSuggestions(input, previousParameters);
        break;
      case 'channels':
        suggestions = await this.getChannelSuggestions(input, previousParameters);
        break;
      case 'roles':
        suggestions = await this.getRoleSuggestions(input, previousParameters);
        break;
      case 'users':
        suggestions = await this.getUserSuggestions(input, previousParameters);
        break;
    }

    // Cache the results
    this.autocompleteCache.set(cacheKey, {
      data: suggestions,
      timestamp: Date.now()
    });

    return suggestions;
  }

  private async getServerSuggestions(input: string, previousParameters: Record<string, any>): Promise<Array<{ name: string; value: string }>> {
    const servers = await storage.getServers(this.client.user?.id || 'unknown');
    return servers
      .filter(server => server.name.toLowerCase().includes(input.toLowerCase()))
      .map(server => ({
        name: server.name,
        value: server.serverId
      }))
      .slice(0, 25); // Discord limita a 25 sugestões
  }

  private async getChannelSuggestions(input: string, previousParameters: Record<string, any>): Promise<Array<{ name: string; value: string }>> {
    const guild = this.client.guilds.cache.first();
    if (!guild) return [];
    
    let channels = guild.channels.cache
      .filter(channel => 
        channel.name.toLowerCase().includes(input.toLowerCase()) &&
        channel instanceof TextChannel
      );

    // Exemplo de filtro baseado em parâmetro anterior
    // Se foi especificado um servidor anteriormente, filtrar apenas canais desse servidor
    if (previousParameters.server_id) {
      // Aqui você poderia filtrar canais baseado no servidor selecionado
      console.log(`Filtering channels for server: ${previousParameters.server_id}`);
    }

    // Se foi especificado um tipo de canal anteriormente
    if (previousParameters.channel_type) {
      channels = channels.filter(channel => {
        switch (previousParameters.channel_type) {
          case 'text':
            return channel instanceof TextChannel;
          case 'voice':
            return channel instanceof VoiceChannel;
          default:
            return true;
        }
      });
    }
    
    return channels
      .map(channel => ({
        name: channel.name,
        value: channel.id
      }))
      .slice(0, 25);
  }

  private async getRoleSuggestions(input: string, previousParameters: Record<string, any>): Promise<Array<{ name: string; value: string }>> {
    const guild = this.client.guilds.cache.first();
    if (!guild) return [];
    
    let roles = guild.roles.cache
      .filter(role => 
        role.name.toLowerCase().includes(input.toLowerCase())
      );

    // Exemplo de filtro baseado em parâmetro anterior
    // Se foi especificado um usuário anteriormente, mostrar apenas cargos que o usuário pode gerenciar
    if (previousParameters.user_id) {
      const member = await guild.members.fetch(previousParameters.user_id).catch(() => null);
      if (member) {
        // Filtrar apenas cargos que o membro pode gerenciar
        roles = roles.filter(role => 
          member.permissions.has('ManageRoles') && 
          role.position < member.roles.highest.position
        );
      }
    }

    // Se foi especificado um tipo de cargo anteriormente
    if (previousParameters.role_type) {
      roles = roles.filter(role => {
        switch (previousParameters.role_type) {
          case 'moderator':
            return role.permissions.has('ManageMessages') || role.permissions.has('KickMembers');
          case 'admin':
            return role.permissions.has('Administrator');
          default:
            return true;
        }
      });
    }
    
    return roles
      .map(role => ({
        name: role.name,
        value: role.id
      }))
      .slice(0, 25);
  }

  private async getUserSuggestions(input: string, previousParameters: Record<string, any>): Promise<Array<{ name: string; value: string }>> {
    const guild = this.client.guilds.cache.first();
    if (!guild) return [];
    
    let members = guild.members.cache
      .filter(member => 
        member.user.username.toLowerCase().includes(input.toLowerCase())
      );

    // Exemplo de filtro baseado em parâmetro anterior
    // Se foi especificado um cargo anteriormente, mostrar apenas usuários com esse cargo
    if (previousParameters.role_id) {
      members = members.filter(member => 
        member.roles.cache.has(previousParameters.role_id)
      );
    }

    // Se foi especificado um canal anteriormente, mostrar apenas usuários que podem ver esse canal
    if (previousParameters.channel_id) {
      const channel = guild.channels.cache.get(previousParameters.channel_id);
      if (channel) {
        members = members.filter(member => 
          channel.permissionsFor(member).has('ViewChannel')
        );
      }
    }

    // Se foi especificado um status de usuário anteriormente
    if (previousParameters.user_status) {
      members = members.filter(member => {
        switch (previousParameters.user_status) {
          case 'online':
            return member.presence?.status === 'online';
          case 'offline':
            return !member.presence || member.presence.status === 'offline';
          case 'idle':
            return member.presence?.status === 'idle';
          case 'dnd':
            return member.presence?.status === 'dnd';
          default:
            return true;
        }
      });
    }
    
    return members
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
    if (!this.client.isReady() || !this.token) {
      console.log('Cannot register slash commands - bot is not ready or missing token');
      return;
    }
    
    try {
      console.log('Starting command registration...');
      
      const botConfig = await storage.getBotConfig(this.client.user?.id || 'unknown');
      if (!botConfig || !botConfig.useSlashCommands) {
        console.log('Slash commands are disabled in config.');
        return;
      }
      
      // Get all active commands
      const commands = Array.from(this.commands.values()).filter(cmd => 
        cmd.active && (cmd.type === 'slash' || cmd.type === 'context-menu' || cmd.type === 'modal')
      );
      
      if (commands.length === 0) {
        console.log('No active commands to register.');
        return;
      }
      
      console.log(`Found ${commands.length} active commands to register.`);
      
      // Create the REST API instance
      const rest = new REST({ version: '10' }).setToken(this.token);
      
      // Format commands for registration
      const applicationCommands = commands.map(cmd => {
        console.log(`\nPreparing command: "${cmd.name}"`);
        
        if (cmd.type === 'context-menu') {
          return {
            name: cmd.name.toLowerCase(),
            type: cmd.contextMenuType === 'message' ? 
              ApplicationCommandType.Message : 
              ApplicationCommandType.User
          };
        }
        
        const commandData: any = {
          name: cmd.name.toLowerCase(),
          description: cmd.description || `Run the ${cmd.name} command`,
          type: ApplicationCommandType.ChatInput,
        };
        
        // Add options if defined
        if (cmd.options && Array.isArray(cmd.options) && cmd.options.length > 0) {
          console.log(`Command "${cmd.name}" has ${cmd.options.length} options`);
          
          commandData.options = cmd.options.map(option => {
            const optionName = option.name.toLowerCase().replace(/\s+/g, '_');
            const isRequired = option.required === true;
            
            console.log(`Processing option "${optionName}":
  - type: ${option.type}
  - required: ${isRequired}
  - description: ${option.description || `Option for ${cmd.name}`}
  - autocomplete: ${option.autocomplete?.enabled ? 'enabled' : 'disabled'}`);
            
            return {
              name: optionName,
              description: option.description || `Option for ${cmd.name}`,
              type: this.getApplicationCommandOptionType(option.type.toUpperCase()),
              required: isRequired,
              autocomplete: option.autocomplete?.enabled || false
            };
          });
        }
        
        return commandData;
      });
      
      console.log(`\nRegistering ${applicationCommands.length} commands...`);
      
      if (this.client.user) {
        // Register commands globally
        const response = await rest.put(
          Routes.applicationCommands(this.client.user.id),
          { body: applicationCommands }
        );
        
        console.log('Successfully registered application commands:', response);
      }
    } catch (error) {
      console.error('Error registering commands:', error);
      throw error;
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
        flags: [MessageFlags.Ephemeral] 
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
        flags: [MessageFlags.Ephemeral] 
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
          'Permissão Negada',
          undefined,
          undefined,
          new Date().toISOString()
        );
        
        return interaction.reply({ 
          content: 'You do not have permission to use this command.', 
          flags: [MessageFlags.Ephemeral] 
        });
      }
    }
    
    try {
      // Check if command requires a modal
      if (command.type === 'modal' && command.modalFields) {
        const modal = new ModalBuilder()
          .setCustomId(command.modalFields.customId)
          .setTitle(command.modalFields.title);

        // Add text input components
        const rows = command.modalFields.fields.map((field: ModalField) => {
          const textInput = new TextInputBuilder()
            .setCustomId(field.customId)
            .setLabel(field.label)
            .setStyle(field.style === 'SHORT' ? TextInputStyle.Short : TextInputStyle.Paragraph)
            .setRequired(field.required || false);

          if (field.placeholder) {
            textInput.setPlaceholder(field.placeholder);
          }
          if (field.minLength) {
            textInput.setMinLength(field.minLength);
          }
          if (field.maxLength) {
            textInput.setMaxLength(field.maxLength);
          }
          if (field.value) {
            textInput.setValue(field.value);
          }

          return new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);
        });

        modal.addComponents(rows);
        await interaction.showModal(modal);
        return;
      }
      
      // Collect parameters from the interaction
      const parameters: Record<string, any> = {};
      if (interaction.options && interaction.options.data.length > 0) {
        interaction.options.data.forEach(option => {
          let value = option.value;
          // Handle attachment type
          if (option.type === ApplicationCommandOptionType.Attachment) {
            const attachment = interaction.options.getAttachment(option.name);
            if (attachment) {
              value = JSON.stringify({
                url: attachment.url,
                name: attachment.name,
                extension: attachment.name.split('.').pop() || '',
                contentType: attachment.contentType || 'unknown',
                size: attachment.size
              });
            }
          }
          parameters[option.name] = value;
        });
      }

      // Check if command requires confirmation
      if ('requireConfirmation' in command && command.requireConfirmation) {
        // Prepare confirmation message with parameters
        let confirmationMessage = command.confirmationMessage || 'Are you sure you want to proceed with this action?';

        // Replace specific parameter placeholders
        Object.entries(parameters).forEach(([key, value]) => {
          // Handle attachment object
          if (typeof value === 'object' && value !== null && 'url' in value) {
            // Replace {param:key} with formatted attachment info
            confirmationMessage = confirmationMessage.replace(
              `{param:${key}}`, 
              `${value.name} (${value.extension.toUpperCase()}): ${value.url}`
            );
            
            // Add support for specific file properties
            confirmationMessage = confirmationMessage
              .replace(`{param:${key}.name}`, value.name)
              .replace(`{param:${key}.extension}`, value.extension.toUpperCase())
              .replace(`{param:${key}.url}`, value.url)
              .replace(`{param:${key}.size}`, `${Math.round(value.size / 1024)} KB`);
          } else {
            // Regular parameter replacement
            confirmationMessage = confirmationMessage.replace(`{param:${key}}`, String(value));
          }
        });

        // Format parameters for {params} placeholder
        if (confirmationMessage.includes('{params}')) {
          // Create a formatted string of all parameters
          const paramsText = Object.entries(parameters)
            .map(([key, value]) => {
              if (typeof value === 'object' && value !== null && 'url' in value) {
                return `${key}: ${value.name} (${value.extension.toUpperCase()}) - ${value.url}`;
              }
              return `${key}: ${value}`;
            })
            .join('\n');
          confirmationMessage = confirmationMessage.replace('{params}', paramsText);
        }

        // Replace standard placeholders
        confirmationMessage = confirmationMessage
          .replace('{user}', interaction.user.username)
          .replace('{server}', interaction.guild.name);

        // Create confirmation buttons
        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('confirm')
              .setLabel('Sim')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('cancel')
              .setLabel('Não')
              .setStyle(ButtonStyle.Danger)
          );

        // Send confirmation message with buttons
        const reply = await interaction.reply({
          content: confirmationMessage,
          components: [row],
          flags: [MessageFlags.Ephemeral]
        });

        // Create a collector for button interactions
        const collector = reply.createMessageComponentCollector({ 
          componentType: ComponentType.Button,
          time: 60000 // 1 minute timeout
        });

        collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
          if (buttonInteraction.user.id !== interaction.user.id) {
            return buttonInteraction.reply({
              content: 'Only the command initiator can use these buttons.',
              flags: [MessageFlags.Ephemeral]
            });
          }

          // Disable the buttons
          const disabledRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('confirm')
                .setLabel('Sim')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('cancel')
                .setLabel('Não')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true)
            );

          await buttonInteraction.update({ components: [disabledRow] });

          if (buttonInteraction.customId === 'confirm') {
            // Process the command
            await this.processCommand(command, interaction, parameters);
          } else {
            // Handle cancellation
            const cancelMessage = command.cancelMessage || 'Ação cancelada.';
            await buttonInteraction.followUp({
              content: cancelMessage,
              flags: [MessageFlags.Ephemeral]
            });
          }
        });

        collector.on('end', async (collected) => {
          if (collected.size === 0) {
            // No button was pressed within the time limit
            await interaction.editReply({
              content: 'Tempo de confirmação esgotado.',
              components: []
            });
          }
        });
      } else {
        // No confirmation required, process the command directly
        await this.processCommand(command, interaction, parameters);
      }
    } catch (error) {
      console.error(`Erro ao executar o comando ${commandName}:`, error);
      
      // Try to send an error message
      try {
        if (interaction.deferred) {
          await interaction.editReply('Ocorreu um erro ao executar este comando.');
        } else {
          await interaction.reply({ content: 'Ocorreu um erro ao executar este comando.', flags: [MessageFlags.Ephemeral] });
        }
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
      
      // Log the error
      await this.createCommandLogEntry(
        interaction.guild.id,
        interaction.guild.name,
        interaction.channel?.id || '0',
        this.getChannelName(interaction.channel),
        interaction.user.id,
        interaction.user.tag,
        command.name,
        'Erro',
        {},
        undefined,
        String(error),
        new Date()
      );
    }
  }

  // Update the processCommand method signature to accept both interaction types
  private async processCommand(
    command: Command, 
    interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
    parameters: Record<string, any>
  ) {
    // Defer reply if not already deferred
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: command.deleteUserMessage ? undefined : [MessageFlags.Ephemeral] });
    }
    
    // Process the command
    let response = command.response;
    
    // Replace option placeholders in the response
    if (command.options && Array.isArray(command.options) && command.options.length > 0) {
      command.options.forEach(option => {
        const optionName = option.name.toLowerCase().replace(/\s+/g, '_');
        let optionValue = parameters[optionName] || '';
        
        // Handle attachment object
        if (typeof optionValue === 'object' && optionValue !== null && 'url' in optionValue) {
          // Format attachment information
          optionValue = `${optionValue.name} (${optionValue.extension.toUpperCase()}): ${optionValue.url}`;
        }
        
        // Replace the placeholder in the response
        response = response.replace(`{${optionName}}`, String(optionValue));
      });
    }
    
    // Replace standard placeholders with actual values
    response = response
      .replace('{user}', interaction.user.username)
      .replace('{server}', interaction.guild!.name)
      .replace('{ping}', this.client.ws.ping.toString());
    
    // Increment usage count
    await storage.incrementCommandUsageByBotId(this.client.user?.id || 'unknown', command.name);
    
    // Send the response based on command type
    if (command.type === 'embed') {
      const embed = new EmbedBuilder()
        .setColor('#7289DA')
        .setDescription(response);
        
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.followUp({ embeds: [embed], flags: command.deleteUserMessage ? undefined : [MessageFlags.Ephemeral] });
      }
    } else {
      if (interaction.deferred) {
        await interaction.editReply(response);
      } else {
        await interaction.followUp({ content: response, flags: command.deleteUserMessage ? undefined : [MessageFlags.Ephemeral] });
      }
    }
    
    // Handle webhook if configured
    let webhookStatus: 'Sucesso' | 'Erro' | undefined = undefined;
    let webhookError: string | undefined = undefined;
    let webhookTimestamp: Date | undefined = undefined;

    if (command.webhookUrl && command.webhookUrl.trim() && /^https?:\/\/.+/i.test(command.webhookUrl)) {
      try {
        // Create a webhook URL for follow-up messages
        const applicationId = this.client.user?.id || 'unknown';
        const followUpWebhookUrl = `https://discord.com/api/webhooks/${applicationId}/${interaction.token}`;
        
        const webhookPayload = {
          command: command.name,
          user: {
            id: interaction.user.id,
            username: interaction.user.username,
            discriminator: interaction.user.discriminator,
            avatarUrl: interaction.user.displayAvatarURL()
          },
          server: {
            id: interaction.guild?.id || 'unknown',
            name: interaction.guild?.name || 'DM',
          },
          channel: {
            id: interaction.channelId,
            name: this.getChannelName(interaction.channel)
          },
          interaction: {
            id: interaction.id,
            token: interaction.token,
            followUpWebhookUrl: followUpWebhookUrl // Add the webhook URL for follow-up messages
          },
          parameters,
          timestamp: new Date(),
          botId: this.client.user?.id || 'unknown'
        };
        
        const webhookResponse = await axios.post(command.webhookUrl, webhookPayload, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Discord-Bot-Manager'
          },
          timeout: 5000,
          validateStatus: status => status < 500
        });
        
        webhookTimestamp = new Date();
        webhookStatus = webhookResponse.status >= 200 && webhookResponse.status < 300 ? 'Sucesso' : 'Erro';
        
        if (webhookStatus === 'Erro') {
          webhookError = `HTTP ${webhookResponse.status}`;
          if (command.webhookFailureMessage) {
            await interaction.followUp({ content: command.webhookFailureMessage, flags: [MessageFlags.Ephemeral] });
          }
        }
      } catch (error) {
        webhookStatus = 'Erro';
        webhookTimestamp = new Date();
        webhookError = error instanceof Error ? error.message : 'Unknown webhook error';
        console.error('Error calling webhook:', error);
        if (command.webhookFailureMessage) {
          await interaction.followUp({ content: command.webhookFailureMessage, flags: [MessageFlags.Ephemeral] });
        }
      }
    }

    // Log the command usage if enabled and not a modal command
    if (command.logUsage && interaction.guild && command.type !== 'modal') {
      const serverName = interaction.guild.name || 'Unknown Server';
      const channelName = this.getChannelName(interaction.channel) || 'Unknown Channel';
      const username = interaction.user.username || 'Unknown User';
      const channelId = interaction.channelId || 'unknown';
      const userId = interaction.user.id || 'unknown';
      
      await this.createCommandLogEntry(
        interaction.guild.id,
        serverName,
        channelId,
        channelName,
        userId,
        username,
        command.name,
        'Sucesso',
        parameters,
        webhookStatus,
        webhookError,
        webhookTimestamp
      );
    }
  }
  
  /**
   * Convert string option type to Discord.js ApplicationCommandOptionType
   */
  private getApplicationCommandOptionType(type: string): number {
    // Cache dos tipos para evitar conversões repetidas
    const typeCache: { [key: string]: number } = {
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
    
    return typeCache[type] || 3; // Default to STRING
  }

  private async createCommandLogEntry(
    serverId: string,
    serverName: string,
    channelId: string,
    channelName: string,
    userId: string,
    username: string,
    commandName: string,
    status: 'Sucesso' | 'Erro' | 'Permissão Negada',
    parameters: Record<string, any> = {},
    callbackStatus?: 'Sucesso' | 'Erro' | 'Permissão Negada',
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

  public getBotId(): string | undefined {
    return this.client.user?.id;
  }

  private async handleContextMenuCommand(interaction: ContextMenuCommandInteraction) {
    try {
      const command = this.commands.get(interaction.commandName);
      if (!command) {
        await interaction.reply({ content: 'Command not found.', flags: [MessageFlags.Ephemeral] });
        return;
      }

      // Handle the context menu command
      if (command.type === 'context-menu') {
        let targetName = 'unknown';
        let targetId = interaction.targetId;
        
        if (interaction.isMessageContextMenuCommand()) {
          targetName = 'message';
        } else if (interaction.isUserContextMenuCommand()) {
          const targetUser = interaction.targetUser;
          targetName = targetUser.username;
          targetId = targetUser.id;
        }

        // Process the command response
        let response = command.response;
        response = response
          .replace('{user}', interaction.user.username)
          .replace('{target}', targetName)
          .replace('{server}', interaction.guild?.name || 'DM');

        // Send the response
        await interaction.reply({ content: response, flags: [MessageFlags.Ephemeral] });

        // Handle webhook if configured
        let callbackStatus: 'Sucesso' | 'Erro' | 'Permissão Negada' | undefined = undefined;
        let callbackError: string | undefined = undefined;
        let callbackTimestamp: Date | undefined = undefined;

        if (command.webhookUrl && command.webhookUrl.trim() && /^https?:\/\/.+/i.test(command.webhookUrl)) {
          console.log(`Attempting to call webhook for ${command.name} to URL: ${command.webhookUrl}`);
          try {
            const webhookPayload = {
              command: command.name,
              user: {
                id: interaction.user.id,
                username: interaction.user.username,
                discriminator: interaction.user.discriminator,
                avatarUrl: interaction.user.displayAvatarURL()
              },
              server: {
                id: interaction.guild?.id || 'unknown',
                name: interaction.guild?.name || 'DM',
              },
              channel: {
                id: interaction.channelId,
                name: this.getChannelName(interaction.channel)
              },
              target: {
                id: targetId,
                name: targetName
              },
              timestamp: new Date(),
              botId: this.client.user?.id || 'unknown'
            };

            const webhookResponse = await axios.post(command.webhookUrl, webhookPayload, {
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Discord-Bot-Manager'
              },
              timeout: 5000,
              validateStatus: status => status < 500
            });

            callbackTimestamp = new Date();
            callbackStatus = webhookResponse.status >= 200 && webhookResponse.status < 300 ? 'Sucesso' : 'Erro';
            if (callbackStatus === 'Erro') {
              callbackError = `HTTP ${webhookResponse.status}: ${webhookResponse.statusText}`;
              if (command.webhookFailureMessage) {
                await interaction.followUp({ content: command.webhookFailureMessage, flags: [MessageFlags.Ephemeral] });
              }
            }
          } catch (error) {
            callbackStatus = 'Erro';
            callbackTimestamp = new Date();
            callbackError = error instanceof Error ? error.message : 'Unknown webhook error';
            console.error(`Error calling webhook for command ${command.name}:`, callbackError);
            if (command.webhookFailureMessage) {
              await interaction.followUp({ content: command.webhookFailureMessage, flags: [MessageFlags.Ephemeral] });
            }
          }
        }

        // Log the command usage
        await this.createCommandLogEntry(
          interaction.guildId || 'unknown',
          interaction.guild?.name || 'unknown',
          interaction.channelId,
          this.getChannelName(interaction.channel),
          interaction.user.id,
          interaction.user.tag,
          command.name,
          'Sucesso',
          { targetId, targetName },
          callbackStatus,
          callbackError,
          callbackTimestamp || (callbackStatus ? new Date() : undefined)
        );
      }
    } catch (error) {
      console.error('Error handling context menu command:', error);
      await interaction.reply({ 
        content: 'There was an error executing this command.', 
        flags: [MessageFlags.Ephemeral] 
      });
    }
  }

  private async handleModalSubmit(interaction: ModalSubmitInteraction) {
    if (!interaction.guild) return;
    
    try {
      // Find the command that owns this modal
      const command = Array.from(this.commands.values()).find(cmd => 
        cmd.type === 'modal' && cmd.modalFields?.customId === interaction.customId
      );
      
      if (!command || !command.active) {
        return interaction.reply({ 
          content: 'Este modal não está mais disponível.', 
          flags: [MessageFlags.Ephemeral] 
        });
      }

      // Collect modal field values
      const parameters: Record<string, any> = {};
      command.modalFields?.fields.forEach((field: ModalField) => {
        parameters[field.customId] = interaction.fields.getTextInputValue(field.customId);
      });

      // Handle webhook if configured
      let webhookStatus: 'Sucesso' | 'Erro' | undefined = undefined;
      let webhookError: string | undefined = undefined;
      let webhookTimestamp: Date | undefined = undefined;

      if (command.webhookUrl && command.webhookUrl.trim() && /^https?:\/\/.+/i.test(command.webhookUrl)) {
        try {
          // Create a webhook URL for follow-up messages
          const applicationId = this.client.user?.id || 'unknown';
          const followUpWebhookUrl = `https://discord.com/api/webhooks/${applicationId}/${interaction.token}`;
          
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
              id: interaction.channelId,
              name: this.getChannelName(interaction.channel)
            },
            interaction: {
              id: interaction.id,
              token: interaction.token,
              followUpWebhookUrl: followUpWebhookUrl // Add the webhook URL for follow-up messages
            },
            parameters,
            timestamp: new Date(),
            botId: this.client.user?.id || 'unknown'
          };
          
          const webhookResponse = await axios.post(command.webhookUrl, webhookPayload, {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Discord-Bot-Manager'
            },
            timeout: 5000,
            validateStatus: status => status < 500
          });
          
          webhookTimestamp = new Date();
          webhookStatus = webhookResponse.status >= 200 && webhookResponse.status < 300 ? 'Sucesso' : 'Erro';
          
          if (webhookStatus === 'Erro') {
            webhookError = `HTTP ${webhookResponse.status}`;
            if (command.webhookFailureMessage) {
              await interaction.reply({ content: command.webhookFailureMessage, flags: [MessageFlags.Ephemeral] });
            }
          }
        } catch (error) {
          webhookStatus = 'Erro';
          webhookTimestamp = new Date();
          webhookError = error instanceof Error ? error.message : 'Unknown webhook error';
          console.error('Error calling webhook:', error);
          if (command.webhookFailureMessage) {
            await interaction.reply({ content: command.webhookFailureMessage, flags: [MessageFlags.Ephemeral] });
          }
        }
      }

      // Log the command usage if enabled
      if (command.logUsage) {
        const serverName = interaction.guild.name || 'Unknown Server';
        const channelName = this.getChannelName(interaction.channel) || 'Unknown Channel';
        const username = interaction.user.username || 'Unknown User';
        const channelId = interaction.channelId || 'unknown';
        const userId = interaction.user.id || 'unknown';
        
        await this.createCommandLogEntry(
          interaction.guild.id,
          serverName,
          channelId,
          channelName,
          userId,
          username,
          command.name,
          'Sucesso',
          parameters,
          webhookStatus,
          webhookError,
          webhookTimestamp
        );
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
          return interaction.reply({ 
            content: 'Você não tem permissão para usar este comando.', 
            flags: [MessageFlags.Ephemeral] 
          });
        }
      }
      
      // Check if command requires confirmation
      if ('requireConfirmation' in command && command.requireConfirmation) {
        // Prepare confirmation message with parameters
        let confirmationMessage = command.confirmationMessage || 'Are you sure you want to proceed with this action?';
        
        // Replace parameter placeholders
        Object.entries(parameters).forEach(([key, value]) => {
          confirmationMessage = confirmationMessage.replace(`{param:${key}}`, String(value));
        });
        
        // Format parameters for {params} placeholder
        if (confirmationMessage.includes('{params}')) {
          const paramsText = Object.entries(parameters)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          confirmationMessage = confirmationMessage.replace('{params}', paramsText);
        }
        
        // Replace standard placeholders
        confirmationMessage = confirmationMessage
          .replace('{user}', interaction.user.username)
          .replace('{server}', interaction.guild.name);
        
        // Create confirmation buttons
        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('confirm')
              .setLabel('Sim')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('cancel')
              .setLabel('Não')
              .setStyle(ButtonStyle.Danger)
          );
        
        // Send confirmation message with buttons
        const reply = await interaction.reply({
          content: confirmationMessage,
          components: [row],
          flags: [MessageFlags.Ephemeral]
        });
        
        // Create a collector for button interactions
        const collector = reply.createMessageComponentCollector({ 
          componentType: ComponentType.Button,
          time: 60000 // 1 minute timeout
        });
        
        collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
          if (buttonInteraction.user.id !== interaction.user.id) {
            return buttonInteraction.reply({
              content: 'Apenas o iniciador do comando pode usar estes botões.',
              flags: [MessageFlags.Ephemeral]
            });
          }
          
          // Disable the buttons
          const disabledRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('confirm')
                .setLabel('Sim')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('cancel')
                .setLabel('Não')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true)
            );
          
          await buttonInteraction.update({ components: [disabledRow] });
          
          if (buttonInteraction.customId === 'confirm') {
            // Process the command
            await this.processCommand(command, interaction, parameters);
          } else {
            // Handle cancellation
            const cancelMessage = command.cancelMessage || 'Ação cancelada.';
            await buttonInteraction.followUp({
              content: cancelMessage,
              flags: [MessageFlags.Ephemeral]
            });
          }
        });
        
        collector.on('end', async (collected) => {
          if (collected.size === 0) {
            // No button was pressed within the time limit
            await interaction.editReply({
              content: 'Tempo de confirmação esgotado.',
              components: []
            });
          }
        });
      } else {
        // No confirmation required, process the command directly
        await this.processCommand(command, interaction, parameters);
      }
    } catch (error) {
      console.error('Error handling modal submit:', error);
      
      try {
        await interaction.reply({ 
          content: 'Ocorreu um erro ao processar este modal.', 
          flags: [MessageFlags.Ephemeral] 
        });
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
  }
}

// Create a singleton instance
const discordBot = new DiscordBot();
export default discordBot;
