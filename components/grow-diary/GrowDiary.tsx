"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CustomDropdown } from '@/components/ui/custom-dropdown';
import { getGrowEventsForGrow, getPhenotypesForGrow, getPhotosForGrow, getTelemetryForGrow, Grow, GrowEvent, GrowEventType, Phenotype, Photo, PlantDB, TelemetryReading } from '@/lib/db';
import { 
  aggregateProductTimeline,
  buildTimelineBeforeAfterAnalysis,
  buildSensorTimelineLanes,
  filterEventsByDateRange,
  filterEventsByPhenotype,
  filterEventsByPlant,
  filterEventsByStructuredType,
  filterEventsByType, 
  getEventStats, 
  formatDiaryDate,
  formatDiaryTime,
  getEventTypeLabel,
  DiaryEvent,
  DiaryEventType 
} from '@/lib/diary-utils';
import DiaryTimeline from './DiaryTimeline';
import DiaryFilters from './DiaryFilters';
import DiaryPdfExport from './DiaryPdfExport';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, LineChart } from 'lucide-react';
import { calculateGrowTotalDays } from '@/lib/growth-utils';
import { useTelemetryRefreshToken } from '@/hooks/useTelemetryRefreshToken';

interface GrowDiaryProps {
  grow: Grow;
  plants: PlantDB[];
}

