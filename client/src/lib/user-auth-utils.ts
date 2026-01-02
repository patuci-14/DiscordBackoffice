import { apiRequest } from "./queryClient";

// Types
export interface UserAuthResponse {
  success: boolean;
  token?: string;
  user?: {
    username: string;
  };
  error?: string;
}

export interface UserLoginRequest {
  username: string;
  password: string;
}

// Function to log in with username and password
export async function loginUser(username: string, password: string): Promise<UserAuthResponse> {
  try {
    const response = await apiRequest('POST', '/api/user/login', { username, password });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('User login error:', error);
    return { 
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

// Function to check user authentication status
export async function checkUserAuthStatus(): Promise<UserAuthResponse> {
  try {
    const response = await apiRequest('GET', '/api/user/status');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('User auth status check error:', error);
    return { 
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

// Function to log out
export async function logoutUser(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await apiRequest('POST', '/api/user/logout');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('User logout error:', error);
    return { 
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

