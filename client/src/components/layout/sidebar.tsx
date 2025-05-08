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

  return (
    <aside className="w-64 bg-discord-bg-secondary flex-shrink-0 hidden md:flex md:flex-col h-screen fixed">
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
          <li>
            <Link href="/dashboard">
              <a className={`block w-full flex items-center px-4 py-2 ${
                location === '/dashboard' 
                  ? 'bg-discord-bg-primary text-white' 
                  : 'text-discord-text-secondary hover:bg-discord-bg-primary hover:text-white'
              } transition duration-150`}>
                <i className="fas fa-tachometer-alt w-5 mr-3"></i> Dashboard
              </a>
            </Link>
          </li>
          <li>
            <Link href="/config">
              <a className={`block w-full flex items-center px-4 py-2 ${
                location === '/config' 
                  ? 'bg-discord-bg-primary text-white' 
                  : 'text-discord-text-secondary hover:bg-discord-bg-primary hover:text-white'
              } transition duration-150`}>
                <i className="fas fa-cogs w-5 mr-3"></i> Configuration
              </a>
            </Link>
          </li>
          <li>
            <Link href="/commands">
              <a className={`block w-full flex items-center px-4 py-2 ${
                location === '/commands' 
                  ? 'bg-discord-bg-primary text-white' 
                  : 'text-discord-text-secondary hover:bg-discord-bg-primary hover:text-white'
              } transition duration-150`}>
                <i className="fas fa-terminal w-5 mr-3"></i> Commands
              </a>
            </Link>
          </li>
          <li>
            <Link href="/logs">
              <a className={`block w-full flex items-center px-4 py-2 ${
                location === '/logs' 
                  ? 'bg-discord-bg-primary text-white' 
                  : 'text-discord-text-secondary hover:bg-discord-bg-primary hover:text-white'
              } transition duration-150`}>
                <i className="fas fa-list w-5 mr-3"></i> Logs
              </a>
            </Link>
          </li>
          <li>
            <Link href="/plugins">
              <a className={`block w-full flex items-center px-4 py-2 ${
                location === '/plugins' 
                  ? 'bg-discord-bg-primary text-white' 
                  : 'text-discord-text-secondary hover:bg-discord-bg-primary hover:text-white'
              } transition duration-150`}>
                <i className="fas fa-puzzle-piece w-5 mr-3"></i> Plugins
              </a>
            </Link>
          </li>
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
