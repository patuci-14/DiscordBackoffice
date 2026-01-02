import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import PageTransition from "@/components/ui/page-transition";
import React, { useEffect, useState } from "react";

import Login from "@/pages/login";
import UserLogin from "@/pages/user-login";
import Dashboard from "@/pages/dashboard";
import Config from "@/pages/config";
import Commands from "@/pages/commands";
import Logs from "@/pages/logs";
import NotFound from "@/pages/not-found";

import { useAuth } from "@/components/auth/auth-provider";
import { useUserAuth } from "@/components/auth/user-auth-provider";

function Router() {
  const { isAuthenticated: isBotAuthenticated, loading: botLoading } = useAuth();
  const { isAuthenticated: isUserAuthenticated, loading: userLoading } = useUserAuth();
  const [location] = useLocation();
  const [currentPath, setCurrentPath] = useState(location);
  
  const loading = userLoading || botLoading;
  
  // Atualizar o caminho atual quando a localização mudar
  useEffect(() => {
    setCurrentPath(location);
  }, [location]);
  
  // If the user is on the root path, redirect them appropriately
  useEffect(() => {
    if (!loading && location === '/') {
      if (!isUserAuthenticated) {
        window.location.href = '/user-login';
      } else if (!isBotAuthenticated) {
        window.location.href = '/login';
      } else {
        window.location.href = '/dashboard';
      }
    }
  }, [location, isUserAuthenticated, isBotAuthenticated, loading]);

  // Redirecionar para login de usuário se não estiver autenticado
  useEffect(() => {
    if (!userLoading && !isUserAuthenticated && 
        currentPath !== '/user-login' && 
        currentPath !== '/') {
      window.location.href = '/user-login';
    }
  }, [currentPath, isUserAuthenticated, userLoading]);

  // Redirecionar para login do bot se usuário estiver autenticado mas bot não
  useEffect(() => {
    if (!loading && isUserAuthenticated && !isBotAuthenticated && 
        currentPath !== '/login' && 
        currentPath !== '/user-login' &&
        currentPath !== '/') {
      window.location.href = '/login';
    }
  }, [currentPath, isUserAuthenticated, isBotAuthenticated, loading]);
  
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
    // Verificar se é uma rota protegida
    const isProtectedRoute = currentPath !== '/login' && currentPath !== '/user-login';
    
    // Se não estiver autenticado como usuário, não renderizar rotas protegidas
    if (isProtectedRoute && !isUserAuthenticated) {
      return null; // Será redirecionado pelo useEffect
    }
    
    // Se estiver autenticado como usuário mas não como bot, só permitir login do bot
    if (isUserAuthenticated && !isBotAuthenticated && currentPath !== '/login' && currentPath !== '/user-login') {
      return null; // Será redirecionado pelo useEffect
    }
    
    switch (currentPath) {
      case '/user-login':
        return <UserLogin />;
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
          <Route path="/user-login" />
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

