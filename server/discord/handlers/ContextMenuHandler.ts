import { Client, Collection, ContextMenuCommandInteraction, MessageFlags } from 'discord.js';
import { Command } from '../types/CommandTypes';
import axios from 'axios';
import { LoggingService } from '../services/LoggingService';
import { getChannelName } from '../utils/InteractionUtils';

export class ContextMenuHandler {
  private client: Client;
  private commands: Collection<string, Command>;
  
  constructor(client: Client, commands: Collection<string, Command>) {
    this.client = client;
    this.commands = commands;
  }
  
  /**
   * Handle context menu command interactions
   */
  public async handleContextMenuCommand(interaction: ContextMenuCommandInteraction): Promise<void> {
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
                name: getChannelName(interaction.channel)
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
        if (interaction.guild) {
          await LoggingService.createCommandLogEntry(
            this.client.user?.id || 'unknown',
            interaction.guildId || 'unknown',
            interaction.guild.name || 'unknown',
            interaction.channelId,
            getChannelName(interaction.channel),
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
      }
    } catch (error) {
      console.error('Error handling context menu command:', error);
      await interaction.reply({ 
        content: 'There was an error executing this command.', 
        flags: [MessageFlags.Ephemeral] 
      });
    }
  }
} 