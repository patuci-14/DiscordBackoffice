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
          className="sr-only"
          checked={checked} 
          onChange={handleClick}
          disabled={disabled}
        />
        <div
          className={`block w-10 h-5 rounded-full transition-colors duration-300 ${
            checked ? 'bg-green-500' : 'bg-discord-bg-tertiary'
          }`}
        ></div>
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        ></div>
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
