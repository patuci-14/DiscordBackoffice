import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

// Tempo mínimo para mostrar o indicador de carregamento
const MIN_LOADING_TIME = 1500;

const Login: React.FC = () => {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isAuthenticated, loading } = useAuth();
  const { toast } = useToast();
  const [loginAttempted, setLoginAttempted] = useState(false);
  
  // Recuperar token salvo, se existir
  useEffect(() => {
    const savedToken = sessionStorage.getItem('botToken') || localStorage.getItem('botToken');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  // Redirecionar se autenticado
  useEffect(() => {
    console.log('Login component auth status:', { isAuthenticated, loading, loginAttempted });
    
    if (!loading && isAuthenticated) {
      console.log('User is authenticated, redirecting to dashboard...');
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated, loading, loginAttempted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token.trim()) {
      setError('Token do bot é obrigatório');
      return;
    }
    
    // Evitar múltiplos envios
    if (isLoading) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Registrar início do tempo de carregamento
    const startTime = Date.now();
    
    try {
      console.log('Attempting login...');
      const success = await login(token);
      console.log('Login attempt result:', success);
      
      if (success) {
        console.log('Login successful, waiting for state update...');
        setLoginAttempted(true);
        // O useEffect vai lidar com o redirecionamento quando isAuthenticated mudar
      } else {
        // Garantir tempo mínimo de carregamento para evitar flickering
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < MIN_LOADING_TIME) {
          await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsedTime));
        }
        
        setError('Falha na conexão. Verifique seu token e tente novamente.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Ocorreu um erro inesperado. Por favor, tente novamente.');
      toast({
        variant: 'destructive',
        title: 'Falha no Login',
        description: 'Não foi possível conectar ao Discord. Verifique seu token e tente novamente.',
      });
    } finally {
      // Garantir tempo mínimo de carregamento para evitar flickering
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < MIN_LOADING_TIME) {
        await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsedTime));
      }
      
      setIsLoading(false);
    }
  };

  const toggleTokenVisibility = () => {
    setShowToken(!showToken);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-discord-bg-tertiary">
        <div className="text-center">
          <div className="inline-block">
            <i className="fas fa-circle-notch spin text-4xl text-discord-blurple"></i>
          </div>
          <p className="mt-4 text-lg">Verificando conexão...</p>
          <p className="mt-2 text-sm text-discord-text-secondary">Aguarde um momento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-discord-bg-tertiary">
      <Card className="bg-discord-bg-secondary rounded-lg shadow-xl p-8 max-w-xl w-full">
        <CardContent className="p-0">
          <div className="text-center mb-8">
            <i className="fab fa-discord text-discord-blurple text-5xl mb-4"></i>
            <h1 className="text-2xl font-bold text-white">Gerenciador de Bots</h1>
            <p className="text-discord-text-secondary mt-2">Conecte seu bot do Discord para gerenciá-lo</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="bot-token" className="block text-sm font-medium mb-1 text-white">Token do Bot</label>
              <div className="relative flex">
                <Input
                  id="bot-token"
                  type={showToken ? "text" : "password"}
                  placeholder="Digite o token do bot"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-4 py-2 pr-[45px] bg-discord-bg-tertiary border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-discord-blurple focus:border-transparent text-white"
                  disabled={isLoading}
                />
                <button 
                  type="button" 
                  style={{ right: '77px' }}
                  onClick={toggleTokenVisibility}
                  className="absolute inset-y-0 right-0 flex items-center text-discord-text-secondary hover:text-white"
                  disabled={isLoading}
                >
                  <i className={showToken ? "far fa-eye-slash" : "far fa-eye"}></i>
                </button>
                <Button
                  type="submit"
                  style={{ marginLeft: '0.5rem' }}
                  disabled={isLoading}
                  className="w-full bg-discord-blurple hover:bg-opacity-80 text-white font-medium py-2 px-4 rounded-md transition duration-200"
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-circle-notch spin mr-2"></i>
                      Conectando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-in-alt mr-2"></i></>
                  )}
                </Button>
              </div>
              <p className="text-xs text-discord-text-secondary mt-1">Seu token é armazenado de forma segura e nunca é exposto ao frontend</p>
            </div>
            
            {error && (
              <Alert variant="destructive" className="bg-discord-red bg-opacity-20 text-discord-red px-4 py-2 rounded-md text-sm">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
