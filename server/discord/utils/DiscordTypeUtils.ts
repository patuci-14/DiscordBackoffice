import { ApplicationCommandOptionType, ActivityType } from 'discord.js';

/**
 * Convert string option type to Discord.js ApplicationCommandOptionType
 */
export function getApplicationCommandOptionType(type: string): number {
  // Cache of types to avoid repeated conversions
  const typeCache: { [key: string]: number } = {
    'STRING': ApplicationCommandOptionType.String,
    'INTEGER': ApplicationCommandOptionType.Integer,
    'BOOLEAN': ApplicationCommandOptionType.Boolean,
    'USER': ApplicationCommandOptionType.User,
    'CHANNEL': ApplicationCommandOptionType.Channel,
    'ROLE': ApplicationCommandOptionType.Role,
    'MENTIONABLE': ApplicationCommandOptionType.Mentionable,
    'NUMBER': ApplicationCommandOptionType.Number,
    'ATTACHMENT': ApplicationCommandOptionType.Attachment
  };
  
  return typeCache[type] || ApplicationCommandOptionType.String; // Default to STRING
} 