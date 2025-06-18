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

  // Efeitos de hover
  const hoverStyles = {
    lift: {
      y: isHovered ? -5 : 0,
      boxShadow: isHovered 
        ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' 
        : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    },
    glow: {
      boxShadow: isHovered 
        ? '0 0 15px 2px rgba(114, 137, 218, 0.5)' 
        : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    },
    scale: {
      scale: isHovered ? 1.03 : 1,
    },
    border: {
      boxShadow: isHovered 
        ? 'inset 0 0 0 2px rgba(114, 137, 218, 0.8)' 
        : 'none',
    },
    none: {},
  };

  // Efeito de clique
  const clickVariants = {
    tap: { scale: 0.98 },
  };

  return (
    <motion.div
      className={cn(
        'bg-discord-bg-secondary rounded-lg overflow-hidden transition-all duration-300',
        className
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      whileTap={clickEffect ? clickVariants.tap : undefined}
      style={hoverStyles[hoverEffect]}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard; 