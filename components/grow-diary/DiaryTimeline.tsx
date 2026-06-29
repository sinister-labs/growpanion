"use client";

import React from 'react';
import {
  DiaryEvent,
  formatDiaryDate,
  formatDiaryTime,
  getEventTypeColor,
  groupEventsByDate
} from '@/lib/diary-utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface DiaryTimelineProps {
  events: DiaryEvent[];
  zoomLevel?: 'compact' | 'comfortable' | 'detailed';
  onEventSelect?: (event: DiaryEvent) => void;
}

const DiaryTimeline: React.FC<DiaryTimelineProps> = ({ events, zoomLevel = 'comfortable', onEventSelect }) => {
  const groupedEvents = groupEventsByDate(events);
  const sortedDates = Array.from(groupedEvents.keys()).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );
  const isCompact = zoomLevel === 'compact';
  const isDetailed = zoomLevel === 'detailed';

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No events to display.</p>
        <p className="text-muted-foreground text-sm mt-2">
          Try adjusting your filters or add some activities to your grow.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

      {sortedDates.map((dateKey) => {
        const dayEvents = groupedEvents.get(dateKey) || [];
        const formattedDate = formatDiaryDate(dateKey, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });

        return (
          <div key={dateKey} className={`relative ${isCompact ? 'mb-3' : 'mb-6'}`}>
            {/* Date header */}
            <div className={`flex items-center ${isCompact ? 'mb-2' : 'mb-3'}`}>
              <div className={`${isCompact ? 'h-6 w-6' : 'h-8 w-8'} z-10 flex items-center justify-center rounded-full border-2 border-border bg-card`}>
                <span className="text-xs font-bold text-foreground">
                  {new Date(dateKey).getDate()}
                </span>
              </div>
              <span className="ml-4 text-sm font-medium text-foreground">
                {formattedDate}
              </span>
            </div>

            {/* Events for this date */}
            <div className={`${isCompact ? 'ml-9 space-y-2' : 'ml-12 space-y-3'}`}>
              {dayEvents.map((event) => (
                <Card
                  key={event.id}
                  role={onEventSelect ? 'button' : undefined}
                  tabIndex={onEventSelect ? 0 : undefined}
                  onClick={() => onEventSelect?.(event)}
                  onKeyDown={(keyboardEvent) => {
                    if (!onEventSelect) return;
                    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                      keyboardEvent.preventDefault();
                      onEventSelect(event);
                    }
                  }}
                  className={`
                    bg-card/85 border-l-4 text-left ${isCompact ? 'p-3' : 'p-4'}
                    ${onEventSelect ? 'cursor-pointer hover:bg-emerald-300/10 focus:outline-none focus:ring-2 focus:ring-ring/50' : ''}
                    ${getEventTypeColor(event.type).split(' ')[2]}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{event.icon}</span>
                      <div>
                        <h4 className="font-medium text-foreground">{event.title}</h4>
                        {event.plantName && (
                          <Badge className="text-xs mt-1 bg-primary/10 text-primary border-primary/35">
                            {event.plantName}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDiaryTime(event.date)}
                    </span>
                  </div>
                  
                  {!isCompact && <p className="text-sm text-muted-foreground mt-2">{event.description}</p>}

                  {isDetailed && event.mediaUris && event.mediaUris.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {event.mediaUris.map(uri => (
                        // eslint-disable-next-line @next/next/no-img-element -- Diary media can be data URLs or user-provided local references.
                        <img
                          key={uri}
                          src={uri}
                          alt={event.title}
                          className="max-h-48 w-full rounded-2xl border border-white/10 object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {/* Additional details */}
                  {isDetailed && event.details && Object.keys(event.details).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                      {Object.entries(event.details).map(([key, value]) => {
                        if ((value === undefined || value === '') || key === 'notes') return null;
                        return (
                          <span
                            key={key}
                            className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-xs text-slate-300"
                          >
                            {key}: {value}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

DiaryTimeline.displayName = 'DiaryTimeline';

export default DiaryTimeline;
