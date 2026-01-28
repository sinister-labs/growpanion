"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { PlantModal } from "@/components/plant-modal"
import { Plant } from "@/components/plant-modal/types"
import { usePlants } from "@/hooks/usePlants"
import { Button } from "@/components/ui/button"
import { Plus, Sprout, Scale, CheckCircle2 } from "lucide-react"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getLastActivity } from "@/lib/plant-utils"
import { HarvestDialog } from "@/components/harvest-dialog"

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
  const [harvestPlant, setHarvestPlant] = useState<Plant | null>(null);

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
        <div className="text-white border-2 border-gray-700 p-8 rounded-2xl text-center">
          <Sprout className="h-12 w-12 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-semibold mb-2 text-white">No Plants added</h3>
          <p className="text-gray-400 mb-4">You have no plants in this grow yet.</p>
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
                <Card className={`bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-lg border-gray-700 hover:border-green-400 transition-all duration-300 transform hover:scale-105 cursor-pointer text-left ${
                  plant.isHarvested ? 'border-green-600/50' : ''
                }`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base sm:text-lg font-medium text-green-400">
                        {plant.name}
                      </CardTitle>
                      {plant.isHarvested && (
                        <div className="flex items-center gap-1 text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full">
                          <CheckCircle2 className="h-3 w-3" />
                          Harvested
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm sm:text-base text-white">{plant.genetic}</p>
                    {plant.isHarvested && plant.harvest?.yieldDryGrams ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Scale className="h-4 w-4 text-green-400" />
                        <span className="text-green-400 font-medium">
                          {plant.harvest.yieldDryGrams}g
                        </span>
                        <span className="text-gray-500">dry</span>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-gray-400">{getLastActivity(plant)}</p>
                    )}
                    {!plant.isHarvested && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 border-green-600/50 text-green-400 hover:bg-green-600/20 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHarvestPlant(plant);
                        }}
                      >
                        <Scale className="h-4 w-4 mr-2" />
                        Record Harvest
                      </Button>
                    )}
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

      {/* Harvest Dialog */}
      {harvestPlant && (
        <HarvestDialog
          open={!!harvestPlant}
          onOpenChange={(open) => !open && setHarvestPlant(null)}
          plant={harvestPlant}
          onSave={(updatedPlant) => {
            handleUpdatePlant(updatedPlant);
            setHarvestPlant(null);
          }}
        />
      )}
    </div>
  );
}

