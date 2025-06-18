import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: 'lift' | 'glow' | 'scale' | 'border' | 'none';
  clickEffect?: boolean;
  onClick?: () => void;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = '',
  hoverEffect = 'lift',
  clickEffect = false,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Efeitos de hover mais sutis
  const hoverStyles = {
    lift: {
      y: isHovered ? -3 : 0,
      boxShadow: isHovered 
        ? '0 8px 15px -5px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.08)' 
        : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    },
    glow: {
      boxShadow: isHovered 
        ? '0 0 10px 1px rgba(114, 137, 218, 0.3)' 
        : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    },
    scale: {
      scale: isHovered ? 1.01 : 1,
    },
    border: {
      boxShadow: isHovered 
        ? 'inset 0 0 0 1px rgba(114, 137, 218, 0.6)' 
        : 'none',
    },
    none: {},
  };

  // Efeito de clique mais sutil
  const clickVariants = {
    tap: { scale: 0.99 },
  };

  return (
    <motion.div
      className={cn(
        'bg-discord-bg-secondary rounded-lg overflow-hidden transition-all',
        className
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      whileTap={clickEffect ? clickVariants.tap : undefined}
      style={hoverStyles[hoverEffect]}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard; 