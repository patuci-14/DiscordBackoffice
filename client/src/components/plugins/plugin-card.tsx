import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import ToggleSwitch from '@/components/ui/toggle-switch';
import { Plugin } from '@shared/schema';

interface PluginCardProps {
  plugin: Plugin;
  onToggle: (enabled: boolean) => void;
  onSettings?: () => void;
  onUninstall?: () => void;
}

const PluginCard: React.FC<PluginCardProps> = ({ 
  plugin, 
  onToggle,
  onSettings,
  onUninstall 
}) => {
  // Determine the plugin icon based on the name
  const getPluginIcon = () => {
    const name = plugin.name.toLowerCase();
    if (name.includes('music')) return 'fas fa-music text-discord-blurple';
    if (name.includes('level')) return 'fas fa-chart-bar text-discord-green';
    if (name.includes('mod')) return 'fas fa-shield-alt text-discord-yellow';
    if (name.includes('event')) return 'fas fa-calendar-alt text-discord-blurple';
    if (name.includes('ticket')) return 'fas fa-ticket-alt text-discord-green';
    if (name.includes('game')) return 'fas fa-gamepad text-discord-yellow';
    if (name.includes('poll')) return 'fas fa-poll text-discord-blurple';
    
    // Default icon
    return 'fas fa-puzzle-piece text-discord-blurple';
  };

  return (
    <div className="border border-gray-700 rounded-lg p-4 hover:border-discord-blurple transition-colors">
      <div className="flex justify-between">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-lg bg-discord-bg-tertiary overflow-hidden mr-3 flex items-center justify-center">
            <i className={getPluginIcon()}></i>
          </div>
          <div>
            <h4 className="font-medium">{plugin.name}</h4>
            <p className="text-xs text-discord-text-secondary">{plugin.version}</p>
          </div>
        </div>
        <div>
          <ToggleSwitch 
            checked={plugin.enabled} 
            onChange={onToggle} 
          />
        </div>
      </div>
      
      <p className="text-sm text-discord-text-secondary mt-3">
        {plugin.description || 'No description available.'}
      </p>
      
      <div className="mt-4 flex justify-between items-center">
        <span className="text-xs text-discord-text-secondary">
          By: {plugin.author || 'Unknown'}
        </span>
        <div className="flex space-x-2">
          {onSettings && (
            <Button 
              variant="link"
              onClick={onSettings}
              className="text-xs text-discord-text-secondary hover:text-white"
            >
              Settings
            </Button>
          )}
          {onUninstall && (
            <Button 
              variant="link"
              onClick={onUninstall}
              className="text-xs text-discord-text-secondary hover:text-discord-red"
            >
              Uninstall
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PluginCard;
