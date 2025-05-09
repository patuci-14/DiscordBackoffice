import { storage } from '../storage';

async function checkBotConfig() {
  try {
    const config = await storage.getBotConfig();
    if (!config) {
      console.log('Nenhuma configuração encontrada para o bot.');
      return;
    }

    console.log('Configuração do Bot:');
    console.log('-------------------');
    console.log(`Nome: ${config.name}`);
    console.log(`ID do Bot: ${config.botId}`);
    console.log(`Avatar URL: ${config.avatarUrl}`);
    console.log(`Prefixo: ${config.prefix}`);
    console.log(`Status: ${config.status}`);
    console.log(`Atividade: ${config.activity}`);
    console.log(`Tipo de Atividade: ${config.activityType}`);
    console.log(`Usar Comandos Slash: ${config.useSlashCommands}`);
    console.log(`Log de Uso de Comandos: ${config.logCommandUsage}`);
    console.log(`Responder a Menções: ${config.respondToMentions}`);
    console.log(`Deletar Mensagens de Comando: ${config.deleteCommandMessages}`);
    console.log(`Mensagens de Boas-vindas: ${config.enableWelcomeMessages}`);
    console.log(`Mensagens de Despedida: ${config.enableGoodbyeMessages}`);
    console.log(`Auto Role: ${config.enableAutoRole}`);
    console.log(`Logging: ${config.enableLogging}`);
    console.log(`Anti-Spam: ${config.enableAntiSpam}`);
    console.log(`Auto Moderação: ${config.enableAutoMod}`);
  } catch (error) {
    console.error('Erro ao verificar configuração do bot:', error);
  }
}

checkBotConfig(); 