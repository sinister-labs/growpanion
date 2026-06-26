import type { FertilizerMixDB, PlantDB, Reminder } from '@/lib/db';

export function removeFertilizerMixReferences(plants: PlantDB[], mixId: string): PlantDB[] {
  if (!mixId) {
    return [];
  }

  return plants.reduce<PlantDB[]>((updatedPlants, plant) => {
    let changed = false;
    const waterings = plant.waterings?.map(watering => {
      if (watering.mixId !== mixId) {
        return watering;
      }

      changed = true;
      return {
        date: watering.date,
        amount: watering.amount,
      };
    });

    if (!changed) {
      return updatedPlants;
    }

    updatedPlants.push({
      ...plant,
      waterings,
    });

    return updatedPlants;
  }, []);
}

export function isDueAt(dateValue: string | undefined, now: Date = new Date()): boolean {
  if (!dateValue) {
    return false;
  }

  const dueTime = new Date(dateValue).getTime();
  const nowTime = now.getTime();

  return Number.isFinite(dueTime) && Number.isFinite(nowTime) && dueTime <= nowTime;
}

export function getPlantReferenceError(plant: Pick<PlantDB, 'growId'>, growExists: boolean): string | null {
  return growExists ? null : `Plant references missing grow: ${plant.growId}`;
}

export function getFertilizerMixReferenceError(
  mix: Pick<FertilizerMixDB, 'growId'>,
  growExists: boolean,
): string | null {
  return growExists ? null : `Fertilizer mix references missing grow: ${mix.growId}`;
}

export function getReminderReferenceError(
  reminder: Pick<Reminder, 'growId' | 'plantId'>,
  growExists: boolean,
  plant: Pick<PlantDB, 'growId'> | undefined,
): string | null {
  if (!growExists) {
    return `Reminder references missing grow: ${reminder.growId}`;
  }

  const plantId = reminder.plantId?.trim();
  if (!plantId) {
    return null;
  }

  if (!plant) {
    return `Reminder references missing plant: ${plantId}`;
  }

  if (plant.growId !== reminder.growId) {
    return `Reminder plant does not belong to grow: ${plantId}`;
  }

  return null;
}
