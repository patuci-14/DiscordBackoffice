import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import discordBot from '../discord-bot';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

dotenv.config({ path: join(rootDir, '.env') });

/**
 * Script para forçar a atualização dos comandos do bot em todos os servidores
 */
async function forceUpdateCommands() {
  console.log('========================================');
  console.log('  FORÇANDO ATUALIZAÇÃO DE COMANDOS');
  console.log('========================================\n');

  try {
    // Verificar se o bot está conectado
    if (!discordBot.isConnected()) {
      console.error('❌ ERRO: O bot não está conectado!');
      console.log('Por favor, conecte o bot primeiro através do backoffice.');
      process.exit(1);
    }

    const user = discordBot.getUser();
    if (!user) {
      console.error('❌ ERRO: Não foi possível obter informações do bot!');
      process.exit(1);
    }

    console.log(`✅ Bot conectado: ${user.username} (ID: ${user.id})\n`);

    // Verificar se o bot está pronto (isConnected já verifica isReady)
    if (!discordBot.isConnected()) {
      console.error('❌ ERRO: O bot não está pronto!');
      process.exit(1);
    }

    console.log('🔄 Iniciando atualização forçada dos comandos...\n');

    // Forçar reload dos comandos
    const startTime = Date.now();
    const response = await discordBot.reloadCommands();
    const duration = Date.now() - startTime;

    console.log('\n========================================');
    console.log('  ATUALIZAÇÃO CONCLUÍDA');
    console.log('========================================');
    console.log(`⏱️  Tempo decorrido: ${duration}ms`);
    
    if (response && Array.isArray(response)) {
      console.log(`✅ ${response.length} comando(s) registrado(s) com sucesso!`);
      console.log('\n📋 Comandos registrados:');
      response.forEach((cmd: any, index: number) => {
        console.log(`   ${index + 1}. /${cmd.name} - ${cmd.description || 'Sem descrição'}`);
      });
    } else {
      console.log('✅ Comandos atualizados com sucesso!');
    }

    console.log('\n💡 Nota: Os comandos podem levar alguns minutos para aparecer em todos os servidores.');
    console.log('   Isso é normal devido ao cache do Discord.\n');

  } catch (error) {
    console.error('\n========================================');
    console.error('  ERRO AO ATUALIZAR COMANDOS');
    console.error('========================================');
    console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.stack) {
      console.error('\n📋 Stack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Executar o script
forceUpdateCommands()
  .then(() => {
    console.log('✅ Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });

