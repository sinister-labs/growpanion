"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Grow, PlantDB } from '@/lib/db';
import { 
  aggregateGrowEvents, 
  filterEventsByType, 
  getEventStats, 
  DiaryEventType 
} from '@/lib/diary-utils';
import DiaryTimeline from './DiaryTimeline';
import DiaryFilters from './DiaryFilters';
import DiaryPdfExport from './DiaryPdfExport';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen } from 'lucide-react';

interface GrowDiaryProps {
  grow: Grow;
  plants: PlantDB[];
}

const GrowDiary: React.FC<GrowDiaryProps> = ({ grow, plants }) => {
  const [activeFilters, setActiveFilters] = useState<DiaryEventType[]>([]);

  // Aggregate all events from grow and plants
  const allEvents = useMemo(() => {
    return aggregateGrowEvents(grow, plants);
  }, [grow, plants]);

  // Get event counts for filter badges
  const eventCounts = useMemo(() => {
    return getEventStats(allEvents);
  }, [allEvents]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    return filterEventsByType(allEvents, activeFilters);
  }, [allEvents, activeFilters]);

  // Calculate summary stats
  const totalDays = useMemo(() => {
    const start = new Date(grow.startDate);
    const now = new Date();
    return Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [grow.startDate]);

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <BookOpen className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-lg text-white">Grow Diary</CardTitle>
              <p className="text-sm text-gray-400">
                {allEvents.length} events over {totalDays} days
              </p>
            </div>
          </div>
          <DiaryPdfExport grow={grow} events={filteredEvents} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(eventCounts).map(([type, count]) => (
            <div 
              key={type} 
              className="bg-gray-900/50 rounded-lg p-3 text-center"
            >
              <div className="text-2xl font-bold text-white">{count}</div>
              <div className="text-xs text-gray-400 capitalize">{type}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <DiaryFilters
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
          eventCounts={eventCounts}
        />

        {/* Timeline */}
        <div className="border-t border-gray-700 pt-6">
          {allEvents.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                No diary entries yet
              </h3>
              <p className="text-gray-500 text-sm">
                Start adding waterings, training, and other activities to see them here.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <DiaryTimeline events={filteredEvents} />
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

GrowDiary.displayName = 'GrowDiary';

export default GrowDiary;
