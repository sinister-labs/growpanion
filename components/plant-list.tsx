"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { PlantModal } from "@/components/plant-modal"
import { Plant } from "@/components/plant-modal/types"
import { usePlants } from "@/hooks/usePlants"
import { Button } from "@/components/ui/button"
import { Plus, Sprout } from "lucide-react"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getLastActivity } from "@/lib/plant-utils"

/**
 * Component for displaying and managing plants within a grow
 */
interface PlantListProps {
  growId: string | null;
  plants?: Plant[];
  isLoading?: boolean;
}

export function PlantList({ growId, plants: providedPlants, isLoading: providedIsLoading }: PlantListProps) {
  const { plants: fetchedPlants, isLoading: fetchIsLoading, error, updatePlant, addPlant, removePlant } = usePlants(growId);
  const { toast } = useToast();
  
  // Use provided plants and loading state if available, otherwise use fetched data
  const plants = providedPlants || fetchedPlants;
  const isLoading = providedIsLoading !== undefined ? providedIsLoading : fetchIsLoading;

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

