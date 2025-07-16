import { storage } from '../../storage';
import { InsertCommandLog } from '@shared/schema';

export class LoggingService {
  /**
   * Create a log entry for command usage
   */
  public static async createCommandLogEntry(
    botId: string,
    serverId: string,
    serverName: string,
    channelId: string,
    channelName: string,
    userId: string,
    username: string,
    commandName: string,
    status: 'Sucesso' | 'Erro' | 'Permissão Negada',
    parameters: Record<string, any> = {},
    callbackStatus?: 'Sucesso' | 'Erro' | 'Permissão Negada',
    callbackError?: string,
    callbackTimestamp?: Date | string
  ): Promise<void> {
    const logEntry: InsertCommandLog = {
      botId,
      serverId,
      serverName,
      channelId,
      channelName,
      userId,
      username,
      commandName,
      status,
      timestamp: new Date(),
      parameters,
      callbackStatus,
      callbackError,
      callbackTimestamp: callbackTimestamp instanceof Date ? callbackTimestamp : 
                         callbackTimestamp ? new Date(callbackTimestamp) : undefined
    };

    await storage.createCommandLog(logEntry);
  }
} 