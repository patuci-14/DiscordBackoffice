import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import PageTransition from "@/components/ui/page-transition";
import React, { useEffect, useState } from "react";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Config from "@/pages/config";
import Commands from "@/pages/commands";
import Logs from "@/pages/logs";
import NotFound from "@/pages/not-found";

import { useAuth } from "@/components/auth/auth-provider";

function Router() {
  const { isAuthenticated, loading } = useAuth();
  const [location] = useLocation();
  const [currentPath, setCurrentPath] = useState(location);
  
  // Atualizar o caminho atual quando a localização mudar
  useEffect(() => {
    setCurrentPath(location);
  }, [location]);
  
  // If the user is on the root path, redirect them appropriately
  useEffect(() => {
    if (!loading && location === '/') {
      console.log('Root path: Redirecting based on auth status:', isAuthenticated);
      if (isAuthenticated) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/login';
      }
    }
  }, [location, isAuthenticated, loading]);

  // Redirecionar para login se não estiver autenticado em rotas protegidas
  useEffect(() => {
    if (!loading && !isAuthenticated && 
        currentPath !== '/login' && 
        currentPath !== '/') {
      console.log('Protected route: Not authenticated, redirecting to login');
      window.location.href = '/login';
    }
  }, [currentPath, isAuthenticated, loading]);
  
  // Mostrar tela de carregamento enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-discord-bg-tertiary">
        <div className="text-center">
          <div className="inline-block">
            <i className="fas fa-circle-notch spin text-4xl text-discord-blurple"></i>
          </div>
          <p className="mt-4 text-lg">Carregando...</p>
        </div>
      </div>
    );
  }
  
  // Renderizar o componente apropriado com base no caminho atual
  const renderRoute = () => {
    // Verificar se é uma rota protegida e se o usuário está autenticado
    const isProtectedRoute = currentPath !== '/login';
    
    if (isProtectedRoute && !isAuthenticated) {
      return null; // Será redirecionado pelo useEffect
    }
    
    switch (currentPath) {
      case '/login':
        return <Login />;
      case '/dashboard':
        return <Dashboard />;
      case '/config':
        return <Config />;
      case '/commands':
        return <Commands />;
      case '/logs':
        return <Logs />;
      default:
        return <NotFound />;
    }
  };
  
  return (
    <div className="w-full min-h-screen bg-discord-bg-primary">
      <PageTransition className="w-full">
        {renderRoute()}
      </PageTransition>
      
      {/* Manter o Switch para gerenciar as rotas */}
      <div style={{ display: 'none' }}>
        <Switch>
          <Route path="/login" />
          <Route path="/dashboard" />
          <Route path="/config" />
          <Route path="/commands" />
          <Route path="/logs" />
          <Route />
        </Switch>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
