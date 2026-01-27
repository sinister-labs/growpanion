"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { DiaryEventType, getEventTypeLabel, getEventTypeColor } from '@/lib/diary-utils';
import { Droplets, Scissors, Anchor, Leaf, Layers } from 'lucide-react';

interface DiaryFiltersProps {
  activeFilters: DiaryEventType[];
  onFilterChange: (filters: DiaryEventType[]) => void;
  eventCounts: Record<DiaryEventType, number>;
}

const EVENT_TYPE_ICONS: Record<DiaryEventType, React.ElementType> = {
  phase: Leaf,
  watering: Droplets,
  hst: Scissors,
  lst: Anchor,
  substrate: Layers,
};

const DiaryFilters: React.FC<DiaryFiltersProps> = ({
  activeFilters,
  onFilterChange,
  eventCounts,
}) => {
  const eventTypes: DiaryEventType[] = ['phase', 'watering', 'hst', 'lst', 'substrate'];

  const toggleFilter = (type: DiaryEventType) => {
    if (activeFilters.includes(type)) {
      onFilterChange(activeFilters.filter(f => f !== type));
    } else {
      onFilterChange([...activeFilters, type]);
    }
  };

  const clearFilters = () => {
    onFilterChange([]);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-gray-400 mr-2">Filter:</span>
      
      {eventTypes.map(type => {
        const Icon = EVENT_TYPE_ICONS[type];
        const isActive = activeFilters.includes(type);
        const count = eventCounts[type] || 0;
        
        return (
          <Button
            key={type}
            variant="outline"
            size="sm"
            onClick={() => toggleFilter(type)}
            className={`
              rounded-full text-xs flex items-center gap-1.5 transition-all
              ${isActive 
                ? getEventTypeColor(type) + ' border' 
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'}
            `}
          >
            <Icon className="h-3 w-3" />
            <span>{getEventTypeLabel(type)}</span>
            <span className="bg-gray-700 px-1.5 rounded-full text-[10px]">
              {count}
            </span>
          </Button>
        );
      })}

      {activeFilters.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-gray-400 hover:text-white text-xs"
        >
          Clear all
        </Button>
      )}
    </div>
  );
};

DiaryFilters.displayName = 'DiaryFilters';

export default DiaryFilters;
