import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false
}) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <label className={`flex items-center cursor-pointer ${disabled ? 'opacity-50' : ''}`}>
      <div className="relative">
        <input 
          type="checkbox" 
          className="toggle-checkbox sr-only" 
          checked={checked} 
          onChange={handleClick}
          disabled={disabled}
        />
        <div className="toggle-label block w-10 h-5 rounded-full bg-discord-bg-tertiary transition"></div>
        <div className="toggle-checkbox absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition"></div>
      </div>
      {label && (
        <div className="ml-2">
          <span className="text-sm">{label}</span>
          {description && <p className="text-xs text-discord-text-secondary mt-1">{description}</p>}
        </div>
      )}
    </label>
  );
};

export default ToggleSwitch;
