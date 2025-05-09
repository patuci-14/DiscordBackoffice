import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { checkAuthStatus, loginWithToken, logout as apiLogout } from '@/lib/auth-utils';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  botInfo: {
    name?: string;
    id?: string;
    avatar?: string;
  } | null;
  login: (token: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: true,
  botInfo: null,
  login: async () => false,
  logout: async () => {},
  checkStatus: async () => {},
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [botInfo, setBotInfo] = useState<AuthContextType['botInfo']>(null);
  const { toast } = useToast();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { success, bot } = await checkAuthStatus();
        setIsAuthenticated(success);
        if (success && bot) {
          setBotInfo({
            name: bot.name,
            id: bot.id,
            avatar: bot.avatar,
          });
        }
      } catch (error) {
        setIsAuthenticated(false);
        setBotInfo(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (token: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { success, bot, error } = await loginWithToken(token);
      
      if (success && bot) {
        setIsAuthenticated(true);
        setBotInfo({
          name: bot.name,
          id: bot.id,
          avatar: bot.avatar,
        });
        // Save botId in localStorage
        localStorage.setItem('botId', bot.id);
        toast({
          title: 'Connected successfully',
          description: `Bot ${bot.name} is now connected.`,
        });
        return true;
      } else {
        setIsAuthenticated(false);
        setBotInfo(null);
        localStorage.removeItem('botId');
        toast({
          title: 'Connection failed',
          description: error || 'Invalid token or connection failed.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      setIsAuthenticated(false);
      setBotInfo(null);
      localStorage.removeItem('botId');
      toast({
        title: 'Connection error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      const { success, error } = await apiLogout();
      
      if (success) {
        setIsAuthenticated(false);
        setBotInfo(null);
        localStorage.removeItem('botId');
        toast({
          title: 'Disconnected',
          description: 'Bot has been disconnected successfully.',
        });
      } else {
        toast({
          title: 'Disconnect error',
          description: error || 'Failed to disconnect the bot.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Disconnect error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (): Promise<void> => {
    setLoading(true);
    try {
      const { success, bot } = await checkAuthStatus();
      setIsAuthenticated(success);
      if (success && bot) {
        setBotInfo({
          name: bot.name,
          id: bot.id,
          avatar: bot.avatar,
        });
      } else {
        setBotInfo(null);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setBotInfo(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        botInfo,
        login,
        logout,
        checkStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
