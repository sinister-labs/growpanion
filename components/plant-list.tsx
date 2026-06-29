"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PlantModal } from "@/components/plant-modal"
import { Plant, TabType } from "@/components/plant-modal/types"
import { usePlants } from "@/hooks/usePlants"
import { Button } from "@/components/ui/button"
import { Droplets, FileText, Plus, Sprout, Scale, CheckCircle2, Dna, Scissors } from "lucide-react"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getLastActivity } from "@/lib/plant-utils"
import { HarvestDialog } from "@/components/harvest-dialog"
import { CustomDropdown, type DropdownOption } from "@/components/ui/custom-dropdown"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getAllGenetics,
  getAllGeneticsOverrides,
  populateDBWithDemoDataIfEmpty,
  savePhenotype,
  type Genetics,
} from "@/lib/db"
import {
  applyGeneticsOverrides,
  createPhenotypeForPlant,
  createPlantNameForGenetics,
  mergeDefaultGenetics,
} from "@/lib/genetics-registry"

/**
 * Component for displaying and managing plants within a grow
 */
interface PlantListProps {
  growId: string | null;
  plants?: Plant[];
  isLoading?: boolean;
  onManageFertilizerMixes?: () => void;
}

export function PlantList({ growId, plants: providedPlants, isLoading: providedIsLoading, onManageFertilizerMixes }: PlantListProps) {
  const { plants: fetchedPlants, isLoading: fetchIsLoading, error, updatePlant, addPlant, removePlant } = usePlants(growId);
  const { toast } = useToast();
  const [harvestPlant, setHarvestPlant] = useState<Plant | null>(null);
  const [isAddingPlant, setIsAddingPlant] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [openPlantId, setOpenPlantId] = useState<string | null>(null);
  const [plantStartTab, setPlantStartTab] = useState<TabType>('info');
  const [genetics, setGenetics] = useState<Genetics[]>([]);
  const [selectedGeneticsId, setSelectedGeneticsId] = useState('');
  const [newPlantName, setNewPlantName] = useState('');
  const [addPlantSubmitted, setAddPlantSubmitted] = useState(false);
  const plantNameInputRef = useRef<HTMLInputElement>(null);

  const plants = providedPlants || fetchedPlants;
  const isLoading = providedIsLoading !== undefined ? providedIsLoading : fetchIsLoading;
  const selectedGenetics = genetics.find(entry => entry.id === selectedGeneticsId) ?? genetics[0];
  const geneticsOptions: DropdownOption[] = useMemo(() => genetics.map(entry => ({
    id: entry.id,
    label: entry.name,
    description: entry.breeder || 'Unknown breeder',
  })), [genetics]);

  useEffect(() => {
    let cancelled = false;

    async function loadGenetics() {
      try {
        await populateDBWithDemoDataIfEmpty();
        const [storedGenetics, storedOverrides] = await Promise.all([
          getAllGenetics(),
          getAllGeneticsOverrides(),
        ]);
        const data = applyGeneticsOverrides(mergeDefaultGenetics(storedGenetics), storedOverrides);
        if (!cancelled) {
          setGenetics(data);
          setSelectedGeneticsId(current => current || data[0]?.id || '');
        }
      } catch (error) {
        if (!cancelled) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load genetics: " + (error instanceof Error ? error.message : "Unknown error"),
          });
        }
      }
    }

    void loadGenetics();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (!selectedGenetics || newPlantName.trim()) return;
    setNewPlantName(createPlantNameForGenetics(selectedGenetics, plants.length + 1));
  }, [newPlantName, plants.length, selectedGenetics]);

  const resetAddPlantForm = () => {
    setAddPlantSubmitted(false);
    setNewPlantName(selectedGenetics ? createPlantNameForGenetics(selectedGenetics, plants.length + 1) : '');
  };

  const handleAddNewPlant = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setAddPlantSubmitted(true);

    if (!growId || isAddingPlant || !selectedGenetics) return;

    if (!newPlantName.trim()) {
      window.setTimeout(() => plantNameInputRef.current?.focus(), 0);
      return;
    }

    const newPlant: Omit<Plant, 'id'> = {
      name: newPlantName.trim(),
      genetic: selectedGenetics.name,
      geneticsId: selectedGenetics.id,
      label: 'Phenotype A',
      lifecycleStatus: 'active',
      currentPhase: 'Seedling',
      manufacturer: selectedGenetics.breeder || "Unknown breeder",
      type: selectedGenetics.type === "Sativa" || selectedGenetics.type === "Hybrid" ? "feminized" : "regular",
      propagationMethod: "seed",
    };

    setIsAddingPlant(true);
    try {
      const plant = await addPlant(newPlant);
      const phenotype = createPhenotypeForPlant({
        growId,
        plantId: plant.id,
        geneticsId: selectedGenetics.id,
        label: `${plant.name} phenotype`,
      });
      await savePhenotype(phenotype);
      await updatePlant({ ...plant, phenotypeId: phenotype.id });

      setIsAddDialogOpen(false);
      setAddPlantSubmitted(false);
      setNewPlantName('');
      toast({
        variant: "success",
        title: "Plant added",
        description: `The plant "${plant.name}" has been successfully added.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add plant: " + (error instanceof Error ? error.message : "Unknown error"),
      });
    } finally {
      setIsAddingPlant(false);
    }
  };

  const handleUpdatePlant = async (plant: Plant): Promise<boolean> => {
    try {
      await updatePlant(plant);
      toast({
        variant: "success",
        title: "Plant updated",
        description: `The plant "${plant.name}" has been successfully updated.`,
      });
      return true;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update plant: " + (error instanceof Error ? error.message : "Unknown error"),
      });
      return false;
    }
  };

  const handleDeletePlant = async (plantId: string, plantName: string) => {
    try {
      await removePlant(plantId);
      toast({
        variant: "success",
        title: "Plant deleted",
        description: `The plant "${plantName}" has been successfully deleted.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete plant: " + (error instanceof Error ? error.message : "Unknown error"),
      });
    }
  };

  const openPlantAction = (plantId: string, tab: TabType) => {
    setPlantStartTab(tab);
    setOpenPlantId(plantId);
  };

  if (!growId) {
    return (
      <div className="infotainment-surface p-8 text-center">
        <p className="mb-4 text-muted-foreground">
          Please select a grow to manage plants.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-destructive/35 bg-destructive/10 p-4 text-destructive">
        Error loading plants: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Plants</h2>
          <p className="text-sm text-muted-foreground">{plants.length} in this grow</p>
        </div>
        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetAddPlantForm();
          }}
        >
          <DialogTrigger asChild>
            <Button
              disabled={isAddingPlant}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Plant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl overflow-hidden p-0">
            <DialogHeader>
              <div className="border-b border-white/10 bg-white/[0.035] px-6 py-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-[0.95rem] border border-emerald-300/[0.20] bg-emerald-300/10 p-3 text-emerald-200">
                    <Dna className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle>Add Plant</DialogTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pick genetics and create the next plant workspace.
                    </p>
                  </div>
                </div>
              </div>
            </DialogHeader>
            <form className="space-y-5 p-6" onSubmit={handleAddNewPlant}>
              <div className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-4">
                <div className="grid gap-2">
                  <Label>Genetics</Label>
                  <CustomDropdown
                    options={geneticsOptions}
                    value={selectedGenetics?.id || ''}
                    onChange={(value) => {
                      const next = genetics.find(entry => entry.id === value);
                      setSelectedGeneticsId(value);
                      if (next) setNewPlantName(createPlantNameForGenetics(next, plants.length + 1));
                    }}
                    placeholder={geneticsOptions.length === 0 ? "Loading genetics…" : "Select genetics"}
                    width="w-full"
                    disabled={geneticsOptions.length === 0 || isAddingPlant}
                    buttonClassName="mt-1"
                  />
                  {addPlantSubmitted && !selectedGenetics && (
                    <p className="text-sm text-destructive" aria-live="polite">
                      Choose genetics before creating a plant.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-4">
                <div className="grid gap-2">
                  <Label htmlFor="newPlantName">Plant name</Label>
                  <Input
                    ref={plantNameInputRef}
                    id="newPlantName"
                    name="newPlantName"
                    autoComplete="off"
                    value={newPlantName}
                    onChange={(event) => setNewPlantName(event.target.value)}
                    placeholder="e.g. Blue Dream #1…"
                    aria-invalid={addPlantSubmitted && !newPlantName.trim()}
                    aria-describedby="new-plant-name-error"
                    disabled={isAddingPlant}
                  />
                  {addPlantSubmitted && !newPlantName.trim() && (
                    <p id="new-plant-name-error" className="text-sm text-destructive" aria-live="polite">
                      Add a plant name before creating it.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetAddPlantForm();
                    setIsAddDialogOpen(false);
                  }}
                  disabled={isAddingPlant}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={isAddingPlant || !selectedGenetics}
                >
                  {isAddingPlant ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Plant
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {plants.length === 0 ? (
        <div className="infotainment-surface p-5 text-center">
          <Sprout className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
          <h3 className="mb-1 text-lg font-semibold text-foreground">No plants added</h3>
          <p className="mb-3 text-sm text-muted-foreground">You have no plants in this grow yet.</p>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            disabled={isAddingPlant}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add First Plant
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plants.map((plant) => (
            <Dialog
              key={plant.id}
              open={openPlantId === plant.id}
              onOpenChange={(open) => {
                setOpenPlantId(open ? plant.id : null);
                if (!open) setPlantStartTab('info');
              }}
            >
                <Card
                  role="button"
                  tabIndex={0}
                  className={`cursor-pointer text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  plant.isHarvested ? 'border-primary/55 bg-primary/10' : ''
                }`}
                  onClick={() => openPlantAction(plant.id, 'info')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openPlantAction(plant.id, 'info');
                    }
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base font-semibold text-foreground sm:text-lg">
                        {plant.name}
                      </CardTitle>
                      {plant.isHarvested && (
                        <div className="flex items-center gap-1 rounded-full bg-primary/[0.12] px-2 py-1 text-xs font-semibold text-primary">
                          <CheckCircle2 className="h-3 w-3" />
                          Harvested
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-foreground sm:text-base">{plant.genetic}</p>
                    {plant.isHarvested && plant.harvest?.yieldDryGrams ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Scale className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-primary">
                          {plant.harvest.yieldDryGrams}g
                        </span>
                        <span className="text-muted-foreground">dry</span>
                      </div>
                    ) : (
                      <p className={`text-xs sm:text-sm ${plant.isHarvested ? 'text-primary' : 'text-muted-foreground'}`}>
                        {getLastActivity(plant)}
                      </p>
                    )}
                    {!plant.isHarvested && (
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 rounded-[0.85rem] border-white/10 bg-white/[0.045] px-2 text-xs text-slate-100 hover:border-emerald-300/[0.22] hover:bg-emerald-300/10"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            openPlantAction(plant.id, 'water');
                          }}
                        >
                          <Droplets className="mr-1 h-3.5 w-3.5 text-primary" />
                          Water
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 rounded-[0.85rem] border-white/10 bg-white/[0.045] px-2 text-xs text-slate-100 hover:border-emerald-300/[0.22] hover:bg-emerald-300/10"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            openPlantAction(plant.id, 'lst');
                          }}
                        >
                          <Scissors className="mr-1 h-3.5 w-3.5 text-primary" />
                          Train
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 rounded-[0.85rem] border-white/10 bg-white/[0.045] px-2 text-xs text-slate-100 hover:border-emerald-300/[0.22] hover:bg-emerald-300/10"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            openPlantAction(plant.id, 'notes');
                          }}
                        >
                          <FileText className="mr-1 h-3.5 w-3.5 text-primary" />
                          Note
                        </Button>
                      </div>
                    )}
                    {!plant.isHarvested && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full border-primary/40 text-primary hover:bg-primary/10"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setHarvestPlant(plant);
                        }}
                      >
                        <Scale className="mr-2 h-4 w-4" />
                        Record Harvest
                      </Button>
                    )}
                  </CardContent>
                </Card>
              <PlantModal
                plant={plant}
                updatePlant={handleUpdatePlant}
                deletePlant={handleDeletePlant}
                growId={growId}
                onManageFertilizerMixes={onManageFertilizerMixes}
                initialTab={plantStartTab}
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
          onSave={async (updatedPlant) => {
            const saved = await handleUpdatePlant(updatedPlant);
            if (saved) {
              setHarvestPlant(null);
            }
            return saved;
          }}
        />
      )}
    </div>
  );
}
