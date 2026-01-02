import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { loginUser, checkUserAuthStatus, logoutUser as apiLogoutUser } from '@/lib/user-auth-utils';
import { useToast } from '@/hooks/use-toast';

interface UserAuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  user: {
    username?: string;
  } | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkStatus: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthContextType>({
  isAuthenticated: false,
  loading: true,
  user: null,
  login: async () => false,
  logout: async () => {},
  checkStatus: async () => {},
});

const MAX_RETRIES = 2;
const RETRY_DELAY = 2000;

export const UserAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserAuthContextType['user']>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const { toast } = useToast();

  // Check authentication status on mount
  useEffect(() => {
    if (isCheckingAuth) return;

    let retryCount = 0;
    let timeoutId: NodeJS.Timeout;

    const checkAuth = async () => {
      if (isCheckingAuth) return;
      
      setIsCheckingAuth(true);
      
      try {
        // Verificar se há token salvo (apenas sessionStorage para segurança)
        const token = sessionStorage.getItem('userToken');
        
        if (!token) {
          setIsAuthenticated(false);
          setUser(null);
          setLoading(false);
          setIsCheckingAuth(false);
          return;
        }

        const { success, user: userData } = await checkUserAuthStatus();
        
        if (success && userData) {
          setIsAuthenticated(true);
          setUser({
            username: userData.username,
          });
          setLoading(false);
        } else if (retryCount < MAX_RETRIES) {
          retryCount++;
          timeoutId = setTimeout(checkAuth, RETRY_DELAY);
        } else {
          setIsAuthenticated(false);
          setUser(null);
          setLoading(false);
          // Limpar token inválido
          sessionStorage.removeItem('userToken');
          localStorage.removeItem('userToken'); // Limpar também do localStorage caso exista
        }
      } catch (error) {
        console.error('User auth check error:', error);
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          timeoutId = setTimeout(checkAuth, RETRY_DELAY);
        } else {
          setIsAuthenticated(false);
          setUser(null);
          setLoading(false);
          sessionStorage.removeItem('userToken');
          localStorage.removeItem('userToken'); // Limpar também do localStorage caso exista
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

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      const { success, token, user: userData } = await loginUser(username, password);
      
      if (success && token && userData) {
        // Armazenar token apenas no sessionStorage (será limpo ao fechar o navegador)
        // Remover do localStorage se existir (para limpar tokens antigos)
        localStorage.removeItem('userToken');
        sessionStorage.setItem('userToken', token);
        
        setIsAuthenticated(true);
        setUser({
          username: userData.username,
        });
        
        toast({
          title: 'Login realizado com sucesso',
          description: `Bem-vindo, ${userData.username}!`,
        });
        return true;
      } else {
        setIsAuthenticated(false);
        setUser(null);
        toast({
          title: 'Falha no login',
          description: 'Credenciais inválidas. Verifique seu username e senha.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setIsAuthenticated(false);
      setUser(null);
      toast({
        title: 'Erro no login',
        description: error instanceof Error ? error.message : 'Ocorreu um erro inesperado',
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
      await apiLogoutUser();
      
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('userToken');
      sessionStorage.removeItem('userToken');
      
      toast({
        title: 'Logout realizado',
        description: 'Você foi desconectado com sucesso.',
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Mesmo em caso de erro, limpar o estado local
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('userToken');
      sessionStorage.removeItem('userToken');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (): Promise<void> => {
    if (isCheckingAuth || loading) {
      return;
    }
    
    setIsCheckingAuth(true);
    setLoading(true);
    
    try {
      const { success, user: userData } = await checkUserAuthStatus();
      setIsAuthenticated(success);
      if (success && userData) {
        setUser({
          username: userData.username,
        });
      } else {
        setUser(null);
        localStorage.removeItem('userToken');
        sessionStorage.removeItem('userToken');
      }
    } catch (error) {
      console.error('Status check error:', error);
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('userToken');
      sessionStorage.removeItem('userToken');
    } finally {
      setLoading(false);
      setIsCheckingAuth(false);
    }
  };

  return (
    <UserAuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        user,
        login,
        logout,
        checkStatus,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
};

export const useUserAuth = () => useContext(UserAuthContext);

