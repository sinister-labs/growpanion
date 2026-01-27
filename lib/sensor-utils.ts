/**
 * Utility functions for sensor data formatting and display
 */
import {
  ThermometerSun,
  Droplets,
  Lightbulb,
  Fan,
  Filter,
  Gauge,
  ToggleLeft
} from 'lucide-react';
import { TuyaSensor } from '@/lib/db';
import React from 'react';

/**
 * Icon size options
 */
export type IconSize = 'sm' | 'lg';

/**
 * Gets the appropriate icon for a sensor type or property name
 * @param type Sensor type
 * @param size Icon size
 * @param valueName Optional property name for fallback
 * @returns React element with appropriate icon
 */
export function getSensorIcon(type?: TuyaSensor['type'], size: IconSize = 'sm', valueName?: string) {
  const iconSize = size === 'sm' ? "h-5 w-5" : "h-6 w-6";

  if (type) {
    switch (type) {
      case 'Temperature':
        return React.createElement(ThermometerSun, { className: `${iconSize} text-amber-400` });
      case 'Humidity':
        return React.createElement(Droplets, { className: `${iconSize} text-blue-400` });
      case 'Lamp':
        return React.createElement(Lightbulb, { className: `${iconSize} text-yellow-400` });
      case 'Fan':
        return React.createElement(Fan, { className: `${iconSize} text-sky-400` });
      case 'Carbon Filter':
        return React.createElement(Filter, { className: `${iconSize} text-green-400` });
      case 'Boolean':
        return React.createElement(ToggleLeft, { className: `${iconSize} text-indigo-400` });
      case 'Number':
        return React.createElement(Gauge, { className: `${iconSize} text-purple-400` });
    }
  }

  if (valueName) {
    if (valueName.includes('temp')) {
      return React.createElement(ThermometerSun, { className: `${iconSize} text-amber-400` });
    } else if (valueName.includes('humid')) {
      return React.createElement(Droplets, { className: `${iconSize} text-blue-400` });
    } else if (valueName.includes('lamp') || valueName.includes('light')) {
      return React.createElement(Lightbulb, { className: `${iconSize} text-yellow-400` });
    } else if (valueName.includes('fan')) {
      return React.createElement(Fan, { className: `${iconSize} text-sky-400` });
    } else if (valueName.includes('filter')) {
      return React.createElement(Filter, { className: `${iconSize} text-green-400` });
    }
  }

  return React.createElement(Gauge, { className: `${iconSize} text-purple-400` });
}

/**
 * Formats a sensor property name for display
 * @param valueName Sensor property name
 * @returns Formatted name
 */
export function formatSensorValueName(valueName: string) {
  return valueName
    .replace(/_/g, ' ')
    .replace('current', '')
    .replace('temp', 'Temperature')
    .replace('humidity', 'Humidity')
    .replace('value', '')
    .trim();
}

/**
 * Formats a sensor value for display with optional unit
 * @param value Sensor value (number or string)
 * @param unit Optional unit
 * @returns Formatted value with unit
 */
export function formatSensorValue(value: string | number, unit?: string) {
  if (typeof value === 'number') {
    return value % 1 !== 0 ? `${value.toFixed(1)}${unit || ''}` : `${value}${unit || ''}`;
  }
  return `${value}${unit || ''}`;
}

/**
 * Calculates a user-friendly text for the last update time
 * @param lastUpdated Last update date
 * @returns Formatted time text
 */
export function getLastUpdatedText(lastUpdated?: Date): string {
  if (!lastUpdated) return '';

  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
  return `${Math.floor(diffSec / 3600)} hours ago`;
} 