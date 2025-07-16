import { 
  Client, Collection, ModalSubmitInteraction, MessageFlags,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ButtonInteraction
} from 'discord.js';
import { Command } from '../types/CommandTypes';
import axios from 'axios';
import { LoggingService } from '../services/LoggingService';
import { getChannelName } from '../utils/InteractionUtils';

export class ModalHandler {
  private client: Client;
  private commands: Collection<string, Command>;
  
  constructor(client: Client, commands: Collection<string, Command>) {
    this.client = client;
    this.commands = commands;
  }
  
  /**
   * Handle modal submit interactions
   */
  public async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    if (!interaction.guild) return;
    
    try {
      // Find the command that owns this modal
      const command = Array.from(this.commands.values()).find(cmd => 
        cmd.type === 'modal' && cmd.modalFields?.customId === interaction.customId
      );
      
      if (!command || !command.active) {
        await interaction.reply({ 
          content: 'Este modal não está mais disponível.', 
          flags: [MessageFlags.Ephemeral] 
        });
        return;
      }

      // Collect modal field values
      const parameters: Record<string, any> = {};
      command.modalFields?.fields.forEach(field => {
        parameters[field.customId] = interaction.fields.getTextInputValue(field.customId);
      });

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
          await interaction.reply({ 
            content: 'Você não tem permissão para usar este comando.', 
            flags: [MessageFlags.Ephemeral] 
          });
          return;
        }
      }
      
      // Check if command requires confirmation
      if (command.requireConfirmation) {
        // Prepare confirmation message with parameters
        let confirmationMessage = command.confirmationMessage || 'Are you sure you want to proceed with this action?';
        
        // Replace parameter placeholders
        Object.entries(parameters).forEach(([key, value]) => {
          if (typeof value === 'string') {
            confirmationMessage = confirmationMessage.replace(`{param:${key}}`, value);
          }
        });
        
        // Replace any remaining parameter placeholders with empty string
        confirmationMessage = confirmationMessage.replace(/{param:[^}]+}/g, '');
        
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
              content: 'Apenas o iniciador do comando pode usar estes botões.',
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

  /**
   * Process a command after validation and confirmation
   */
  private async processCommand(
    command: Command, 
    interaction: ModalSubmitInteraction,
    parameters: Record<string, any>
  ): Promise<void> {
    // Defer reply if not already deferred
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: command.deleteUserMessage ? undefined : [MessageFlags.Ephemeral] });
    }
    
    // Process the command
    let response = command.response;
    
    // Replace parameter placeholders in the response
    Object.entries(parameters).forEach(([key, value]) => {
      response = response.replace(`{${key}}`, String(value));
    });
    
    // Replace any remaining parameter placeholders with empty string
    response = response.replace(/{[^}]+}/g, '');
    
    // Replace standard placeholders with actual values
    response = response
      .replace('{user}', interaction.user.username)
      .replace('{server}', interaction.guild!.name)
      .replace('{ping}', this.client.ws.ping.toString());
    
    // Send the response based on command type
    if (interaction.deferred) {
      await interaction.editReply(response);
    } else {
      await interaction.followUp({ content: response, flags: command.deleteUserMessage ? undefined : [MessageFlags.Ephemeral] });
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
            id: interaction.guild!.id,
            name: interaction.guild!.name,
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