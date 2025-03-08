import React from 'react';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Filter, 
  Fan, 
  Sun,
  LucideIcon, 
  HelpCircle
} from 'lucide-react';

type IconType = 'temperature' | 'humidity' | 'vpd' | 'filter' | 'fan' | 'light' | string;

const iconMap: Record<IconType, LucideIcon> = {
  temperature: Thermometer,
  humidity: Droplets,
  vpd: Wind,
  filter: Filter,
  fan: Fan,
  light: Sun,
};

interface EnvironmentIconProps {
  icon: IconType;
  size?: number;
  className?: string;
}

export function EnvironmentIcon({ icon, size = 24, className = '' }: EnvironmentIconProps) {
  const IconComponent = iconMap[icon] || Sun;

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-green-400 rounded-full opacity-20 blur-sm"></div>
      <IconComponent className="relative z-10" size={size} />
    </div>
  );
}

