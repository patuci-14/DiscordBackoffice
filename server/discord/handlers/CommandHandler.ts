import { 
  Client, Collection, ChatInputCommandInteraction, MessageFlags,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ComponentType, ButtonInteraction
} from 'discord.js';
import { Command } from '../types/CommandTypes';
import { storage } from '../../storage';
import axios from 'axios';
import { LoggingService } from '../services/LoggingService';
import { getChannelName } from '../utils/InteractionUtils';

export class CommandHandler {
  private client: Client;
  private commands: Collection<string, Command>;
  
  constructor(client: Client, commands: Collection<string, Command>) {
    this.client = client;
    this.commands = commands;
  }
  
  /**
   * Handle an incoming slash command interaction
   */
  public async handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) return;
    
    // Check if the server is enabled
    const server = await storage.getServerByServerId(interaction.guild.id);
    if (!server || !server.enabled) {
      await interaction.reply({ 
        content: 'This bot is disabled in this server.', 
        flags: [MessageFlags.Ephemeral] 
      });
      return;
    }
    
    // Get the command name
    const commandName = interaction.commandName.toLowerCase();
    
    // Find the command in our database
    const command = this.commands.get(commandName) || 
                   Array.from(this.commands.values()).find(cmd => 
                     cmd.name.toLowerCase() === commandName
                   );
    
    if (!command || !command.active) {
      await interaction.reply({ 
        content: 'That command no longer exists or is inactive.', 
        flags: [MessageFlags.Ephemeral] 
      });
      return;
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
        await LoggingService.createCommandLogEntry(
          this.client.user?.id || 'unknown',
          interaction.guild.id,
          interaction.guild.name,
          interaction.channel?.id || '0',
          getChannelName(interaction.channel),
          interaction.user.id,
          interaction.user.tag,
          command.name,
          'Permissão Negada',
          undefined,
          undefined,
          undefined
        );
        
        await interaction.reply({ 
          content: 'You do not have permission to use this command.', 
          flags: [MessageFlags.Ephemeral] 
        });
        return;
      }
    }
    
    try {
      // Collect parameters from the interaction
      const parameters: Record<string, any> = {};
      if (interaction.options && interaction.options.data.length > 0) {
        interaction.options.data.forEach(option => {
          let value = option.value;
          // Handle attachment type
          if (option.attachment) {
            value = JSON.stringify({
              url: option.attachment.url,
              name: option.attachment.name,
              extension: option.attachment.name.split('.').pop() || '',
              contentType: option.attachment.contentType || 'unknown',
              size: option.attachment.size
            });
          }
          parameters[option.name] = value;
        });
      }

      // Check if command requires confirmation
      if (command.requireConfirmation) {
        // Prepare confirmation message with parameters
        let confirmationMessage = command.confirmationMessage || 'Are you sure you want to proceed with this action?';

        // Replace specific parameter placeholders
        Object.entries(parameters).forEach(([key, value]) => {
          // Handle attachment object
          if (typeof value === 'object' && value !== null && 'url' in value) {
            // Replace {param:key} with formatted attachment info - just name and extension
            confirmationMessage = confirmationMessage.replace(
              `{param:${key}}`, 
              `${value.name} (${value.extension.toUpperCase()})`
            );
            
            // Add support for specific file properties
            confirmationMessage = confirmationMessage
              .replace(`{param:${key}.name}`, value.name)
              .replace(`{param:${key}.extension}`, value.extension.toUpperCase())
              .replace(`{param:${key}.url}`, value.url)
              .replace(`{param:${key}.size}`, `${Math.round(value.size / 1024)} KB`);
          } else if (typeof value === 'string' && value.startsWith('{"url":')) {
            // Handle string-serialized attachment object
            try {
              const attachmentData = JSON.parse(value);
              if (attachmentData.name && attachmentData.extension) {
                // Replace {param:key} with formatted attachment info - just name and extension
                confirmationMessage = confirmationMessage.replace(
                  `{param:${key}}`,
                  `${attachmentData.name} (${attachmentData.extension.toUpperCase()})`
                );
                
                // Add support for specific file properties
                confirmationMessage = confirmationMessage
                  .replace(`{param:${key}.name}`, attachmentData.name)
                  .replace(`{param:${key}.extension}`, attachmentData.extension.toUpperCase())
                  .replace(`{param:${key}.url}`, attachmentData.url)
                  .replace(`{param:${key}.size}`, `${Math.round(attachmentData.size / 1024)} KB`);
              } else {
                // Regular parameter replacement if attachment data is incomplete
                confirmationMessage = confirmationMessage.replace(`{param:${key}}`, value);
              }
            } catch (e) {
              // Regular parameter replacement if JSON parsing fails
              confirmationMessage = confirmationMessage.replace(`{param:${key}}`, value);
            }
          } else {
            // Regular parameter replacement
            confirmationMessage = confirmationMessage.replace(`{param:${key}}`, String(value));
          }
        });
        
        // Replace any remaining parameter placeholders with empty string
        confirmationMessage = confirmationMessage.replace(/{param:[^}]+}/g, '');

        // Format parameters for {params} placeholder
        if (confirmationMessage.includes('{params}')) {
          // Create a formatted string of all parameters
          const paramsText = Object.entries(parameters)
            .map(([key, value]) => {
              if (typeof value === 'object' && value !== null && 'url' in value) {
                return `${key}: ${value.name} (${value.extension.toUpperCase()})`;
              }
              return `${key}: ${value}`;
            })
            .join('\n');
          confirmationMessage = confirmationMessage.replace('{params}', paramsText);
        }
        
        // Handle attachment parameters - replace any JSON string representation with formatted text
        /* Object.entries(parameters).forEach(([key, value]) => {
          if (typeof value === 'string' && value.startsWith('{"url":')) {
            try {
              const attachmentData = JSON.parse(value);
              if (attachmentData.name && attachmentData.extension) {
                parameters[key] = `${attachmentData.name} (${attachmentData.extension.toUpperCase()})`;
              }
            } catch (e) {
              // If parsing fails, keep the original value
              console.log(`Failed to parse attachment JSON for ${key}:`, e);
            }
          }
        }); */

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
          flags: [MessageFlags.Ephemeral],
          fetchReply: true
        });

        // Create a collector for button interactions
        const collector = reply.createMessageComponentCollector({ 
          componentType: ComponentType.Button,
          time: 60000 // 1 minute timeout
        });

        collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
          if (buttonInteraction.user.id !== interaction.user.id) {
            await buttonInteraction.reply({
              content: 'Only the command initiator can use these buttons.',
              flags: [MessageFlags.Ephemeral]
            });
            return;
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
      await LoggingService.createCommandLogEntry(
        this.client.user?.id || 'unknown',
        interaction.guild.id,
        interaction.guild.name,
        interaction.channel?.id || '0',
        getChannelName(interaction.channel),
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

  /**
   * Process a command after validation and confirmation
   */
  private async processCommand(
    command: Command, 
    interaction: ChatInputCommandInteraction,
    parameters: Record<string, any>
  ): Promise<void> {
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
        
        /* 
        // Handle attachment object
        if (typeof optionValue === 'object' && optionValue !== null && 'url' in optionValue) {
          // Manter o objeto JSON original com todas as chaves
          optionValue = JSON.stringify(optionValue);
        } */
        
        // Replace the placeholder in the response
        response = response.replace(`{${optionName}}`, String(optionValue));
      });
    }
    
    // Replace any remaining parameter placeholders with empty string
    response = response.replace(/{[^}]+}/g, '');
    
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
            name: getChannelName(interaction.channel)
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

    // Log the command usage if enabled
    if (command.logUsage && interaction.guild) {
      const serverName = interaction.guild.name || 'Unknown Server';
      const channelName = getChannelName(interaction.channel) || 'Unknown Channel';
      const username = interaction.user.username || 'Unknown User';
      const channelId = interaction.channelId || 'unknown';
      const userId = interaction.user.id || 'unknown';
      
      await LoggingService.createCommandLogEntry(
        this.client.user?.id || 'unknown',
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
} 