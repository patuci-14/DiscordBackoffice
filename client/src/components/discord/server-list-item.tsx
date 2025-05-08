import React from 'react';
import { Server } from '@shared/schema';
import ToggleSwitch from '@/components/ui/toggle-switch';

interface ServerListItemProps {
  server: Server;
  onToggle: (enabled: boolean) => void;
  onSettingsClick?: () => void;
}

const ServerListItem: React.FC<ServerListItemProps> = ({ 
  server, 
  onToggle,
  onSettingsClick 
}) => {
  return (
    <div className="py-3 flex items-center justify-between border-b border-gray-700 last:border-0">
      <div className="flex items-center">
        <div className="h-10 w-10 rounded-full bg-discord-bg-tertiary overflow-hidden mr-3">
          {server.iconUrl ? (
            <img 
              src={server.iconUrl} 
              alt={server.name} 
              className="h-full w-full object-cover" 
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-discord-bg-tertiary text-discord-text-secondary">
              <i className="fas fa-server"></i>
            </div>
          )}
        </div>
        <div>
          <h4 className="font-medium">{server.name}</h4>
          <p className="text-xs text-discord-text-secondary">ID: {server.serverId}</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <ToggleSwitch 
          checked={server.enabled} 
          onChange={onToggle} 
        />
        {onSettingsClick && (
          <button 
            onClick={onSettingsClick}
            className="text-discord-text-secondary hover:text-white"
          >
            <i className="fas fa-cog"></i>
          </button>
        )}
      </div>
    </div>
  );
};

export default ServerListItem;
