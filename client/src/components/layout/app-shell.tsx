import React, { ReactNode, useState } from 'react';
import Sidebar from './sidebar';
import MobileMenu from './mobile-menu';
import { useAuth } from '@/components/auth/auth-provider';

interface AppShellProps {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children, title, actions }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, botInfo } = useAuth();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

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
      <div className="md:hidden w-full bg-discord-bg-secondary p-4 flex justify-between items-center border-b border-gray-700 fixed top-0 z-50">
        <div className="flex items-center">
          <i className="fab fa-discord text-discord-blurple text-xl mr-2"></i>
          <h1 className="font-bold">Bot Backoffice</h1>
        </div>
        <button onClick={toggleMobileMenu} className="text-discord-text-primary">
          <i className="fas fa-bars"></i>
        </button>
      </div>
      
      {/* Mobile Menu (shows when toggled) */}
      {mobileMenuOpen && (
        <MobileMenu onClose={toggleMobileMenu} botName={botInfo?.name} />
      )}
      
      {/* Main Content */}
      <main className="flex-1 bg-discord-bg-primary overflow-auto w-full md:ml-64 pt-16 md:pt-0">
        <div className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h1 className="text-2xl font-bold mb-3 md:mb-0">{title}</h1>
            {actions && <div className="w-full md:w-auto">{actions}</div>}
          </div>
          
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppShell;
