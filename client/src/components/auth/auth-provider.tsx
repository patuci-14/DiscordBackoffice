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

const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [botInfo, setBotInfo] = useState<AuthContextType['botInfo']>(null);
  const { toast } = useToast();

  useEffect(() => {
    let retryCount = 0;
    let timeoutId: NodeJS.Timeout;

    const checkAuth = async () => {
      try {
        const token = sessionStorage.getItem('botToken') || localStorage.getItem('botToken');
        
        if (token && !isAuthenticated) {
          console.log('Token encontrado, tentando reconectar...');
          await loginWithToken(token);
        }
        
        const { success, bot } = await checkAuthStatus();
        console.log('Auth check result:', { success, bot, retryCount });
        
        if (success && bot) {
          setIsAuthenticated(true);
          setBotInfo({
            name: bot.name,
            id: bot.id,
            avatar: bot.avatar,
          });
          
          if (bot.id) {
            localStorage.setItem('botId', bot.id);
            sessionStorage.setItem('botId', bot.id);
          }
          
          setLoading(false);
        } else if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`Retrying auth check (${retryCount}/${MAX_RETRIES})...`);
          timeoutId = setTimeout(checkAuth, RETRY_DELAY);
        } else {
          setIsAuthenticated(false);
          setBotInfo(null);
          setLoading(false);
          
          localStorage.removeItem('botId');
          sessionStorage.removeItem('botId');
          localStorage.removeItem('botToken');
          sessionStorage.removeItem('botToken');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`Retrying auth check after error (${retryCount}/${MAX_RETRIES})...`);
          timeoutId = setTimeout(checkAuth, RETRY_DELAY);
        } else {
          setIsAuthenticated(false);
          setBotInfo(null);
          setLoading(false);
          
          localStorage.removeItem('botId');
          sessionStorage.removeItem('botId');
          localStorage.removeItem('botToken');
          sessionStorage.removeItem('botToken');
        }
      }
    };

    checkAuth();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const login = async (token: string): Promise<boolean> => {
    console.log('Starting login process...');
    setLoading(true);
    try {
      localStorage.setItem('botToken', token);
      sessionStorage.setItem('botToken', token);
      
      const { success, bot, error } = await loginWithToken(token);
      console.log('Login response:', { success, bot, error });
      
      if (success && bot) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { success: verifySuccess, bot: verifyBot } = await checkAuthStatus();
        console.log('Verification after login:', { verifySuccess, verifyBot });
        
        if (verifySuccess && verifyBot) {
          setIsAuthenticated(true);
          setBotInfo({
            name: verifyBot.name,
            id: verifyBot.id,
            avatar: verifyBot.avatar,
          });
          
          if (verifyBot.id) {
            localStorage.setItem('botId', verifyBot.id);
            sessionStorage.setItem('botId', verifyBot.id);
          }
          
          toast({
            title: 'Connected successfully',
            description: `Bot ${verifyBot.name} is now connected.`,
          });
          return true;
        } else {
          throw new Error('Login verification failed');
        }
      } else {
        setIsAuthenticated(false);
        setBotInfo(null);
        localStorage.removeItem('botId');
        sessionStorage.removeItem('botId');
        localStorage.removeItem('botToken');
        sessionStorage.removeItem('botToken');
        toast({
          title: 'Connection failed',
          description: error || 'Invalid token or connection failed.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setIsAuthenticated(false);
      setBotInfo(null);
      localStorage.removeItem('botId');
      sessionStorage.removeItem('botId');
      localStorage.removeItem('botToken');
      sessionStorage.removeItem('botToken');
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
        sessionStorage.removeItem('botId');
        localStorage.removeItem('botToken');
        sessionStorage.removeItem('botToken');
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
      console.log('Status check result:', { success, bot });
      setIsAuthenticated(success);
      if (success && bot) {
        setBotInfo({
          name: bot.name,
          id: bot.id,
          avatar: bot.avatar,
        });
        if (bot.id) {
          localStorage.setItem('botId', bot.id);
          sessionStorage.setItem('botId', bot.id);
        }
      } else {
        setBotInfo(null);
        localStorage.removeItem('botId');
        sessionStorage.removeItem('botId');
      }
    } catch (error) {
      console.error('Status check error:', error);
      setIsAuthenticated(false);
      setBotInfo(null);
      localStorage.removeItem('botId');
      sessionStorage.removeItem('botId');
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
