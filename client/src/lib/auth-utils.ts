import { apiRequest } from "./queryClient";

// Types
export interface AuthResponse {
  success: boolean;
  bot?: {
    name: string;
    id: string;
    avatar?: string;
    isConnected: boolean;
  };
  error?: string;
}

export interface LoginRequest {
  token: string;
}

// Function to log in with Discord bot token
export async function loginWithToken(token: string): Promise<AuthResponse> {
  try {
    const response = await apiRequest('POST', '/api/auth/login', { token });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

// Function to check authentication status
export async function checkAuthStatus(): Promise<AuthResponse> {
  try {
    const response = await apiRequest('GET', '/api/auth/status');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Auth status check error:', error);
    return { 
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

// Function to log out (disconnect the bot)
export async function logout(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await apiRequest('POST', '/api/auth/logout');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Logout error:', error);
    return { 
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}
