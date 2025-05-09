import { storage } from '../storage';

async function checkCommand(commandName: string) {
  try {
    const command = await storage.getCommandByName(commandName);
    if (!command) {
      console.log(`Comando "${commandName}" não encontrado no banco de dados.`);
      return;
    }

    console.log('Status do comando:');
    console.log('----------------');
    console.log(`Nome: ${command.name}`);
    console.log(`Tipo: ${command.type}`);
    console.log(`Ativo: ${command.active}`);
    console.log(`Descrição: ${command.description || 'Nenhuma'}`);
    console.log(`Permissão necessária: ${command.requiredPermission}`);
    console.log(`Log de uso: ${command.logUsage}`);
    console.log(`Deletar mensagem do usuário: ${command.deleteUserMessage}`);
    console.log(`Habilitado para todos os servidores: ${command.enabledForAllServers}`);
    console.log(`Contagem de uso: ${command.usageCount}`);
  } catch (error) {
    console.error('Erro ao verificar comando:', error);
  }
}

// Pegar o nome do comando dos argumentos da linha de comando
const commandName = process.argv[2];
if (!commandName) {
  console.error('Por favor, forneça o nome do comando como argumento.');
  process.exit(1);
}

checkCommand(commandName); 