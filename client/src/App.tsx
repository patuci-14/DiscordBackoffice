import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Config from "@/pages/config";
import Commands from "@/pages/commands";
import Logs from "@/pages/logs";
import Plugins from "@/pages/plugins";
import NotFound from "@/pages/not-found";

import { useAuth } from "@/components/auth/auth-provider";
import { useEffect } from "react";
import { useLocation } from "wouter";

// Protected route component that redirects to login if not authenticated
function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any>, [key: string]: any }) {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('Protected route: Not authenticated, redirecting to login');
      window.location.href = '/login';
    }
  }, [isAuthenticated, loading]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-discord-bg-tertiary">
        <div className="text-center">
          <div className="inline-block">
            <i className="fas fa-circle-notch spin text-4xl text-discord-blurple"></i>
          </div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return null; // Will redirect due to the useEffect
  }
  
  return <Component {...rest} />;
}

function Router() {
  const { isAuthenticated, loading } = useAuth();
  const [location] = useLocation();
  
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
  
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={(props) => <ProtectedRoute component={Dashboard} {...props} />} />
      <Route path="/config" component={(props) => <ProtectedRoute component={Config} {...props} />} />
      <Route path="/commands" component={(props) => <ProtectedRoute component={Commands} {...props} />} />
      <Route path="/logs" component={(props) => <ProtectedRoute component={Logs} {...props} />} />
      <Route path="/plugins" component={(props) => <ProtectedRoute component={Plugins} {...props} />} />
      <Route component={NotFound} />
    </Switch>
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
