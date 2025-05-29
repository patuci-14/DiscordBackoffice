import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconColor: string;
  iconSize?: string;
  subtitle?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  iconColor,
  iconSize,
  subtitle
}) => {
  return (
    <div className="bg-discord-bg-secondary rounded-lg p-4 shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-discord-text-secondary text-sm">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
        </div>
        <div className={'bg-opacity-20 p-2 rounded-lg'}>
          <i className={`${icon} ${iconColor} ${iconSize}`}></i>
        </div>
      </div>
      {subtitle && <p className="text-xs text-discord-text-secondary mt-2">{subtitle}</p>}
    </div>
  );
};

export default StatsCard;
