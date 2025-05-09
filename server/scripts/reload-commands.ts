import discordBot from '../discord-bot';

async function reloadCommands() {
  try {
    console.log('Recarregando comandos...');
    await discordBot.reloadCommands();
    console.log('Comandos recarregados com sucesso!');
  } catch (error) {
    console.error('Erro ao recarregar comandos:', error);
  }
}

reloadCommands(); 