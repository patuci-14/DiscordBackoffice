import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import ToggleSwitch from '@/components/ui/toggle-switch';
import { Plugin } from '@shared/schema';
import AnimatedCard from '@/components/ui/animated-card';
import { motion } from 'framer-motion';

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
    <AnimatedCard 
      className="p-4 border border-gray-700 hover:border-discord-blurple transition-colors"
      hoverEffect="scale"
    >
      <div className="flex justify-between">
        <div className="flex items-center">
          <motion.div 
            className="h-10 w-10 rounded-lg bg-discord-bg-tertiary overflow-hidden mr-3 flex items-center justify-center"
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <i className={getPluginIcon()}></i>
          </motion.div>
          <div>
            <motion.h4 
              className="font-medium"
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {plugin.name}
            </motion.h4>
            <motion.p 
              className="text-xs text-discord-text-secondary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              {plugin.version}
            </motion.p>
          </div>
        </div>
        <motion.div
          whileTap={{ scale: 0.95 }}
        >
          <ToggleSwitch 
            checked={Boolean(plugin.enabled)} 
            onChange={onToggle} 
          />
        </motion.div>
      </div>
      
      <motion.p 
        className="text-sm text-discord-text-secondary mt-3"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        {plugin.description || 'Sem descrição disponível.'}
      </motion.p>
      
      <div className="mt-4 flex justify-between items-center">
        <span className="text-xs text-discord-text-secondary">
          Por: {plugin.author || 'Desconhecido'}
        </span>
        <div className="flex space-x-2">
          {onSettings && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="link"
                onClick={onSettings}
                className="text-xs text-discord-text-secondary hover:text-white"
              >
                Configurações
              </Button>
            </motion.div>
          )}
          {onUninstall && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="link"
                onClick={onUninstall}
                className="text-xs text-discord-text-secondary hover:text-discord-red"
              >
                Desinstalar
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </AnimatedCard>
  );
};

export default PluginCard;
