import { Link, useLocation } from 'wouter';
import { useAuth } from '@/components/auth/auth-provider';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import React, { useMemo } from 'react';

interface MobileMenuProps {
  onClose: () => void;
  botName?: string;
}

const MobileMenu: React.FC<MobileMenuProps> = React.memo(({ onClose, botName = 'Discord Bot' }) => {
  const [location] = useLocation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
    onClose();
  };

  const handleNavigation = () => {
    // Close the mobile menu after navigation
    onClose();
  };

  // Definir os itens de navegação para evitar recarregar
  const navItems = useMemo(() => [
    { to: "/dashboard", icon: "fas fa-tachometer-alt", label: "Dashboard" },
    { to: "/config", icon: "fas fa-cogs", label: "Configurações" },
    { to: "/commands", icon: "fas fa-terminal", label: "Comandos" },
    { to: "/logs", icon: "fas fa-list", label: "Logs" }
  ], []);

  const menuVariants = useMemo(() => ({
    hidden: { x: '100%', opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    exit: { x: '100%', opacity: 0, transition: { duration: 0.2 } }
  }), []);

  // Componente de item de navegação memoizado
  const NavItem = useMemo(() => React.memo(({ item, index }: { item: typeof navItems[0], index: number }) => {
    const isActive = location === item.to;
    
    return (
      <motion.li
        key={item.to}
        custom={index}
        variants={{
          hidden: { x: 20, opacity: 0 },
          visible: { 
            x: 0, 
            opacity: 1, 
            transition: { delay: index * 0.05, duration: 0.3 }
          }
        }}
        initial="hidden"
        animate="visible"
        layout
      >
        <Link href={item.to}>
          <motion.a 
            onClick={handleNavigation}
            className={`block w-full flex items-center px-4 py-3 rounded-md ${
              isActive 
                ? 'bg-discord-bg-primary text-white' 
                : 'text-discord-text-secondary hover:bg-discord-bg-primary hover:text-white'
            } transition duration-150`}
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.98 }}
            layout
          >
            <i className={`${item.icon} w-5 mr-3`}></i> {item.label}
            {isActive && (
              <motion.div
                className="ml-auto h-2 w-2 rounded-full bg-discord-blurple"
                layoutId="mobileActiveIndicator"
              />
            )}
          </motion.a>
        </Link>
      </motion.li>
    );
  }), [location, handleNavigation]);

  // ID estático para o menu mobile
  const mobileMenuId = useMemo(() => "mobile-menu", []);

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-discord-bg-tertiary z-40 md:hidden p-4 pt-16"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={menuVariants}
        layoutId={mobileMenuId}
      >
        <motion.button
          className="absolute top-4 right-4 text-white p-2"
          onClick={onClose}
          whileTap={{ scale: 0.9 }}
        >
          <i className="fas fa-times text-xl"></i>
        </motion.button>

        <nav className="py-4">
          <motion.ul className="space-y-2" layout>
            {navItems.map((item, i) => (
              <NavItem key={item.to} item={item} index={i} />
            ))}
          </motion.ul>
        </nav>
        
        <motion.div 
          className="mt-8"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { delay: 0.3 } }
          }}
          layout
        >
          <motion.div 
            className="p-4 border border-gray-700 rounded-md mb-4"
            whileHover={{ borderColor: 'rgba(114, 137, 218, 0.5)' }}
            layout
          >
            <div className="flex items-center">
              <span className="h-3 w-3 bg-discord-green rounded-full mr-2"></span>
              <span className="text-sm">{botName}</span>
            </div>
            <p className="text-xs text-discord-text-secondary mt-1">Online</p>
          </motion.div>
          
          <Button 
            onClick={handleLogout}
            className="w-full px-4 py-3 text-sm text-discord-text-secondary hover:text-white bg-discord-bg-tertiary border border-gray-700 rounded-md flex items-center justify-center"
            animationType="bounce"
            iconLeft="fas fa-sign-out-alt"
          >
            Desconectar Bot
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default MobileMenu;
