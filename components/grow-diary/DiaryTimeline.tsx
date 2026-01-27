"use client";

import React from 'react';
import { DiaryEvent, getEventTypeColor, groupEventsByDate } from '@/lib/diary-utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface DiaryTimelineProps {
  events: DiaryEvent[];
}

const DiaryTimeline: React.FC<DiaryTimelineProps> = ({ events }) => {
  const groupedEvents = groupEventsByDate(events);
  const sortedDates = Array.from(groupedEvents.keys()).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No events to display.</p>
        <p className="text-gray-500 text-sm mt-2">
          Try adjusting your filters or add some activities to your grow.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />

      {sortedDates.map((dateKey) => {
        const dayEvents = groupedEvents.get(dateKey) || [];
        const formattedDate = new Date(dateKey).toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });

        return (
          <div key={dateKey} className="relative mb-6">
            {/* Date header */}
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center z-10">
                <span className="text-xs font-bold text-gray-300">
                  {new Date(dateKey).getDate()}
                </span>
              </div>
              <span className="ml-4 text-sm font-medium text-gray-300">
                {formattedDate}
              </span>
            </div>

            {/* Events for this date */}
            <div className="ml-12 space-y-3">
              {dayEvents.map((event) => (
                <Card
                  key={event.id}
                  className={`
                    bg-gray-800/50 border-l-4 p-4
                    ${getEventTypeColor(event.type).split(' ')[2]}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{event.icon}</span>
                      <div>
                        <h4 className="font-medium text-white">{event.title}</h4>
                        {event.plantName && (
                          <Badge className="text-xs mt-1 bg-green-600/20 text-green-400 border-green-600">
                            {event.plantName}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(event.date).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-400 mt-2">{event.description}</p>

                  {/* Additional details */}
                  {event.details && Object.keys(event.details).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700 flex flex-wrap gap-2">
                      {Object.entries(event.details).map(([key, value]) => {
                        if (!value || key === 'notes') return null;
                        return (
                          <span
                            key={key}
                            className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded"
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
