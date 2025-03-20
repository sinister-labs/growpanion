/**
 * Utility functions for plant management
 */
import { Plant } from "@/components/plant-modal/types";

/**
 * Get type of the most recent activity for a plant
 * @param plant Plant object
 * @returns Activity information including type, date, and details
 */
interface PlantActivity {
  type: string;
  date: Date;
  details?: string;
}

/**
 * Get all activities for a plant sorted by date (most recent first)
 * @param plant Plant object
 * @returns Array of plant activities
 */
export function getPlantActivities(plant: Plant): PlantActivity[] {
  const activities: PlantActivity[] = [
    ...(plant.waterings || []).map((w) => ({
      type: "Watered",
      date: new Date(w.date),
      details: `${w.amount} ml`
    })),
    ...(plant.hstRecords || []).map((t) => ({
      type: "HST",
      date: new Date(t.date),
      details: t.method
    })),
    ...(plant.lstRecords || []).map((t) => ({
      type: "LST",
      date: new Date(t.date),
      details: t.method
    })),
    ...(plant.substrateRecords || []).map((s) => ({
      type: "Substrate",
      date: new Date(s.date),
      details: `${s.substrateType} (${s.potSize}L)`
    })),
  ];

  return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * Gets a formatted string describing the most recent activity
 * @param plant Plant object
 * @returns Formatted string with last activity info
 */
export function getLastActivity(plant: Plant): string {
  const activities = getPlantActivities(plant);

  if (activities.length === 0) {
    return "No activities";
  }

  const lastActivity = activities[0];

  const daysAgo = Math.floor(
    (new Date().getTime() - lastActivity.date.getTime()) / (1000 * 60 * 60 * 24)
  );

  return `${lastActivity.type} ${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago${lastActivity.details ? ` (${lastActivity.details})` : ""
    }`;
} 