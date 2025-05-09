import { apiRequest } from "./queryClient";
import { 
  BotConfig, BotStat, RecentActivity, 
  Server, Command, InsertCommand, 
  CommandLog, Plugin, InsertPlugin
} from "@shared/schema";

// Bot API Functions
export async function getBotInfo(): Promise<{ success: boolean; config?: BotConfig; error?: string }> {
  try {
    // Get botId from localStorage
    const botId = localStorage.getItem('botId');
    if (!botId) {
      return { 
        success: false, 
        error: 'Bot ID not found' 
      };
    }

    const response = await apiRequest('GET', `/api/bot?botId=${botId}`);
    const data = await response.json();
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
    const response = await apiRequest('PATCH', '/api/bot', config);
    const data = await response.json();
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
    const botId = localStorage.getItem('botId');
    if (!botId) {
      return { 
        success: false, 
        error: 'Bot ID not found' 
      };
    }
    const response = await apiRequest('GET', `/api/bot/servers?botId=${botId}`);
    const data = await response.json();
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
    // Get botId from localStorage
    const botId = localStorage.getItem('botId');
    if (!botId) {
      return { 
        success: false, 
        error: 'Bot ID not found' 
      };
    }

    const response = await apiRequest('GET', `/api/bot/stats?botId=${botId}`);
    const data = await response.json();
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
    const botId = localStorage.getItem('botId');
    if (!botId) {
      return { 
        success: false, 
        error: 'Bot ID not found' 
      };
    }
    const response = await apiRequest('GET', `/api/commands?botId=${botId}`);
    const data = await response.json();
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

export async function createCommand(command: InsertCommand): Promise<{ success: boolean; command?: Command; error?: string; details?: any }> {
  try {
    const response = await apiRequest('POST', '/api/commands', command);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Create command error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

export async function updateCommand(id: number, update: Partial<Command>): Promise<{ success: boolean; command?: Command; error?: string }> {
  try {
    const response = await apiRequest('PATCH', `/api/commands/${id}`, update);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Update command error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
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
