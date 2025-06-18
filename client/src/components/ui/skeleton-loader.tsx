import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangle' | 'circle' | 'text' | 'card' | 'avatar';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangle',
  width,
  height,
  animate = true,
}) => {
  // Variantes básicas
  const baseClasses = 'bg-discord-bg-tertiary/60 animate-pulse';
  
  // Classes específicas para cada variante
  const variantClasses = {
    rectangle: 'rounded',
    circle: 'rounded-full',
    text: 'h-4 rounded',
    card: 'rounded-lg',
    avatar: 'rounded-full',
  };
  
  // Dimensões padrão para cada variante
  const defaultDimensions = {
    rectangle: { width: '100%', height: '8px' },
    circle: { width: '40px', height: '40px' },
    text: { width: '100%', height: '16px' },
    card: { width: '100%', height: '100px' },
    avatar: { width: '40px', height: '40px' },
  };
  
  // Animação de brilho
  const shimmer = {
    initial: { backgroundPosition: '-500px 0' },
    animate: { backgroundPosition: '500px 0' },
    transition: { repeat: Infinity, duration: 1.5, ease: 'linear' },
  };

  return (
    <motion.div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animate ? 'bg-gradient-to-r from-discord-bg-tertiary/60 via-discord-bg-secondary/60 to-discord-bg-tertiary/60 bg-[length:500px_100%]' : '',
        className
      )}
      style={{
        width: width || defaultDimensions[variant].width,
        height: height || defaultDimensions[variant].height,
      }}
      {...(animate ? shimmer : {})}
    />
  );
};

// Componente para criar um layout de card de carregamento
export const CardSkeleton = () => {
  return (
    <div className="p-4 border border-discord-bg-tertiary rounded-lg">
      <div className="flex items-center mb-4">
        <Skeleton variant="avatar" width={40} height={40} />
        <div className="ml-3 space-y-2 flex-1">
          <Skeleton variant="text" width="60%" height={16} />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" width="100%" height={12} />
        <Skeleton variant="text" width="90%" height={12} />
        <Skeleton variant="text" width="80%" height={12} />
      </div>
      <div className="mt-4 flex justify-end">
        <Skeleton variant="rectangle" width={80} height={30} className="rounded-md" />
      </div>
    </div>
  );
};

// Componente para criar um layout de tabela de carregamento
export const TableRowSkeleton = ({ columns = 4 }: { columns?: number }) => {
  return (
    <div className="flex w-full items-center py-3 border-b border-discord-bg-tertiary">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="px-2" style={{ width: `${100 / columns}%` }}>
          <Skeleton variant="text" width="80%" height={16} />
        </div>
      ))}
    </div>
  );
};

// Componente para criar um layout de lista de carregamento
export const ListSkeleton = ({ rows = 5 }: { rows?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center">
          <Skeleton variant="circle" width={32} height={32} />
          <div className="ml-3 flex-1">
            <Skeleton variant="text" width="70%" height={16} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Skeleton; 