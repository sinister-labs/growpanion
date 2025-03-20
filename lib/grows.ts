import { db } from "./db";

/**
 * Fetches all grow IDs from the database
 * Used for static generation in export mode
 */
export async function getAllGrowIds(): Promise<string[]> {
    try {
        const grows = await db.grows.toArray();
        return grows.map(grow => grow.id);
    } catch (error) {
        console.error("Error fetching grow IDs:", error);
        return [];
    }
}