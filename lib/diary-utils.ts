/**
 * Diary utilities for aggregating grow events into a timeline
 */

import { Grow, PlantDB } from '@/lib/db';

export type DiaryEventType = 'phase' | 'watering' | 'hst' | 'lst' | 'substrate';

export interface DiaryEvent {
  id: string;
  type: DiaryEventType;
  date: string;
  title: string;
  description: string;
  plantName?: string;
  plantId?: string;
  details?: Record<string, string | number | undefined>;
  icon?: string;
}

/**
 * Aggregates all events from a grow and its plants into a chronological timeline
 */
export function aggregateGrowEvents(grow: Grow, plants: PlantDB[]): DiaryEvent[] {
  const events: DiaryEvent[] = [];

  // Add phase change events from grow
  grow.phaseHistory.forEach((phase, index) => {
    events.push({
      id: `phase-${index}`,
      type: 'phase',
      date: phase.startDate,
      title: `Phase: ${phase.phase}`,
      description: index === 0 
        ? `Grow "${grow.name}" started in ${phase.phase} phase`
        : `Transitioned to ${phase.phase} phase`,
      icon: getPhaseIcon(phase.phase),
    });
  });

  // Add events from each plant
  plants.forEach((plant) => {
    // Watering events
    plant.waterings?.forEach((watering, index) => {
      events.push({
        id: `watering-${plant.id}-${index}`,
        type: 'watering',
        date: watering.date,
        title: 'Watering',
        description: `${watering.amount}ml${watering.mixId ? ' with fertilizer mix' : ''}`,
        plantName: plant.name,
        plantId: plant.id,
        details: {
          amount: watering.amount,
          mixId: watering.mixId,
        },
        icon: '💧',
      });
    });

    // HST events
    plant.hstRecords?.forEach((hst, index) => {
      events.push({
        id: `hst-${plant.id}-${index}`,
        type: 'hst',
        date: hst.date,
        title: `HST: ${hst.method}`,
        description: hst.notes || `Performed ${hst.method}`,
        plantName: plant.name,
        plantId: plant.id,
        details: {
          method: hst.method,
          notes: hst.notes,
        },
        icon: '✂️',
      });
    });

    // LST events
    plant.lstRecords?.forEach((lst, index) => {
      events.push({
        id: `lst-${plant.id}-${index}`,
        type: 'lst',
        date: lst.date,
        title: `LST: ${lst.method}`,
        description: lst.notes || `Applied ${lst.method}`,
        plantName: plant.name,
        plantId: plant.id,
        details: {
          method: lst.method,
          notes: lst.notes,
        },
        icon: '🌱',
      });
    });

    // Substrate events
    plant.substrateRecords?.forEach((substrate, index) => {
      events.push({
        id: `substrate-${plant.id}-${index}`,
        type: 'substrate',
        date: substrate.date,
        title: substrate.action === 'repotting' ? 'Repotting' : 'Initial Potting',
        description: `${substrate.substrateType} in ${substrate.potSize} pot`,
        plantName: plant.name,
        plantId: plant.id,
        details: {
          action: substrate.action,
          substrateType: substrate.substrateType,
          potSize: substrate.potSize,
          notes: substrate.notes,
        },
        icon: '🪴',
      });
    });
  });

  // Sort events by date (newest first)
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Filters events by type
 */
export function filterEventsByType(events: DiaryEvent[], types: DiaryEventType[]): DiaryEvent[] {
  if (types.length === 0) return events;
  return events.filter(event => types.includes(event.type));
}

/**
 * Filters events by date range
 */
export function filterEventsByDateRange(events: DiaryEvent[], startDate?: string, endDate?: string): DiaryEvent[] {
  return events.filter(event => {
    const eventDate = new Date(event.date).getTime();
    if (startDate && eventDate < new Date(startDate).getTime()) return false;
    if (endDate && eventDate > new Date(endDate).getTime()) return false;
    return true;
  });
}

/**
 * Groups events by date
 */
export function groupEventsByDate(events: DiaryEvent[]): Map<string, DiaryEvent[]> {
  const grouped = new Map<string, DiaryEvent[]>();
  
  events.forEach(event => {
    const dateKey = new Date(event.date).toISOString().split('T')[0];
    const existing = grouped.get(dateKey) || [];
    grouped.set(dateKey, [...existing, event]);
  });

  return grouped;
}

/**
 * Gets event statistics for a grow
 */
export function getEventStats(events: DiaryEvent[]): Record<DiaryEventType, number> {
  const stats: Record<DiaryEventType, number> = {
    phase: 0,
    watering: 0,
    hst: 0,
    lst: 0,
    substrate: 0,
  };

  events.forEach(event => {
    stats[event.type]++;
  });

  return stats;
}

/**
 * Returns an appropriate icon for a phase
 */
function getPhaseIcon(phase: string): string {
  switch (phase) {
    case 'Seedling': return '🌱';
    case 'Vegetative': return '🌿';
    case 'Flowering': return '🌸';
    case 'Flushing': return '💦';
    case 'Drying': return '🍂';
    case 'Curing': return '📦';
    case 'Done': return '✅';
    default: return '🌱';
  }
}

/**
 * Formats event for export
 */
export function formatEventForExport(event: DiaryEvent): string {
  const date = new Date(event.date).toLocaleDateString();
  const plant = event.plantName ? ` [${event.plantName}]` : '';
  return `${date}${plant}: ${event.title} - ${event.description}`;
}

/**
 * Gets a color class for event type
 */
export function getEventTypeColor(type: DiaryEventType): string {
  switch (type) {
    case 'phase': return 'bg-purple-600/20 text-purple-400 border-purple-500';
    case 'watering': return 'bg-blue-600/20 text-blue-400 border-blue-500';
    case 'hst': return 'bg-red-600/20 text-red-400 border-red-500';
    case 'lst': return 'bg-green-600/20 text-green-400 border-green-500';
    case 'substrate': return 'bg-amber-600/20 text-amber-400 border-amber-500';
    default: return 'bg-gray-600/20 text-gray-400 border-gray-500';
  }
}

/**
 * Gets a label for event type
 */
export function getEventTypeLabel(type: DiaryEventType): string {
  switch (type) {
    case 'phase': return 'Phase Change';
    case 'watering': return 'Watering';
    case 'hst': return 'HST Training';
    case 'lst': return 'LST Training';
    case 'substrate': return 'Substrate';
    default: return 'Unknown';
  }
}