const GrowDiary: React.FC<GrowDiaryProps> = ({ grow, plants }) => {
  const telemetryRefreshToken = useTelemetryRefreshToken();
  const [activeFilters, setActiveFilters] = useState<DiaryEventType[]>([]);
  const [activeStructuredEventTypes, setActiveStructuredEventTypes] = useState<GrowEventType[]>([]);
  const [structuredEvents, setStructuredEvents] = useState<GrowEvent[]>([]);
  const [telemetryReadings, setTelemetryReadings] = useState<TelemetryReading[]>([]);
  const [phenotypes, setPhenotypes] = useState<Phenotype[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [selectedPhenotypeId, setSelectedPhenotypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<DiaryEvent | null>(null);
  const [timelineZoom, setTimelineZoom] = useState<'compact' | 'comfortable' | 'detailed'>('comfortable');
  const [analysisWindowHours, setAnalysisWindowHours] = useState(72);

  useEffect(() => {
    let cancelled = false;

    async function loadTimelineData() {
      try {
        const [events, readings, phenotypeRecords, photoRecords] = await Promise.all([
          getGrowEventsForGrow(grow.id),
          getTelemetryForGrow(grow.id),
          getPhenotypesForGrow(grow.id),
          getPhotosForGrow(grow.id),
        ]);

        if (!cancelled) {
          setStructuredEvents(events);
          setTelemetryReadings(readings);
          setPhenotypes(phenotypeRecords);
          setPhotos(photoRecords);
        }
      } catch {
        if (!cancelled) {
          setStructuredEvents([]);
          setTelemetryReadings([]);
          setPhenotypes([]);
          setPhotos([]);
        }
      }
    }

    loadTimelineData();
    return () => {
      cancelled = true;
    };
  }, [grow.id, telemetryRefreshToken]);

  // Aggregate all events from grow, plants, structured events and telemetry
  const allEvents = useMemo(() => {
    return aggregateProductTimeline(grow, plants, structuredEvents, telemetryReadings, photos);
  }, [grow, plants, structuredEvents, telemetryReadings, photos]);

  // Get event counts for filter badges
  const eventCounts = useMemo(() => {
    return getEventStats(allEvents);
  }, [allEvents]);
  const structuredEventCounts = useMemo(() => {
    return allEvents.reduce<Partial<Record<GrowEventType, number>>>((counts, event) => {
      if (!event.structuredEventType) return counts;
      counts[event.structuredEventType] = (counts[event.structuredEventType] ?? 0) + 1;
      return counts;
    }, {});
  }, [allEvents]);
  const availableStructuredEventTypes = useMemo(() => (
    Object.keys(structuredEventCounts).sort() as GrowEventType[]
  ), [structuredEventCounts]);
  const sensorLanes = useMemo(() => buildSensorTimelineLanes(telemetryReadings), [telemetryReadings]);
  const selectedEventAnalysis = useMemo(() => (
    selectedEvent
      ? buildTimelineBeforeAfterAnalysis(telemetryReadings, selectedEvent, undefined, analysisWindowHours)
      : []
  ), [analysisWindowHours, selectedEvent, telemetryReadings]);

  const plantOptions = useMemo(() => [
    { id: '', label: 'All plants' },
    ...plants.map(plant => ({ id: plant.id, label: plant.name, description: plant.genetic })),
  ], [plants]);
  const phenotypeOptions = useMemo(() => [
    { id: '', label: 'All phenotypes' },
    ...phenotypes.map(phenotype => ({
      id: phenotype.id,
      label: phenotype.label,
      description: plants.find(plant => plant.id === phenotype.plantId)?.name ?? phenotype.geneticsId,
    })),
  ], [phenotypes, plants]);

  const applyDatePreset = (days: number | 'all') => {
    if (days === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const toggleStructuredEventType = (type: GrowEventType) => {
    setActiveStructuredEventTypes(current => (
      current.includes(type)
        ? current.filter(item => item !== type)
        : [...current, type]
    ));
  };

  // Apply filters
  const filteredEvents = useMemo(() => {
    return filterEventsByDateRange(
      filterEventsByPhenotype(
        filterEventsByPlant(
          filterEventsByStructuredType(
            filterEventsByType(allEvents, activeFilters),
            activeStructuredEventTypes,
          ),
          selectedPlantId,
        ),
        selectedPhenotypeId,
      ),
      startDate,
      endDate,
    );
  }, [allEvents, activeFilters, activeStructuredEventTypes, selectedPlantId, selectedPhenotypeId, startDate, endDate]);

  // Calculate summary stats
  const totalDays = useMemo(() => {
    return calculateGrowTotalDays(grow);
  }, [grow]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-2">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">Grow Diary</CardTitle>
              <p className="text-sm text-muted-foreground">
                {allEvents.length} events and readings over {totalDays} days
              </p>
            </div>
          </div>
          <DiaryPdfExport grow={grow} events={filteredEvents} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(eventCounts).map(([type, count]) => (
            <div 
              key={type} 
              className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-3 text-center"
            >
              <div className="text-2xl font-bold text-foreground">{count}</div>
              <div className="text-xs text-muted-foreground capitalize">{type}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <DiaryFilters
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
          eventCounts={eventCounts}
        />
        {availableStructuredEventTypes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-[1rem] border border-white/10 bg-white/[0.045] p-3">
            <span className="mr-1 text-sm text-muted-foreground">Eventtypen:</span>
            {availableStructuredEventTypes.map(type => {
              const isActive = activeStructuredEventTypes.includes(type);

              return (
                <Button
                  key={type}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleStructuredEventType(type)}
                  className={`rounded-full text-xs ${
                    isActive
                      ? 'border-primary bg-primary/10 text-primary hover:bg-primary/15'
                      : 'border-white/10 bg-white/[0.045] text-muted-foreground hover:border-primary/45 hover:text-foreground'
                  }`}
                >
                  {formatStructuredEventType(type)}
                  <span className="ml-1 rounded-full bg-background/70 px-1.5 text-[10px] text-foreground">
                    {structuredEventCounts[type] ?? 0}
                  </span>
                </Button>
              );
            })}
            {activeStructuredEventTypes.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveStructuredEventTypes([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Alle Eventtypen
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 rounded-[1rem] border border-white/10 bg-white/[0.045] p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <CustomDropdown
            options={plantOptions}
            value={selectedPlantId}
            onChange={(value) => {
              setSelectedPlantId(value);
              setSelectedPhenotypeId('');
            }}
            placeholder="Plant"
            width="w-full"
            buttonClassName="mt-1"
          />
          <CustomDropdown
            options={phenotypeOptions}
            value={selectedPhenotypeId}
            onChange={setSelectedPhenotypeId}
            placeholder="Phenotype"
            width="w-full"
            buttonClassName="mt-1"
          />
          <Input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="mt-1"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="mt-1"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.045] text-foreground" onClick={() => applyDatePreset(7)}>7d</Button>
            <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.045] text-foreground" onClick={() => applyDatePreset(30)}>30d</Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => applyDatePreset('all')}>All</Button>
          </div>
        </div>

        {/* Timeline */}
        <div className="border-t border-white/10 pt-6">
          {allEvents.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No diary entries yet
              </h3>
              <p className="text-muted-foreground text-sm">
                Start adding waterings, training, and other activities to see them here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-[1rem] border border-white/10 bg-white/[0.045] p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <LineChart className="h-4 w-4 text-accent" />
                  <span>Sensorlinien</span>
                </div>
                <div className="flex rounded-full border border-white/10 bg-white/[0.045] p-1">
                  {(['compact', 'comfortable', 'detailed'] as const).map(level => (
                    <Button
                      key={level}
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setTimelineZoom(level)}
                      className={`h-8 rounded-full px-3 text-xs ${timelineZoom === level ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {level === 'compact' ? 'Kompakt' : level === 'comfortable' ? 'Normal' : 'Detail'}
                    </Button>
                  ))}
                </div>
              </div>

              {sensorLanes.length > 0 && (
                <div className="space-y-3 rounded-[1rem] border border-white/10 bg-white/[0.045] p-4">
                  {sensorLanes.map(lane => (
                    <div key={lane.metric} className="grid grid-cols-1 gap-2 md:grid-cols-[140px_1fr_110px] md:items-center">
                      <div>
                        <div className="text-xs font-medium text-foreground">{lane.label}</div>
                        <div className="text-[11px] text-muted-foreground">{lane.min}{lane.unit} - {lane.max}{lane.unit}</div>
                      </div>
                      <div className="flex h-9 items-end gap-1 rounded-[0.95rem] border border-white/10 bg-white/[0.035] px-2 py-1">
                        {lane.points.map(point => (
                          <button
                            key={point.id}
                            type="button"
                            title={`${point.label}: ${point.value}${point.unit}`}
                            className="w-full min-w-1 rounded-t bg-accent/70 hover:bg-accent"
                            style={{ height: `${Math.max(12, point.positionPercent)}%` }}
                          />
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {lane.points[lane.points.length - 1]?.value} {lane.unit}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <ScrollArea className="h-[600px] pr-4">
                <DiaryTimeline events={filteredEvents} zoomLevel={timelineZoom} onEventSelect={setSelectedEvent} />
              </ScrollArea>
            </div>
          )}
        </div>
      </CardContent>
      <Dialog open={Boolean(selectedEvent)} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {formatDiaryDate(selectedEvent.date)} {formatDiaryTime(selectedEvent.date)} • {getEventTypeLabel(selectedEvent.type)}
              </div>
              {selectedEvent.plantName && (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                  {selectedEvent.plantName}
                </div>
              )}
              <p className="text-sm text-foreground">{selectedEvent.description}</p>
              {selectedEvent.mediaUris && selectedEvent.mediaUris.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  {selectedEvent.mediaUris.map(uri => (
                    // eslint-disable-next-line @next/next/no-img-element -- Diary media can be data URLs or user-provided local references.
                    <img
                      key={uri}
                      src={uri}
                      alt={selectedEvent.title}
                      className="max-h-80 w-full rounded-2xl border border-white/10 object-cover"
                    />
                  ))}
                </div>
              )}
              {selectedEvent.details && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {Object.entries(selectedEvent.details).map(([key, value]) => {
                    if (value === undefined || value === '') return null;
                    return (
                      <div key={key} className="rounded-[0.95rem] border border-white/10 bg-white/[0.045] p-3">
                        <div className="text-xs text-muted-foreground">{key}</div>
                        <div className="mt-1 text-sm text-foreground">{value}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              {selectedEvent.type !== 'telemetry' && (
                <div className="space-y-3 rounded-[1rem] border border-white/10 bg-white/[0.045] p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">Vorher/Nachher-Analyse</div>
                      <div className="text-xs text-muted-foreground">Messwerte im Zeitraum um dieses Event.</div>
                    </div>
                    <div className="flex rounded-full border border-white/10 bg-white/[0.045] p-1">
                      {[
                        { label: '24h', value: 24 },
                        { label: '72h', value: 72 },
                        { label: '7d', value: 168 },
                      ].map(option => (
                        <Button
                          key={option.value}
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setAnalysisWindowHours(option.value)}
                          className={`h-8 rounded-full px-3 text-xs ${analysisWindowHours === option.value ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {selectedEventAnalysis.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {selectedEventAnalysis.slice(0, 6).map(metric => {
                        const sign = metric.delta !== undefined && metric.delta > 0 ? '+' : '';
                        return (
                          <div key={metric.metric} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-foreground">{metric.label}</span>
                              <span className={`text-xs ${
                                metric.direction === 'up' ? 'text-accent' :
                                  metric.direction === 'down' ? 'text-primary' :
                                    metric.direction === 'flat' ? 'text-muted-foreground' : 'text-muted-foreground'
                              }`}>
                                {metric.delta !== undefined ? `${sign}${metric.delta}${metric.unit}` : 'Offen'}
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-2xl bg-white/[0.045] px-2 py-1 text-muted-foreground">
                                Vorher <span className="text-foreground">{metric.beforeAverage ?? '-'}{metric.beforeAverage !== undefined ? metric.unit : ''}</span>
                              </div>
                              <div className="rounded-2xl bg-white/[0.045] px-2 py-1 text-muted-foreground">
                                Nachher <span className="text-foreground">{metric.afterAverage ?? '-'}{metric.afterAverage !== undefined ? metric.unit : ''}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.045] p-3 text-xs text-muted-foreground">
                      Keine passenden Messwerte vor oder nach diesem Event im gewählten Zeitraum.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

GrowDiary.displayName = 'GrowDiary';

function formatStructuredEventType(type: GrowEventType): string {
  const labels: Record<GrowEventType, string> = {
    watering: 'Gießen',
    feeding: 'Düngen',
    prepared_batch: 'Nährlösung',
    training: 'Training',
    topping: 'Toppen',
    lst: 'LST',
    hst: 'HST',
    defoliation: 'Defoliation',
    lollipopping: 'Lollipopping',
    scrog: 'ScrOG',
    transplant: 'Umtopfen',
    flowering_start: 'Blüte',
    harvest: 'Ernte',
    photo: 'Foto',
    note: 'Notiz',
    diagnosis: 'Diagnose',
    problem: 'Problem',
    treatment: 'Behandlung',
    measurement: 'Messung',
    substrate_change: 'Substrat',
    light_adjustment: 'Licht',
  };

  return labels[type];
}

export default GrowDiary;
