import { Link, useLocation } from 'wouter';
import { useAuth } from '@/components/auth/auth-provider';

interface SidebarProps {
  botName?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ botName = 'Discord Bot' }) => {
  const [location] = useLocation();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  // We need to fix the nested <a> tags issue with wouter
  const NavItem = ({ to, icon, label }: { to: string; icon: string; label: string }) => {
    const isActive = location === to;
    
    return (
      <li>
        <Link href={to}>
          <div className={`cursor-pointer block w-full flex items-center px-4 py-2 ${
            isActive 
              ? 'bg-discord-bg-primary text-white' 
              : 'text-discord-text-secondary hover:bg-discord-bg-primary hover:text-white'
          } transition duration-150`}>
            <i className={`${icon} w-5 mr-3`}></i> {label}
          </div>
        </Link>
      </li>
    );
  };

  return (
    <aside className="w-64 bg-discord-bg-secondary flex-shrink-0 h-screen overflow-y-auto">
      <div className="flex items-center p-4 border-b border-gray-700">
        <i className="fab fa-discord text-discord-blurple text-2xl mr-3"></i>
        <h1 className="font-bold text-lg">Bot Backoffice</h1>
      </div>
      
      {/* Bot Status Indicator */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center">
          <span className="h-3 w-3 bg-discord-green rounded-full mr-2"></span>
          <span className="text-sm">{botName}</span>
        </div>
        <p className="text-xs text-discord-text-secondary mt-1">Online</p>
      </div>
      
      {/* Navigation Menu */}
      <nav className="py-4 flex-1 overflow-y-auto">
        <ul>
          <NavItem to="/dashboard" icon="fas fa-tachometer-alt" label="Dashboard" />
          <NavItem to="/config" icon="fas fa-cogs" label="Configuration" />
          <NavItem to="/commands" icon="fas fa-terminal" label="Commands" />
          <NavItem to="/logs" icon="fas fa-list" label="Logs" />
        </ul>
      </nav>
      
      {/* Bottom Actions */}
      <div className="border-t border-gray-700 p-4">
        <button 
          onClick={handleLogout}
          className="w-full px-4 py-2 text-sm text-discord-text-secondary hover:text-white bg-discord-bg-tertiary rounded-md flex items-center justify-center"
        >
          <i className="fas fa-sign-out-alt mr-2"></i> Disconnect Bot
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
