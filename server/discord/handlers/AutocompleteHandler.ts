import { Client, Collection, AutocompleteInteraction } from 'discord.js';
import { Command, CommandOption } from '../types/CommandTypes';
import axios from 'axios';
import { getChannelName } from '../utils/InteractionUtils';

export class AutocompleteHandler {
  private client: Client;
  private commands: Collection<string, Command>;
  private autocompleteCache: Map<string, { data: any[], timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds cache TTL
  
  constructor(client: Client, commands: Collection<string, Command>) {
    this.client = client;
    this.commands = commands;
  }
  
  /**
   * Handle autocomplete interactions
   */
  public async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    try {
      // Verify the interaction is still valid
      if (!interaction.isAutocomplete()) {
        console.log('Interaction is not an autocomplete');
        return;
      }

      // Verify the bot is ready
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

      // Find the option more robustly
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

      // Verify the interaction is still valid before getting suggestions
      if (!interaction.isAutocomplete()) {
        console.log('Interaction expired before getting suggestions');
        return;
      }

      console.log('Getting autocomplete suggestions...');
      const suggestions = await this.getAutocompleteSuggestions(command, option, focusedOption.value, interaction);
      console.log(`Retrieved ${suggestions.length} suggestions`);

      // Verify the interaction is still valid before responding
      if (!interaction.isAutocomplete()) {
        console.log('Interaction expired before responding');
        return;
      }

      // Add a timeout of 1.5 seconds to ensure we respond before Discord's limit
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

    // Collect all previously provided parameters to use as filters
    const previousParameters: Record<string, any> = {};
    
    if (command.options && Array.isArray(command.options)) {
      command.options.forEach(cmdOption => {
        if (cmdOption.name !== option.name) { // Don't include the current parameter
          try {
            // Check if this parameter should be used as a filter
            const shouldUseAsFilter = option.autocomplete?.usePreviousParameters && 
              (!option.autocomplete?.filterByParameters || 
               option.autocomplete?.filterByParameters.length === 0 ||
               option.autocomplete?.filterByParameters.includes(cmdOption.name));
            
            if (!shouldUseAsFilter) {
              return; // Skip this parameter if it shouldn't be used as a filter
            }
            
            // Normalize the option name to match what Discord sends
            const normalizedOptionName = cmdOption.name.toLowerCase().replace(/\s+/g, '_');
            
            // Try to get the parameter value using only methods available in autocomplete
            let value: any = null;
            
            // Try to access via data (more reliable method for autocomplete)
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
                    // If only the ID is available
                    value = { id: optionData.value, username: 'Unknown User' };
                  }
                  break;
                case 'CHANNEL':
                  if (optionData.channel) {
                    value = { id: optionData.channel.id, name: optionData.channel.name };
                  } else if (optionData.value) {
                    // If only the ID is available
                    value = { id: optionData.value, name: 'Unknown Channel' };
                  }
                  break;
                case 'ROLE':
                  if (optionData.role) {
                    value = { id: optionData.role.id, name: optionData.role.name };
                  } else if (optionData.value) {
                    // If only the ID is available
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
            
            // Try using the basic methods available in autocomplete
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
                // Method not available in autocomplete, this is expected
                console.log(`Method not available for ${normalizedOptionName} in autocomplete context`);
              }
            }
            
            if (value !== null && value !== undefined) {
              previousParameters[cmdOption.name] = value;
              console.log(`Added parameter ${cmdOption.name} with value:`, value);
            }
          } catch (error) {
            // Parameter not provided yet, ignore
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

    // If an API URL is configured, use it
    if (option.autocomplete?.apiUrl) {
      console.log(`Fetching suggestions from external API: ${option.autocomplete.apiUrl}`);
      
      try {
        const requestConfig = {
          method: option.autocomplete.apiMethod || 'GET',
          url: option.autocomplete.apiUrl,
          headers: {
            ...option.autocomplete.apiHeaders,
            'X-Discord-User-Id': interaction.user.id,
            'X-Discord-Guild-Id': interaction.guildId || ''
          },
          data: option.autocomplete.apiMethod === 'POST' ? {
            ...option.autocomplete.apiBody,
            input,
            botId: this.client.user?.id,
            userId: interaction.user.id,
            guildId: interaction.guildId,
            previousParameters, // Add previous parameters
            currentParameter: option.name // Name of the current parameter
          } : undefined,
          params: option.autocomplete.apiMethod === 'GET' ? {
            ...option.autocomplete.apiBody,
            input,
            botId: this.client.user?.id,
            userId: interaction.user.id,
            guildId: interaction.guildId,
            previousParameters: JSON.stringify(previousParameters), // For GET, serialize as string
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

    // If no API URL, use internal services with filters
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
    const servers = this.client.guilds.cache.map(guild => ({
      name: guild.name,
      value: guild.id
    }));
    
    return servers
      .filter(server => server.name.toLowerCase().includes(input.toLowerCase()))
      .slice(0, 25); // Discord limits to 25 suggestions
  }

  private async getChannelSuggestions(input: string, previousParameters: Record<string, any>): Promise<Array<{ name: string; value: string }>> {
    const guild = this.client.guilds.cache.first();
    if (!guild) return [];
    
    let channels = guild.channels.cache
      .filter(channel => 
        channel.name.toLowerCase().includes(input.toLowerCase())
      );

    // Example filter based on previous parameter
    // If a server was specified previously, filter only channels from that server
    if (previousParameters.server_id) {
      // Here you could filter channels based on the selected server
      console.log(`Filtering channels for server: ${previousParameters.server_id}`);
    }

    // If a channel type was specified previously
    if (previousParameters.channel_type) {
      channels = channels.filter(channel => {
        switch (previousParameters.channel_type) {
          case 'text':
            return channel.isTextBased();
          case 'voice':
            return channel.isVoiceBased();
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

    // Example filter based on previous parameter
    // If a user was specified previously, show only roles that the user can manage
    if (previousParameters.user_id) {
      const member = await guild.members.fetch(previousParameters.user_id).catch(() => null);
      if (member) {
        // Filter only roles that the member can manage
        roles = roles.filter(role => 
          member.permissions.has('ManageRoles') && 
          role.position < member.roles.highest.position
        );
      }
    }

    // If a role type was specified previously
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

    // Example filter based on previous parameter
    // If a role was specified previously, show only users with that role
    if (previousParameters.role_id) {
      members = members.filter(member => 
        member.roles.cache.has(previousParameters.role_id)
      );
    }

    // If a channel was specified previously, show only users who can see that channel
    if (previousParameters.channel_id) {
      const channel = guild.channels.cache.get(previousParameters.channel_id);
      if (channel) {
        members = members.filter(member => 
          channel.permissionsFor(member)?.has('ViewChannel') || false
        );
      }
    }

    // If a user status was specified previously
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
} 