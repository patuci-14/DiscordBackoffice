import { Message, GuildMember, TextChannel } from 'discord.js';
import { storage } from '../storage';

export async function handleMessageDelete(message: Message) {
  const botConfig = await storage.getBotConfig();
  if (!botConfig?.enableLogging) return;

  const logChannel = message.guild?.channels.cache.find(
    channel => channel.name.toLowerCase().includes('logs') && channel.isTextBased()
  ) as TextChannel;

  if (!logChannel) return;

  await logChannel.send({
    content: `🗑️ Mensagem deletada em ${message.channel}:\nAutor: ${message.author.tag}\nConteúdo: ${message.content}`
  });
}

export async function handleMemberUpdate(oldMember: GuildMember, newMember: GuildMember) {
  const botConfig = await storage.getBotConfig();
  if (!botConfig?.enableLogging) return;

  const logChannel = newMember.guild.channels.cache.find(
    channel => channel.name.toLowerCase().includes('logs') && channel.isTextBased()
  ) as TextChannel;

  if (!logChannel) return;

  // Verificar mudanças de nickname
  if (oldMember.nickname !== newMember.nickname) {
    await logChannel.send({
      content: `👤 Nickname alterado:\nUsuário: ${newMember.user.tag}\nAntigo: ${oldMember.nickname || 'Nenhum'}\nNovo: ${newMember.nickname || 'Nenhum'}`
    });
  }

  // Verificar mudanças de roles
  const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
  const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

  if (addedRoles.size > 0) {
    await logChannel.send({
      content: `➕ Cargos adicionados a ${newMember.user.tag}:\n${addedRoles.map(role => role.name).join(', ')}`
    });
  }

  if (removedRoles.size > 0) {
    await logChannel.send({
      content: `➖ Cargos removidos de ${newMember.user.tag}:\n${removedRoles.map(role => role.name).join(', ')}`
    });
  }
} 