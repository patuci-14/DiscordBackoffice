import { Link, useLocation } from 'wouter';
import { useAuth } from '@/components/auth/auth-provider';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import React, { useMemo } from 'react';

interface SidebarProps {
  botName?: string;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ botName = 'Discord Bot' }) => {
  const [location] = useLocation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  // Definir os itens de navegação para evitar recarregar
  const navItems = useMemo(() => [
    { to: "/dashboard", icon: "fas fa-tachometer-alt", label: "Dashboard" },
    { to: "/config", icon: "fas fa-cogs", label: "Configurações" },
    { to: "/commands", icon: "fas fa-terminal", label: "Comandos" },
    { to: "/logs", icon: "fas fa-list", label: "Logs" }
  ], []);

  // We need to fix the nested <a> tags issue with wouter
  const NavItem = React.memo(({ to, icon, label }: { to: string; icon: string; label: string }) => {
    const isActive = location === to;
    
    return (
      <motion.li
        whileHover={{ x: 5 }}
        key={to}
        layout
      >
        <Link href={to}>
          <motion.div 
            className={`cursor-pointer block w-full flex items-center px-4 py-2 rounded-md my-1 mx-2 ${
              isActive 
                ? 'bg-discord-bg-primary text-white' 
                : 'text-discord-text-secondary hover:bg-discord-bg-primary hover:text-white'
            }`}
            whileHover={{ 
              backgroundColor: isActive ? undefined : 'rgba(79, 84, 92, 0.3)'
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            layout
          >
            <motion.i 
              className={`${icon} w-5 mr-3`}
              whileHover={{ rotate: isActive ? 0 : 10 }}
              transition={{ duration: 0.3 }}
              layout
            />
            {label}
            {isActive && (
              <motion.div
                className="ml-auto h-2 w-2 rounded-full bg-discord-blurple"
                layoutId="activeIndicator"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </motion.div>
        </Link>
      </motion.li>
    );
  });

  // Usar um ID estático para o sidebar para manter a animação entre renderizações
  const sidebarId = useMemo(() => "main-sidebar", []);

  return (
    <motion.aside 
      className="w-64 bg-discord-bg-secondary flex-shrink-0 h-screen flex flex-col overflow-hidden"
      layoutId={sidebarId}
      transition={{ duration: 0.3 }}
    >
      <motion.div 
        className="flex items-center p-4 border-b border-gray-700"
        whileHover={{ backgroundColor: "rgba(79, 84, 92, 0.2)" }}
        transition={{ duration: 0.2 }}
        layout
      >
        <motion.i 
          className="fab fa-discord text-discord-blurple text-2xl mr-3"
          whileHover={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.5 }}
          layout
        />
        <motion.h1 
          className="font-bold text-lg"
          layout
        >
          {botName}
        </motion.h1>
      </motion.div>
      
      {/* Bot Status Indicator 
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center">
          <span className="h-3 w-3 bg-discord-green rounded-full mr-2"></span>
          <span className="text-sm"></span>
        </div>
        <p className="text-xs text-discord-text-secondary mt-1">Online</p>
      </div>
      */}

      {/* Navigation Menu */}
      <nav className="py-4 flex-1 overflow-y-auto no-scrollbar">
        <motion.ul layout>
          {navItems.map((item) => (
            <NavItem 
              key={item.to} 
              to={item.to} 
              icon={item.icon} 
              label={item.label} 
            />
          ))}
        </motion.ul>
      </nav>
      
      {/* Bottom Actions */}
      <motion.div 
        className="border-t border-gray-700 p-4"
        layout
      >
        <Button 
          onClick={handleLogout}
          className="w-full px-4 py-2 text-sm text-discord-text-secondary hover:text-white bg-discord-bg-tertiary rounded-md flex items-center justify-center"
          animationType="bounce"
          iconLeft="fas fa-sign-out-alt"
        >
          Desconectar
        </Button>
      </motion.div>
    </motion.aside>
  );
});

export default Sidebar;
