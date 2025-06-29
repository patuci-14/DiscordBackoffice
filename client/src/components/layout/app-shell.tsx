import React, { ReactNode, useState, useMemo } from 'react';
import Sidebar from './sidebar';
import MobileMenu from './mobile-menu';
import { useAuth } from '@/components/auth/auth-provider';
import { motion } from 'framer-motion';
import PageTransition from '@/components/ui/page-transition';

interface AppShellProps {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
}

// Memoizar o componente AppShell para evitar re-renderizações desnecessárias
const AppShell: React.FC<AppShellProps> = React.memo(({ children, title, actions }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, botInfo } = useAuth();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Usar ID estático para o layout
  const layoutId = useMemo(() => "app-shell-layout", []);

  if (!isAuthenticated) {
    return null; // Don't render if not authenticated
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (hidden on mobile) */}
      <div className="hidden md:block md:w-64 md:flex-shrink-0 md:fixed md:h-screen">
        <Sidebar botName={botInfo?.name} />
      </div>
      
      {/* Mobile Navigation Bar */}
      <motion.div 
        className="md:hidden w-full bg-discord-bg-secondary p-4 flex justify-between items-center border-b border-gray-700 fixed top-0 z-50"
        layoutId="mobile-nav"
      >
        <div className="flex items-center">
          <i className="fab fa-discord text-discord-blurple text-xl mr-2"></i>
          <h1 className="font-bold">Bot Backoffice</h1>
        </div>
        <motion.button 
          onClick={toggleMobileMenu} 
          className="text-discord-text-primary p-2"
          whileTap={{ scale: 0.9 }}
        >
          <i className="fas fa-bars"></i>
        </motion.button>
      </motion.div>
      
      {/* Mobile Menu (shows when toggled) */}
      {mobileMenuOpen && (
        <MobileMenu onClose={toggleMobileMenu} botName={botInfo?.name} />
      )}
      
      {/* Main Content */}
      <motion.main 
        className="flex-1 bg-discord-bg-primary overflow-auto w-full md:ml-64 pt-16 md:pt-0"
        layoutId={layoutId}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        <div className="p-4 md:p-6">
          <motion.div 
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6"
            layout
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <motion.h1 
              className="text-2xl font-bold mb-3 md:mb-0"
              layout
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {title}
            </motion.h1>
            {actions && (
              <motion.div 
                className="w-full md:w-auto"
                layout
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                {actions}
              </motion.div>
            )}
          </motion.div>
          
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </motion.main>
    </div>
  );
});

export default AppShell;
