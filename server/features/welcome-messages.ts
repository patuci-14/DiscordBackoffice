import { GuildMember, TextChannel } from 'discord.js';
import { storage } from '../storage';

export async function handleMemberJoin(member: GuildMember) {
  const botConfig = await storage.getBotConfig();
  if (!botConfig?.enableWelcomeMessages) return;

  // Encontrar o canal de boas-vindas
  const welcomeChannel = member.guild.channels.cache.find(
    channel => channel.name.toLowerCase().includes('welcome') && channel.isTextBased()
  ) as TextChannel;

  if (!welcomeChannel) return;

  // Enviar mensagem de boas-vindas
  await welcomeChannel.send({
    content: `Bem-vindo(a) ${member} ao servidor ${member.guild.name}! 🎉`
  });

  // Atribuir cargo automático se configurado
  if (botConfig.enableAutoRole) {
    const defaultRole = member.guild.roles.cache.find(
      role => role.name.toLowerCase().includes('membro') || role.name.toLowerCase().includes('member')
    );

    if (defaultRole) {
      await member.roles.add(defaultRole);
    }
  }
}

export async function handleMemberLeave(member: GuildMember) {
  const botConfig = await storage.getBotConfig();
  if (!botConfig?.enableGoodbyeMessages) return;

  // Encontrar o canal de despedidas
  const goodbyeChannel = member.guild.channels.cache.find(
    channel => channel.name.toLowerCase().includes('goodbye') && channel.isTextBased()
  ) as TextChannel;

  if (!goodbyeChannel) return;

  // Enviar mensagem de despedida
  await goodbyeChannel.send({
    content: `${member.user.username} saiu do servidor. Até logo! 👋`
  });
} 