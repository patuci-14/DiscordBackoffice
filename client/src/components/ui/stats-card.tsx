import React from 'react';
import AnimatedCard from './animated-card';
import { motion } from 'framer-motion';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconColor: string;
  iconSize?: string;
  subtitle?: string;
  hoverEffect?: 'lift' | 'glow' | 'scale' | 'border' | 'none';
  onClick?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  iconColor,
  iconSize = 'text-2xl',
  subtitle,
  hoverEffect = 'glow',
  onClick
}) => {
  return (
    <AnimatedCard 
      className="p-4" 
      hoverEffect={hoverEffect}
      clickEffect={!!onClick}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-discord-text-secondary text-sm font-medium">{title}</p>
          <motion.h3 
            className="text-2xl font-bold"
            initial={{ opacity: 0.7, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.2 }}
          >
            {value}
          </motion.h3>
        </div>
        <motion.div 
          className={`bg-opacity-20 p-2 rounded-lg ${iconColor.includes('text-') ? iconColor.replace('text-', 'bg-') + '/10' : ''}`}
          whileHover={{ rotate: [0, -5, 5, -5, 0], transition: { duration: 0.4 } }}
        >
          <i className={`${icon} ${iconColor} ${iconSize}`}></i>
        </motion.div>
      </div>
      {subtitle && (
        <motion.p 
          className="text-xs text-discord-text-secondary mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 0.1, duration: 0.2 }}
        >
          {subtitle}
        </motion.p>
      )}
    </AnimatedCard>
  );
};

export default StatsCard;
