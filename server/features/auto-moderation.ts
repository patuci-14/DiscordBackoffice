import { Message, TextChannel } from 'discord.js';
import { storage } from '../storage';

// Cache para armazenar mensagens recentes por usuário
const messageCache = new Map<string, { content: string; timestamp: number }[]>();
const SPAM_THRESHOLD = 5; // Número de mensagens em sequência
const SPAM_WINDOW = 5000; // Janela de tempo em ms (5 segundos)
const BAD_WORDS = ['palavrão1', 'palavrão2']; // Lista de palavras proibidas

export async function handleMessage(message: Message) {
  if (message.author.bot) return;

  const botConfig = await storage.getBotConfig();
  if (!botConfig) return;

  // Verificar spam
  if (botConfig.enableAntiSpam) {
    const isSpam = await checkSpam(message);
    if (isSpam) {
      await handleSpam(message);
      return;
    }
  }

  // Verificar conteúdo inapropriado
  if (botConfig.enableAutoMod) {
    const hasBadContent = checkBadContent(message.content);
    if (hasBadContent) {
      await handleBadContent(message);
      return;
    }
  }
}

async function checkSpam(message: Message): Promise<boolean> {
  const userId = message.author.id;
  const now = Date.now();

  // Inicializar cache do usuário se não existir
  if (!messageCache.has(userId)) {
    messageCache.set(userId, []);
  }

  const userMessages = messageCache.get(userId)!;

  // Adicionar nova mensagem
  userMessages.push({
    content: message.content,
    timestamp: now
  });

  // Remover mensagens antigas
  const recentMessages = userMessages.filter(msg => now - msg.timestamp < SPAM_WINDOW);

  // Atualizar cache
  messageCache.set(userId, recentMessages);

  // Verificar se é spam
  return recentMessages.length >= SPAM_THRESHOLD;
}

async function handleSpam(message: Message) {
  // Deletar mensagem
  await message.delete().catch(console.error);

  // Enviar aviso
  const warning = await message.channel.send({
    content: `${message.author}, por favor, não envie mensagens em sequência tão rapidamente.`
  });

  // Deletar aviso após 5 segundos
  setTimeout(() => {
    warning.delete().catch(console.error);
  }, 5000);
}

function checkBadContent(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return BAD_WORDS.some(word => lowerContent.includes(word));
}

async function handleBadContent(message: Message) {
  // Deletar mensagem
  await message.delete().catch(console.error);

  // Enviar aviso
  const warning = await message.channel.send({
    content: `${message.author}, por favor, mantenha um ambiente respeitoso.`
  });

  // Deletar aviso após 5 segundos
  setTimeout(() => {
    warning.delete().catch(console.error);
  }, 5000);
} 