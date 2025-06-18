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

// Reduzido para 3 tentativas e aumentado o delay para evitar múltiplas inicializações
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000; // 3 segundos
const LOGIN_COOLDOWN = 5000; // 5 segundos de cooldown entre tentativas de login

// Variável para controlar tentativas de login recentes
let lastLoginAttempt = 0;

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [botInfo, setBotInfo] = useState<AuthContextType['botInfo']>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const { toast } = useToast();

  // Check authentication status on mount with retry logic
  useEffect(() => {
    // Evitar verificações redundantes
    if (isCheckingAuth) return;

    let retryCount = 0;
    let timeoutId: NodeJS.Timeout;

    const checkAuth = async () => {
      // Evitar múltiplas verificações simultâneas
      if (isCheckingAuth) return;
      
      setIsCheckingAuth(true);
      
      try {
        console.log(`Auth check attempt ${retryCount + 1}/${MAX_RETRIES}`);
        
        // Tentar recuperar o token do sessionStorage primeiro, depois do localStorage
        const token = sessionStorage.getItem('botToken') || localStorage.getItem('botToken');
        
        // Se temos um token mas não temos uma sessão ativa, tentar fazer login novamente
        // mas apenas se não houve tentativa recente
        const now = Date.now();
        if (token && !isAuthenticated && (now - lastLoginAttempt > LOGIN_COOLDOWN)) {
          console.log('Token encontrado, tentando reconectar...');
          lastLoginAttempt = now;
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
          
          // Armazenar o botId em ambos localStorage e sessionStorage
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
          console.log('Auth check failed after max retries');
          setIsAuthenticated(false);
          setBotInfo(null);
          setLoading(false);
          
          // Limpar dados de autenticação inválidos
          localStorage.removeItem('botId');
          sessionStorage.removeItem('botId');
          // Não remover tokens aqui para permitir tentativas futuras de login
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`Retrying auth check after error (${retryCount}/${MAX_RETRIES})...`);
          timeoutId = setTimeout(checkAuth, RETRY_DELAY);
        } else {
          console.log('Auth check failed after max retries (error)');
          setIsAuthenticated(false);
          setBotInfo(null);
          setLoading(false);
          
          // Limpar dados de autenticação em caso de erro
          localStorage.removeItem('botId');
          sessionStorage.removeItem('botId');
          // Não remover tokens aqui para permitir tentativas futuras de login
        }
      } finally {
        setIsCheckingAuth(false);
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
    
    // Verificar cooldown para evitar múltiplas tentativas em sequência
    const now = Date.now();
    if (now - lastLoginAttempt < LOGIN_COOLDOWN) {
      console.log('Login attempt too soon after previous attempt, cooling down...');
      toast({
        title: 'Aguarde um momento',
        description: 'Tentativa de conexão muito rápida. Aguarde alguns segundos.',
        variant: 'destructive',
      });
      return false;
    }
    
    lastLoginAttempt = now;
    setLoading(true);
    
    try {
      // Store token in both localStorage and sessionStorage
      localStorage.setItem('botToken', token);
      sessionStorage.setItem('botToken', token);
      
      const { success, bot, error } = await loginWithToken(token);
      console.log('Login response:', { success, bot, error });
      
      if (success && bot) {
        // Aguardar menos tempo, já que o servidor já processou o login
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Double check the auth status
        const { success: verifySuccess, bot: verifyBot } = await checkAuthStatus();
        console.log('Verification after login:', { verifySuccess, verifyBot });
        
        if (verifySuccess && verifyBot) {
          setIsAuthenticated(true);
          setBotInfo({
            name: verifyBot.name,
            id: verifyBot.id,
            avatar: verifyBot.avatar,
          });
          
          // Armazenar o botId em ambos localStorage e sessionStorage
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
        // Não remover tokens aqui para permitir tentativas futuras
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
      // Não remover tokens aqui para permitir tentativas futuras
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
    // Evitar verificações redundantes
    if (isCheckingAuth || loading) {
      console.log('Skipping status check - already checking auth or loading');
      return;
    }
    
    setIsCheckingAuth(true);
    setLoading(true);
    
    try {
      console.log('Performing manual status check');
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
      setIsCheckingAuth(false);
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
