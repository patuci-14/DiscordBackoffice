import React, { useState, useEffect } from 'react';
import { useUserAuth } from '@/components/auth/user-auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

// Tempo mínimo para mostrar o indicador de carregamento
const MIN_LOADING_TIME = 1000;

const UserLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isAuthenticated, loading } = useUserAuth();
  const { toast } = useToast();
  
  // Redirecionar se autenticado
  useEffect(() => {
    if (!loading && isAuthenticated) {
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Username e senha são obrigatórios');
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
      const success = await login(username, password);
      
      if (success) {
        // O useEffect vai lidar com o redirecionamento quando isAuthenticated mudar
      } else {
        // Garantir tempo mínimo de carregamento para evitar flickering
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < MIN_LOADING_TIME) {
          await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsedTime));
        }
        
        setError('Credenciais inválidas. Verifique seu username e senha.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Ocorreu um erro inesperado. Por favor, tente novamente.');
      toast({
        variant: 'destructive',
        title: 'Falha no Login',
        description: 'Não foi possível fazer login. Verifique suas credenciais e tente novamente.',
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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-discord-bg-tertiary">
        <div className="text-center">
          <div className="inline-block">
            <i className="fas fa-circle-notch spin text-4xl text-discord-blurple"></i>
          </div>
          <p className="mt-4 text-lg">Verificando autenticação...</p>
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
            <h1 className="text-2xl font-bold text-white">Acesso ao Backoffice</h1>
            <p className="text-discord-text-secondary mt-2">Faça login para acessar o sistema</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1 text-white">Username</label>
              <Input
                id="username"
                type="text"
                placeholder="Digite seu username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-discord-bg-tertiary border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-discord-blurple focus:border-transparent text-white"
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1 text-white">Senha</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-[45px] bg-discord-bg-tertiary border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-discord-blurple focus:border-transparent text-white"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button 
                  type="button" 
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-discord-text-secondary hover:text-white"
                  disabled={isLoading}
                >
                  <i className={showPassword ? "far fa-eye-slash" : "far fa-eye"}></i>
                </button>
              </div>
            </div>
            
            {error && (
              <Alert variant="destructive" className="bg-discord-red bg-opacity-20 text-discord-red px-4 py-2 rounded-md text-sm">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-discord-blurple hover:bg-opacity-80 text-white font-medium py-2 px-4 rounded-md transition duration-200"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-circle-notch spin mr-2"></i>
                  Entrando...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Entrar
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserLogin;

