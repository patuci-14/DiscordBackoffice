import { apiRequest } from "./queryClient";
import { 
  BotConfig, BotStat, RecentActivity, 
  Server, Command, InsertCommand, 
  CommandLog, Plugin, InsertPlugin
} from "@shared/schema";

// Bot API Functions
export async function getBotInfo(): Promise<{ success: boolean; config?: BotConfig; error?: string }> {
  try {
    // Get botId from both sessionStorage and localStorage
    const botId = sessionStorage.getItem('botId') || localStorage.getItem('botId');
    if (!botId) {
      console.error('Get bot info error: Bot ID not found in storage');
      return { 
        success: false, 
        error: 'Bot ID not found' 
      };
    }

    console.log(`Fetching bot info for botId: ${botId}`);
    const response = await apiRequest('GET', `/api/bot?botId=${botId}`);
    const data = await response.json();
    console.log('Bot info response:', data);
    return data;
  } catch (error) {
    console.error('Get bot info error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export async function updateBotConfig(config: Partial<BotConfig>): Promise<{ success: boolean; config?: BotConfig; error?: string }> {
  try {
    const botId = sessionStorage.getItem('botId') || localStorage.getItem('botId');
    if (!botId) {
      console.error('Update bot config error: Bot ID not found in storage');
      return { 
        success: false, 
        error: 'Bot ID not found' 
      };
    }
    
    console.log(`Updating bot config for botId: ${botId}`, config);
    const response = await apiRequest('PATCH', `/api/bot?botId=${botId}`, config);
    const data = await response.json();
    console.log('Update bot config response:', data);
    return data;
  } catch (error) {
    console.error('Update bot config error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export async function getServers(): Promise<{ success: boolean; servers?: Server[]; error?: string }> {
  try {
    const botId = sessionStorage.getItem('botId') || localStorage.getItem('botId');
    if (!botId) {
      console.error('Get servers error: Bot ID not found in storage');
      return { 
        success: false, 
        error: 'Bot ID not found' 
      };
    }
    
    console.log(`Fetching servers for botId: ${botId}`);
    const response = await apiRequest('GET', `/api/bot/servers?botId=${botId}`);
    const data = await response.json();
    console.log('Servers response:', data);
    return data;
  } catch (error) {
    console.error('Get servers error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export async function updateServer(id: number, update: Partial<Server>): Promise<{ success: boolean; server?: Server; error?: string }> {
  try {
    const response = await apiRequest('PATCH', `/api/bot/servers/${id}`, update);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Update server error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export async function getBotStats(): Promise<{ success: boolean; stats?: BotStat; recentActivity?: RecentActivity[]; error?: string }> {
  try {
    // Get botId from both sessionStorage and localStorage
    const botId = sessionStorage.getItem('botId') || localStorage.getItem('botId');
    if (!botId) {
      console.error('Get bot stats error: Bot ID not found in storage');
      return { 
        success: false, 
        error: 'Bot ID not found' 
      };
    }

    console.log(`Fetching bot stats for botId: ${botId}`);
    const response = await apiRequest('GET', `/api/bot/stats?botId=${botId}`);
    const data = await response.json();
    console.log('Bot stats response:', data);
    return data;
  } catch (error) {
    console.error('Get bot stats error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

// Commands API Functions
export async function getCommands(): Promise<{ success: boolean; commands?: Command[]; error?: string }> {
  try {
    // Tentar recuperar o botId de ambos sessionStorage e localStorage
    const botId = sessionStorage.getItem('botId') || localStorage.getItem('botId');
    
    if (!botId) {
      console.error('Get commands error: Bot ID not found in storage');
      return { 
        success: false, 
        error: 'Bot ID not found' 
      };
    }
    
    // Registrar a requisição para debug
    console.log(`Fetching commands for botId: ${botId}`);
    
    const response = await apiRequest('GET', `/api/commands?botId=${botId}`);
    const data = await response.json();
    
    // Registrar a resposta para debug
    console.log(`Commands response:`, data);
    
    return data;
  } catch (error) {
    console.error('Get commands error:', error);
    return { 
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export async function getCommand(id: number): Promise<{ success: boolean; command?: Command; error?: string }> {
  try {
    const response = await apiRequest('GET', `/api/commands/${id}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get command error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export async function createCommand(command: InsertCommand): Promise<{ success: boolean; command?: Command; error?: string; message?: string; details?: any }> {
  try {
    const response = await apiRequest('POST', '/api/commands', command);
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Create command error:', error);
    
    // Tentar extrair mensagem de erro do response se disponível
    let errorMessage = 'Falha ao criar comando';
    let errorDetails: any = null;
    
    if (error?.data) {
      // Erro já parseado pelo throwIfResNotOk
      errorMessage = error.data.message || error.data.error || errorMessage;
      errorDetails = error.data.details;
    } else if (error instanceof Error) {
      // Tentar parsear mensagem de erro do formato "500: {...}"
      const match = error.message.match(/\d+:\s*(\{.*\})/);
      if (match) {
        try {
          const errorData = JSON.parse(match[1]);
          errorMessage = errorData.message || errorData.error || errorMessage;
          errorDetails = errorData.details;
        } catch (e) {
          errorMessage = error.message;
        }
      } else {
        errorMessage = error.message;
      }
    }
    
    return { 
      success: false, 
      error: errorMessage,
      message: errorMessage,
      details: errorDetails
    };
  }
}

export async function updateCommand(id: number, update: Partial<Command>): Promise<{ success: boolean; command?: Command; error?: string; message?: string; details?: any }> {
  try {
    const response = await apiRequest('PATCH', `/api/commands/${id}`, update);
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Update command error:', error);
    
    // Tentar extrair mensagem de erro do response se disponível
    let errorMessage = 'Falha ao atualizar comando';
    let errorDetails: any = null;
    
    if (error?.data) {
      // Erro já parseado pelo throwIfResNotOk
      errorMessage = error.data.message || error.data.error || errorMessage;
      errorDetails = error.data.details;
    } else if (error instanceof Error) {
      // Tentar parsear mensagem de erro do formato "500: {...}"
      const match = error.message.match(/\d+:\s*(\{.*\})/);
      if (match) {
        try {
          const errorData = JSON.parse(match[1]);
          errorMessage = errorData.message || errorData.error || errorMessage;
          errorDetails = errorData.details;
        } catch (e) {
          errorMessage = error.message;
        }
      } else {
        errorMessage = error.message;
      }
    }
    
    return { 
      success: false, 
      error: errorMessage,
      message: errorMessage,
      details: errorDetails
    };
  }
}

export async function deleteCommand(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await apiRequest('DELETE', `/api/commands/${id}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Delete command error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export async function reloadCommands(): Promise<{ success: boolean; message?: string; commandsCount?: number; commands?: any[]; error?: string }> {
  try {
    const response = await apiRequest('POST', '/api/commands/reload');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Reload commands error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

// Types for command import
export interface SlashCommandAutocomplete {
  enabled: boolean;
  service?: string; // Required only when enabled is true
  apiUrl?: string;
  apiMethod?: 'GET' | 'POST';
  apiHeaders?: Record<string, string>;
  apiBody?: Record<string, any>;
  usePreviousParameters?: boolean;
  filterByParameters?: string[];
}

export interface SlashCommandImport {
  name: string;
  description: string;
  response: string;
  webhookUrl?: string | null;
  webhookFailureMessage?: string | null;
  requiredPermission?: 'everyone' | 'moderator' | 'admin' | 'server-owner';
  cooldown?: number;
  enabledForAllServers?: boolean;
  deleteUserMessage?: boolean;
  logUsage?: boolean;
  active?: boolean;
  requireConfirmation?: boolean;
  confirmationMessage?: string | null;
  cancelMessage?: string | null;
  options?: Array<{
    name: string;
    description: string;
    type: 'STRING' | 'INTEGER' | 'BOOLEAN' | 'USER' | 'CHANNEL' | 'ROLE' | 'ATTACHMENT';
    required?: boolean;
    autocomplete?: SlashCommandAutocomplete;
  }>;
}

export interface ImportCommandsOptions {
  skipDuplicates?: boolean;
  updateExisting?: boolean;
}

export interface ImportResult {
  success: boolean;
  name: string;
  error?: string;
  action?: 'created' | 'updated' | 'skipped';
}

export interface ImportCommandsResponse {
  success: boolean;
  message: string;
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  results: ImportResult[];
  error?: string;
  details?: any;
}

export async function importCommands(
  commands: SlashCommandImport[],
  options: ImportCommandsOptions = {}
): Promise<ImportCommandsResponse> {
  try {
    const response = await apiRequest('POST', '/api/commands/import', {
      commands,
      skipDuplicates: options.skipDuplicates ?? true,
      updateExisting: options.updateExisting ?? false
    });
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Import commands error:', error);
    
    let errorMessage = 'Falha ao importar comandos';
    let errorDetails: any = null;
    
    if (error?.data) {
      errorMessage = error.data.message || error.data.error || errorMessage;
      errorDetails = error.data.details;
    } else if (error instanceof Error) {
      const match = error.message.match(/\d+:\s*(\{.*\})/);
      if (match) {
        try {
          const errorData = JSON.parse(match[1]);
          errorMessage = errorData.message || errorData.error || errorMessage;
          errorDetails = errorData.details;
        } catch (e) {
          errorMessage = error.message;
        }
      } else {
        errorMessage = error.message;
      }
    }
    
    return { 
      success: false, 
      message: errorMessage,
      error: errorMessage,
      details: errorDetails,
      summary: { total: 0, created: 0, updated: 0, skipped: 0, errors: 0 },
      results: []
    };
  }
}

// Logs API Functions
export async function getLogs(params?: {
  server?: string;
  command?: string;
  user?: string;
  limit?: number;
  offset?: number;
}): Promise<{ success: boolean; logs?: CommandLog[]; pagination?: { total: number; limit: number; offset: number }; error?: string }> {
  try {
    // Get botId from localStorage
    const botId = localStorage.getItem('botId');
    if (!botId) {
      return { 
        success: false, 
        error: 'Bot ID not found' 
      };
    }

    const queryParams = {
      ...params,
      botId
    };
      
    const queryString = '?' + Object.entries(queryParams)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');
      
    const response = await apiRequest('GET', `/api/logs${queryString}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get logs error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

// Plugins API Functions
export async function getPlugins(): Promise<{ success: boolean; plugins?: Plugin[]; error?: string }> {
  try {
    const response = await apiRequest('GET', '/api/plugins');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get plugins error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export async function getPlugin(id: number): Promise<{ success: boolean; plugin?: Plugin; error?: string }> {
  try {
    const response = await apiRequest('GET', `/api/plugins/${id}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get plugin error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export async function createPlugin(plugin: InsertPlugin): Promise<{ success: boolean; plugin?: Plugin; error?: string }> {
  try {
    const response = await apiRequest('POST', '/api/plugins', plugin);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Create plugin error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export async function updatePlugin(id: number, update: Partial<Plugin>): Promise<{ success: boolean; plugin?: Plugin; error?: string }> {
  try {
    const response = await apiRequest('PATCH', `/api/plugins/${id}`, update);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Update plugin error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export async function deletePlugin(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await apiRequest('DELETE', `/api/plugins/${id}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Delete plugin error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export async function getCommandsUsedLast24Hours(botId: string): Promise<number> {
  const response = await fetch(`/api/commands/stats?botId=${botId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch command stats');
  }
  const data = await response.json();
  return data.count;
}
