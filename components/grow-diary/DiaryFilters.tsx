"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { DIARY_EVENT_TYPES, DiaryEventType, getEventTypeLabel, getEventTypeColor } from '@/lib/diary-utils';
import { Droplets, Scissors, Anchor, Leaf, Layers, Scale, Activity, LineChart } from 'lucide-react';

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
  harvest: Scale,
  grow_event: Activity,
  telemetry: LineChart,
};

const DiaryFilters: React.FC<DiaryFiltersProps> = ({
  activeFilters,
  onFilterChange,
  eventCounts,
}) => {
  const eventTypes = DIARY_EVENT_TYPES;

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
      <span className="text-sm text-muted-foreground mr-2">Filter:</span>
      
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
                : 'bg-white/[0.045] text-muted-foreground border-white/10 hover:border-primary/45 hover:text-foreground'}
            `}
          >
            <Icon className="h-3 w-3" />
            <span>{getEventTypeLabel(type)}</span>
            <span className="rounded-full bg-background/70 px-1.5 text-[10px]">
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
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          Clear all
        </Button>
      )}
    </div>
  );
};

DiaryFilters.displayName = 'DiaryFilters';

export default DiaryFilters;
