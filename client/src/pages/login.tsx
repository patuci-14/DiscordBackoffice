import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/components/auth/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const Login: React.FC = () => {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token.trim()) {
      setError('Bot token is required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await login(token);
      if (success) {
        setLocation('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Could not connect to Discord. Check your token and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTokenVisibility = () => {
    setShowToken(!showToken);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-discord-bg-tertiary">
      <Card className="bg-discord-bg-secondary rounded-lg shadow-xl p-8 max-w-md w-full">
        <CardContent className="p-0">
          <div className="text-center mb-8">
            <i className="fab fa-discord text-discord-blurple text-5xl mb-4"></i>
            <h1 className="text-2xl font-bold text-white">Bot Manager</h1>
            <p className="text-discord-text-secondary mt-2">Connect your Discord bot to manage it</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="bot-token" className="block text-sm font-medium mb-1 text-white">Bot Token</label>
              <div className="relative">
                <Input
                  id="bot-token"
                  type={showToken ? "text" : "password"}
                  placeholder="Enter your bot token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-4 py-2 pr-[35px] bg-discord-bg-tertiary border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-discord-blurple focus:border-transparent text-white"
                />
                <button 
                  type="button" 
                  onClick={toggleTokenVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-discord-text-secondary hover:text-white"
                >
                  <i className={showToken ? "far fa-eye-slash" : "far fa-eye"}></i>
                </button>
              </div>
              <p className="text-xs text-discord-text-secondary mt-1">Your token is stored securely and never exposed to the frontend</p>
            </div>
            
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-discord-blurple hover:bg-opacity-80 text-white font-medium py-2 px-4 rounded-md transition duration-200"
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-circle-notch spin mr-2"></i>
                    Connecting...
                  </>
                ) : (
                  'Connect Bot'
                )}
              </Button>
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
