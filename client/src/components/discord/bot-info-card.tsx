import React from 'react';
import { BotConfig } from '@shared/schema';
import { Button } from '@/components/ui/button';

interface BotInfoCardProps {
  config: BotConfig;
  onEditClick?: () => void;
}

const BotInfoCard: React.FC<BotInfoCardProps> = ({ config, onEditClick }) => {
  return (
    <div className="bg-discord-bg-secondary rounded-lg p-4 shadow mb-6">
      <div className="flex items-center mb-4">
        <div className="h-16 w-16 rounded-full bg-discord-bg-tertiary overflow-hidden mr-4">
          {config.avatarUrl ? (
            <img 
              src={config.avatarUrl} 
              alt="Bot avatar" 
              className="h-full w-full object-cover" 
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-discord-bg-tertiary text-discord-blurple">
              <i className="fas fa-robot text-2xl"></i>
            </div>
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold">{config.name || 'Discord Bot'}</h2>
          <p className="text-discord-text-secondary text-sm">ID: {config.botId || 'Unknown'}</p>
          <div className="flex items-center mt-1">
            <span className="h-2 w-2 rounded-full bg-discord-green mr-1"></span>
            <span className="text-xs text-discord-green">{config.status || 'Online'}</span>
          </div>
        </div>
        {onEditClick && (
          <Button 
            variant="outline"
            onClick={onEditClick} 
            className="ml-auto bg-discord-bg-tertiary hover:bg-opacity-80 text-sm"
          >
            <i className="fas fa-pen text-xs mr-1"></i> Edit
          </Button>
        )}
      </div>
      
      <div className="border-t border-gray-700 pt-4 mt-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-discord-text-secondary text-sm mb-1">Prefix</p>
            <p className="font-medium">{config.prefix || '!'}</p>
          </div>
          <div>
            <p className="text-discord-text-secondary text-sm mb-1">Status</p>
            <p className="font-medium capitalize">{config.status || 'Online'}</p>
          </div>
          <div>
            <p className="text-discord-text-secondary text-sm mb-1">Activity</p>
            <p className="font-medium">
              {config.activityType && config.activity 
                ? `${config.activityType.toLowerCase()} ${config.activity}` 
                : 'None'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotInfoCard;
