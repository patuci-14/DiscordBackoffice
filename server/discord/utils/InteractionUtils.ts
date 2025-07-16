import { Channel, BaseGuildTextChannel } from 'discord.js';

/**
 * Get a readable channel name from a Discord channel
 */
export function getChannelName(channel: Channel | null): string {
  if (!channel) return 'unknown';
  if (channel instanceof BaseGuildTextChannel) return channel.name;
  if ('isDMBased' in channel && channel.isDMBased()) return 'DM';
  if ('name' in channel && typeof channel.name === 'string') return channel.name;
  return 'unknown';
} 