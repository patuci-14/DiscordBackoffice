import { Link, useLocation } from 'wouter';
import { useAuth } from '@/components/auth/auth-provider';

interface MobileMenuProps {
  onClose: () => void;
  botName?: string;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ onClose, botName = 'Discord Bot' }) => {
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

  return (
    <div className="fixed inset-0 bg-discord-bg-tertiary z-40 md:hidden p-4 pt-16">
      <nav className="py-4">
        <ul className="space-y-2">
          <li>
            <Link href="/dashboard">
              <a 
                onClick={handleNavigation}
                className={`block w-full flex items-center px-4 py-3 rounded-md ${
                  location === '/dashboard' 
                    ? 'bg-discord-bg-primary text-white' 
                    : 'text-discord-text-secondary hover:bg-discord-bg-primary hover:text-white'
                } transition duration-150`}
              >
                <i className="fas fa-tachometer-alt w-5 mr-3"></i> Dashboard
              </a>
            </Link>
          </li>
          <li>
            <Link href="/config">
              <a 
                onClick={handleNavigation}
                className={`block w-full flex items-center px-4 py-3 rounded-md ${
                  location === '/config' 
                    ? 'bg-discord-bg-primary text-white' 
                    : 'text-discord-text-secondary hover:bg-discord-bg-primary hover:text-white'
                } transition duration-150`}
              >
                <i className="fas fa-cogs w-5 mr-3"></i> Configuration
              </a>
            </Link>
          </li>
          <li>
            <Link href="/commands">
              <a 
                onClick={handleNavigation}
                className={`block w-full flex items-center px-4 py-3 rounded-md ${
                  location === '/commands' 
                    ? 'bg-discord-bg-primary text-white' 
                    : 'text-discord-text-secondary hover:bg-discord-bg-primary hover:text-white'
                } transition duration-150`}
              >
                <i className="fas fa-terminal w-5 mr-3"></i> Commands
              </a>
            </Link>
          </li>
          <li>
            <Link href="/logs">
              <a 
                onClick={handleNavigation}
                className={`block w-full flex items-center px-4 py-3 rounded-md ${
                  location === '/logs' 
                    ? 'bg-discord-bg-primary text-white' 
                    : 'text-discord-text-secondary hover:bg-discord-bg-primary hover:text-white'
                } transition duration-150`}
              >
                <i className="fas fa-list w-5 mr-3"></i> Logs
              </a>
            </Link>
          </li>
          <li>
            <Link href="/plugins">
              <a 
                onClick={handleNavigation}
                className={`block w-full flex items-center px-4 py-3 rounded-md ${
                  location === '/plugins' 
                    ? 'bg-discord-bg-primary text-white' 
                    : 'text-discord-text-secondary hover:bg-discord-bg-primary hover:text-white'
                } transition duration-150`}
              >
                <i className="fas fa-puzzle-piece w-5 mr-3"></i> Plugins
              </a>
            </Link>
          </li>
        </ul>
      </nav>
      
      <div className="mt-8">
        <div className="p-4 border border-gray-700 rounded-md mb-4">
          <div className="flex items-center">
            <span className="h-3 w-3 bg-discord-green rounded-full mr-2"></span>
            <span className="text-sm">{botName}</span>
          </div>
          <p className="text-xs text-discord-text-secondary mt-1">Online</p>
        </div>
        
        <button 
          onClick={handleLogout}
          className="w-full px-4 py-3 text-sm text-discord-text-secondary hover:text-white bg-discord-bg-tertiary border border-gray-700 rounded-md flex items-center justify-center"
        >
          <i className="fas fa-sign-out-alt mr-2"></i> Disconnect Bot
        </button>
      </div>
    </div>
  );
};

export default MobileMenu;
