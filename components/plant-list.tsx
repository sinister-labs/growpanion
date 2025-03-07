"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { PlantModal } from "@/components/plant-modal"
import { Plant } from "@/components/plant-modal/types"
import { usePlants } from "@/hooks/usePlants"
import { Button } from "@/components/ui/button"
import { Plus, Sprout } from "lucide-react"
import { generateId } from "@/lib/db"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

function getLastActivity(plant: Plant) {
  const activities = [
    ...(plant.waterings || []).map((w) => ({ type: "Watered", date: new Date(w.date), details: `${w.amount} ml` })),
    ...(plant.hstRecords || []).map((t) => ({ type: "HST", date: new Date(t.date), details: t.method })),
    ...(plant.lstRecords || []).map((t) => ({ type: "LST", date: new Date(t.date), details: t.method })),
    ...(plant.substrateRecords || []).map((s) => ({
      type: "Substrate",
      date: new Date(s.date),
      details: `${s.substrateType} (${s.potSize}L)`
    })),
  ]

  if (activities.length === 0) return "No activities"

  activities.sort((a, b) => b.date.getTime() - a.date.getTime())
  const lastActivity = activities[0]
  const daysAgo = Math.floor((new Date().getTime() - lastActivity.date.getTime()) / (1000 * 60 * 60 * 24))

  return `${lastActivity.type} ${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago${lastActivity.details ? ` (${lastActivity.details})` : ""}`
}

interface PlantListProps {
  growId: string | null;
}

export function PlantList({ growId }: PlantListProps) {
  const { plants, isLoading, error, updatePlant, addPlant, removePlant } = usePlants(growId);
  const { toast } = useToast();

  const handleAddNewPlant = () => {
    if (!growId) return;

    const newPlant: Omit<Plant, 'id'> = {
      name: "New Plant",
      genetic: "",
      manufacturer: "",
      type: "regular",
      propagationMethod: "seed"
    };

    addPlant(newPlant)
      .then((plant) => {
        toast({
          variant: "success",
          title: "Plant added",
          description: `The plant "${plant.name}" has been successfully added.`,
        });
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to add plant: " + error.message,
        });
      });
  };

  const handleUpdatePlant = (plant: Plant) => {
    updatePlant(plant)
      .then(() => {
        toast({
          variant: "success",
          title: "Plant updated",
          description: `The plant "${plant.name}" has been successfully updated.`,
        });
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update plant: " + error.message,
        });
      });
  };

  const handleDeletePlant = (plantId: string, plantName: string) => {
    removePlant(plantId)
      .then(() => {
        toast({
          variant: "success",
          title: "Plant deleted",
          description: `The plant "${plantName}" has been successfully deleted.`,
        });
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete plant: " + error.message,
        });
      });
  };

  if (!growId) {
    return (
      <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-400 mb-4">
          Please select a grow to manage plants.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 bg-red-100 rounded-md">
        Error loading plants: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-white">My Plants</h2>
        <Button
          onClick={handleAddNewPlant}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="mr-2 h-4 w-4" /> New Plant
        </Button>
      </div>

      {plants.length === 0 ? (
        <div className="text-white bg-gray-800 p-8 rounded-lg text-center">
          <Sprout className="h-12 w-12 mx-auto mb-4 text-gray-600" />
          <p className="mb-4">No plants in this grow yet.</p>
          <Button
            onClick={handleAddNewPlant}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="mr-2 h-4 w-4" /> Add First Plant
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plants.map((plant) => (
            <Dialog key={plant.id}>
              <DialogTrigger asChild>
                <Card className="bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-lg border-gray-700 hover:border-green-400 transition-all duration-300 transform hover:scale-105 cursor-pointer text-left">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg font-medium text-green-400">{plant.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm sm:text-base text-white mb-2">{plant.genetic}</p>
                    <p className="text-xs sm:text-sm text-gray-400">{getLastActivity(plant)}</p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <PlantModal
                plant={plant}
                updatePlant={handleUpdatePlant}
                deletePlant={handleDeletePlant}
                growId={growId}
              />
            </Dialog>
          ))}
        </div>
      )}
    </div>
  )
}

